# Static Site Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert the Vector Search webapp from a Flask+React client-server app to a purely static SPA hostable on GitHub Pages, removing the backend entirely and replacing all server-side functionality with browser equivalents.

**Architecture:** All server-side work (OAuth, Google Drive API, embedding with e5-base-v2, SQLite storage, cosine similarity search) moves to the browser. Embeddings and search run in a Web Worker using @xenova/transformers with the ONNX e5-base-v2 model. Documents and embeddings persist in IndexedDB via Dexie.js. Google OAuth uses the client-side GIS (Google Identity Services) library. .docx files are parsed with mammoth.js.

**Tech Stack:** React 19, Vite 7, Tailwind CSS 3, @xenova/transformers (ONNX WASM), Dexie.js (IndexedDB), mammoth.js (.docx parsing), Google Identity Services (OAuth)

**Design doc:** `docs/plans/2026-03-18-static-site-migration-design.md`

---

### Task 1: Delete Backend & Clean Up Project Root

**Files:**
- Delete: `backend/` (entire directory)
- Delete: `backend_setup.sh`
- Delete: `frontend_setup.sh`
- Delete: `.env.example`
- Modify: `.gitignore`
- Modify: `README.md`

**Step 1: Delete backend and setup files**

```bash
rm -rf backend/
rm -f backend_setup.sh frontend_setup.sh .env.example
```

**Step 2: Update .gitignore**

Remove any backend-specific entries. Keep `data/` ignore (IndexedDB is browser-side, but the data folder was for SQLite). Add `dist/` if not already there.

**Step 3: Update README.md**

Replace the entire README with a static-app-focused version:

```markdown
# Vector Search

Search your Google Drive .docx files with semantic vector search. Runs entirely in your browser -- no server required.

## Setup

### 1. Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable Google Drive API
4. Create OAuth 2.0 credentials (Web application)
5. Add your domain (e.g., `https://yourusername.github.io`) to authorized JavaScript origins
6. For local development, also add `http://localhost:3000`
7. Copy the Client ID

### 2. Local Development

```bash
cd frontend
npm install
VITE_GOOGLE_CLIENT_ID="your-client-id" npm run dev
```

### 3. Deploy to GitHub Pages

Set the `VITE_GOOGLE_CLIENT_ID` secret in your GitHub repo settings, then push to trigger the GitHub Actions deploy workflow.

## How It Works

1. Sign in with Google (client-side OAuth)
2. Click "Index My Drive" to scan and embed your .docx files
3. Search your documents with natural language queries

All processing (embedding, search) happens in your browser using a Web Worker with the e5-base-v2 ONNX model. Documents and embeddings are stored in IndexedDB.
```

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove backend, clean up project root for static site"
```

---

### Task 2: Update Dependencies

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install new dependencies and remove old ones**

```bash
cd frontend
npm install @xenova/transformers mammoth dexie
npm uninstall axios react-router-dom
```

This should:
- Add `@xenova/transformers`, `mammoth`, `dexie` to dependencies
- Remove `axios` and `react-router-dom` (unused)

**Step 2: Verify package.json looks correct**

Check that `dependencies` now includes `@xenova/transformers`, `mammoth`, `dexie`, `@heroicons/react`, `react`, `react-dom` and no longer has `axios` or `react-router-dom`.

**Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: update dependencies for static site (add transformers.js, mammoth, dexie; remove axios)"
```

---

### Task 3: Create Storage Service (IndexedDB via Dexie)

**Files:**
- Create: `frontend/src/services/storage.js`

**Step 1: Write the storage service**

```javascript
import Dexie from 'dexie';

const db = new Dexie('vectorSearchDB');

db.version(1).stores({
  userProfile: 'googleId',
  documents: '++id, googleId, driveFileId, [googleId+driveFileId]',
  chunks: '++id, documentId, googleId',
});

export async function saveUser(user) {
  await db.userProfile.put(user);
}

export async function getUser(googleId) {
  return db.userProfile.get(googleId);
}

export async function getDocuments(googleId) {
  return db.documents.where('googleId').equals(googleId).toArray();
}

export async function saveDocument(doc) {
  return db.documents.add(doc);
}

export async function deleteAllDocuments(googleId) {
  const docs = await db.documents.where('googleId').equals(googleId).toArray();
  const docIds = docs.map(d => d.id);
  await db.chunks.where('documentId').anyOf(docIds).delete();
  await db.documents.where('googleId').equals(googleId).delete();
}

export async function saveChunks(chunks) {
  await db.chunks.bulkAdd(chunks);
}

export async function getChunks(googleId) {
  return db.chunks.where('googleId').equals(googleId).toArray();
}

export async function getIndexStatus(googleId) {
  const count = await db.documents.where('googleId').equals(googleId).count();
  if (count === 0) {
    return { indexed: false, documentCount: 0, lastIndexedAt: null };
  }
  const docs = await db.documents.where('googleId').equals(googleId).sortBy('indexedAt');
  const lastIndexedAt = docs[docs.length - 1]?.indexedAt || null;
  return { indexed: true, documentCount: count, lastIndexedAt };
}

export default db;
```

**Step 2: Commit**

```bash
git add frontend/src/services/storage.js
git commit -m "feat: add IndexedDB storage service via Dexie"
```

---

### Task 4: Create Drive Service (Browser-Side)

**Files:**
- Create: `frontend/src/services/drive.js`

**Step 1: Write the Drive service**

```javascript
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const USERINFO_API = 'https://www.googleapis.com/oauth2/v2/userinfo';

async function fetchWithAuth(url, accessToken, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });
  if (!res.ok) {
    const error = new Error(`API request failed: ${res.status}`);
    error.status = res.status;
    throw error;
  }
  return res;
}

export async function getUserInfo(accessToken) {
  const res = await fetchWithAuth(USERINFO_API, accessToken);
  return res.json();
}

export async function listDocxFiles(accessToken, maxResults = 1000) {
  const query = "mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document' and trashed=false";
  const fields = 'files(id,name)';
  const url = `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=${maxResults}`;
  const res = await fetchWithAuth(url, accessToken);
  const data = await res.json();
  return data.files || [];
}

export async function downloadFile(accessToken, fileId) {
  const url = `${DRIVE_API}/files/${fileId}?alt=media`;
  const res = await fetchWithAuth(url, accessToken);
  return res.arrayBuffer();
}
```

**Step 2: Commit**

```bash
git add frontend/src/services/drive.js
git commit -m "feat: add browser-side Google Drive service"
```

---

### Task 5: Create Web Worker for Embeddings & Search

**Files:**
- Create: `frontend/src/workers/embeddings.worker.js`
- Create: `frontend/src/services/embeddings.js`

**Step 1: Write the Web Worker**

```javascript
// frontend/src/workers/embeddings.worker.js
import { pipeline, env } from '@xenova/transformers';

// Disable local model check (always use CDN/cache)
env.allowLocalModels = false;

let extractor = null;

async function loadModel() {
  extractor = await pipeline('feature-extraction', 'Xenova/e5-base-v2', {
    progress_callback: (progress) => {
      if (progress.status === 'progress') {
        self.postMessage({
          type: 'model-progress',
          progress: Math.round(progress.progress),
        });
      }
    },
  });
  self.postMessage({ type: 'model-loaded' });
}

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

self.onmessage = async (e) => {
  const { type } = e.data;

  if (type === 'load-model') {
    try {
      await loadModel();
    } catch (err) {
      self.postMessage({ type: 'error', message: `Failed to load model: ${err.message}` });
    }
    return;
  }

  if (type === 'embed-chunks') {
    const { chunks } = e.data;
    try {
      const embeddings = [];
      for (let i = 0; i < chunks.length; i++) {
        const input = `passage: ${chunks[i]}`;
        const output = await extractor(input, { pooling: 'mean', normalize: true });
        embeddings.push(new Float32Array(output.data));
        self.postMessage({ type: 'chunk-progress', current: i + 1, total: chunks.length });
      }
      self.postMessage({ type: 'chunks-embedded', embeddings });
    } catch (err) {
      self.postMessage({ type: 'error', message: `Embedding failed: ${err.message}` });
    }
    return;
  }

  if (type === 'embed-query') {
    const { query } = e.data;
    try {
      const input = `query: ${query}`;
      const output = await extractor(input, { pooling: 'mean', normalize: true });
      self.postMessage({ type: 'query-embedded', embedding: new Float32Array(output.data) });
    } catch (err) {
      self.postMessage({ type: 'error', message: `Query embedding failed: ${err.message}` });
    }
    return;
  }

  if (type === 'search') {
    const { queryEmbedding, chunkEmbeddings, topK } = e.data;
    const scores = chunkEmbeddings.map((emb, index) => ({
      index,
      score: cosineSimilarity(queryEmbedding, emb),
    }));
    scores.sort((a, b) => b.score - a.score);
    self.postMessage({ type: 'search-results', results: scores.slice(0, topK) });
    return;
  }
};
```

**Step 2: Write the service wrapper**

```javascript
// frontend/src/services/embeddings.js

let worker = null;
let modelLoaded = false;
let pendingCallbacks = {};
let callbackId = 0;

function getWorker() {
  if (!worker) {
    worker = new Worker(
      new URL('../workers/embeddings.worker.js', import.meta.url),
      { type: 'module' }
    );
    worker.onmessage = handleMessage;
    worker.onerror = (err) => {
      console.error('Worker error:', err);
      // Reject all pending callbacks
      Object.values(pendingCallbacks).forEach(({ reject }) =>
        reject(new Error('Worker crashed'))
      );
      pendingCallbacks = {};
    };
  }
  return worker;
}

function handleMessage(e) {
  const { type } = e.data;

  // Progress events are handled via dedicated listeners
  if (type === 'model-progress' || type === 'chunk-progress') {
    if (pendingCallbacks._progressListener) {
      pendingCallbacks._progressListener(e.data);
    }
    return;
  }

  if (type === 'error') {
    // Reject the most recent pending callback
    const keys = Object.keys(pendingCallbacks).filter(k => !k.startsWith('_'));
    if (keys.length > 0) {
      const key = keys[0];
      pendingCallbacks[key].reject(new Error(e.data.message));
      delete pendingCallbacks[key];
    }
    return;
  }

  if (type === 'model-loaded') {
    modelLoaded = true;
    if (pendingCallbacks._loadModel) {
      pendingCallbacks._loadModel.resolve();
      delete pendingCallbacks._loadModel;
    }
    return;
  }

  if (type === 'chunks-embedded') {
    if (pendingCallbacks._embedChunks) {
      pendingCallbacks._embedChunks.resolve(e.data.embeddings);
      delete pendingCallbacks._embedChunks;
    }
    return;
  }

  if (type === 'query-embedded') {
    if (pendingCallbacks._embedQuery) {
      pendingCallbacks._embedQuery.resolve(e.data.embedding);
      delete pendingCallbacks._embedQuery;
    }
    return;
  }

  if (type === 'search-results') {
    if (pendingCallbacks._search) {
      pendingCallbacks._search.resolve(e.data.results);
      delete pendingCallbacks._search;
    }
    return;
  }
}

export async function loadModel(onProgress) {
  if (modelLoaded) return;
  const w = getWorker();
  if (onProgress) {
    pendingCallbacks._progressListener = onProgress;
  }
  return new Promise((resolve, reject) => {
    pendingCallbacks._loadModel = { resolve, reject };
    w.postMessage({ type: 'load-model' });
  });
}

export async function embedChunks(chunks, onProgress) {
  const w = getWorker();
  if (onProgress) {
    pendingCallbacks._progressListener = onProgress;
  }
  return new Promise((resolve, reject) => {
    pendingCallbacks._embedChunks = { resolve, reject };
    w.postMessage({ type: 'embed-chunks', chunks });
  });
}

export async function embedQuery(query) {
  const w = getWorker();
  return new Promise((resolve, reject) => {
    pendingCallbacks._embedQuery = { resolve, reject };
    w.postMessage({ type: 'embed-query', query });
  });
}

export async function search(queryEmbedding, chunkEmbeddings, topK) {
  const w = getWorker();
  return new Promise((resolve, reject) => {
    pendingCallbacks._search = { resolve, reject };
    w.postMessage({ type: 'search', queryEmbedding, chunkEmbeddings, topK });
  });
}

export function isModelLoaded() {
  return modelLoaded;
}
```

**Step 3: Commit**

```bash
git add frontend/src/workers/embeddings.worker.js frontend/src/services/embeddings.js
git commit -m "feat: add Web Worker for embeddings and search with e5-base-v2 ONNX"
```

---

### Task 6: Rewrite Auth Hook (GIS Client-Side OAuth)

**Files:**
- Modify: `frontend/src/hooks/useAuth.jsx`
- Modify: `frontend/index.html`
- Delete: `frontend/src/services/api.js`

**Step 1: Add GIS script to index.html**

Replace `frontend/index.html` with:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vector Search</title>
    <script src="https://accounts.google.com/gsi/client" async defer></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

**Step 2: Rewrite useAuth.jsx**

Replace `frontend/src/hooks/useAuth.jsx` entirely:

```jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUserInfo } from '../services/drive';

const AuthContext = createContext(null);

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenClient, setTokenClient] = useState(null);

  // Initialize GIS token client
  useEffect(() => {
    const initGIS = () => {
      if (!window.google?.accounts?.oauth2) {
        // GIS script not loaded yet, retry
        setTimeout(initGIS, 100);
        return;
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (response) => {
          if (response.error) {
            console.error('OAuth error:', response.error);
            setLoading(false);
            return;
          }
          const token = response.access_token;
          setAccessToken(token);
          sessionStorage.setItem('access_token', token);
          try {
            const userInfo = await getUserInfo(token);
            setUser({ email: userInfo.email, googleId: userInfo.id });
          } catch (err) {
            console.error('Failed to get user info:', err);
          }
          setLoading(false);
        },
      });
      setTokenClient(client);
    };

    initGIS();
  }, []);

  // Try to restore session from sessionStorage
  useEffect(() => {
    const storedToken = sessionStorage.getItem('access_token');
    if (storedToken) {
      getUserInfo(storedToken)
        .then((userInfo) => {
          setAccessToken(storedToken);
          setUser({ email: userInfo.email, googleId: userInfo.id });
        })
        .catch(() => {
          sessionStorage.removeItem('access_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(() => {
    if (tokenClient) {
      tokenClient.requestAccessToken();
    }
  }, [tokenClient]);

  const logout = useCallback(() => {
    if (accessToken) {
      window.google.accounts.oauth2.revoke(accessToken);
    }
    setUser(null);
    setAccessToken(null);
    sessionStorage.removeItem('access_token');
  }, [accessToken]);

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

**Step 3: Delete old api.js**

```bash
rm frontend/src/services/api.js
```

**Step 4: Commit**

```bash
git add frontend/index.html frontend/src/hooks/useAuth.jsx
git rm frontend/src/services/api.js
git commit -m "feat: rewrite auth to use Google Identity Services (client-side OAuth)"
```

---

### Task 7: Rewrite App.jsx (Integrate All Browser Services)

**Files:**
- Modify: `frontend/src/App.jsx`

**Step 1: Rewrite App.jsx**

Replace `frontend/src/App.jsx` entirely. The Dashboard component is rewritten to use browser services instead of API calls. UI rendering logic stays the same.

```jsx
import { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from './hooks/useAuth';
import useAppState, { APP_STATES } from './hooks/useAppState';
import { ToastProvider, useToast } from './components/common';
import { Layout, TopBar } from './components/layout';
import Login from './components/Login';
import { ResultsList, ResultModal } from './components/search';
import { OnboardingPrompt, IndexProgress } from './components/indexing';
import { listDocxFiles, downloadFile } from './services/drive';
import { getIndexStatus, deleteAllDocuments, saveDocument, saveChunks, getChunks } from './services/storage';
import { loadModel, embedChunks, embedQuery, search, isModelLoaded } from './services/embeddings';
import mammoth from 'mammoth';

function chunkText(text, chunkSize = 50, overlap = 5) {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const chunks = [];
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.length > 0) chunks.push(chunk);
    if (i + chunkSize >= words.length) break;
  }
  return chunks.length > 0 ? chunks : [text];
}

function Dashboard() {
  const { appState, indexingStatus, startIndexing, updateIndexingStatus, finishIndexing, goToReady, goToOnboarding, startSearching, finishSearching } = useAppState();
  const { user, accessToken } = useAuth();
  const { addToast } = useToast();
  const [documentCount, setDocumentCount] = useState(0);
  const [lastIndexed, setLastIndexed] = useState(null);
  const [results, setResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);

  useEffect(() => {
    if (!user?.googleId) return;
    getIndexStatus(user.googleId)
      .then(status => {
        setDocumentCount(status.documentCount);
        setLastIndexed(status.lastIndexedAt);
        if (status.indexed) {
          goToReady();
        } else {
          goToOnboarding();
        }
      })
      .catch(err => {
        console.error('Failed to check indexing status:', err);
        addToast('Failed to check indexing status', 'error');
      });
  }, [user?.googleId]);

  const handleIndex = async () => {
    startIndexing();

    try {
      // Phase 1: Load model if needed
      if (!isModelLoaded()) {
        updateIndexingStatus({ phase: 'loading', message: 'Loading AI model...', progress: 0 });
        await loadModel((progress) => {
          if (progress.type === 'model-progress') {
            updateIndexingStatus({ progress: Math.round(progress.progress * 0.3), message: `Loading AI model... ${progress.progress}%` });
          }
        });
      }

      // Phase 2: Scan Drive
      updateIndexingStatus({ phase: 'scanning', message: 'Scanning Google Drive...', progress: 30 });
      const files = await listDocxFiles(accessToken);

      if (files.length === 0) {
        updateIndexingStatus({ phase: 'complete', message: 'No .docx files found', progress: 100, documentCount: 0 });
        setDocumentCount(0);
        return;
      }

      // Phase 3: Delete existing data
      await deleteAllDocuments(user.googleId);

      // Phase 4: Process each file
      let skipped = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const progressBase = 30 + (i / files.length) * 65;
        updateIndexingStatus({
          phase: 'processing',
          message: `Processing: ${file.name}`,
          progress: Math.round(progressBase),
          current: i + 1,
          total: files.length,
        });

        try {
          // Download .docx
          const arrayBuffer = await downloadFile(accessToken, file.id);

          // Parse with mammoth
          const { value: text } = await mammoth.extractRawText({ arrayBuffer });
          if (!text || text.trim().length === 0) {
            skipped++;
            continue;
          }

          // Chunk text
          const chunks = chunkText(text);

          // Embed chunks
          const embeddings = await embedChunks(chunks);

          // Save to IndexedDB
          const docId = await saveDocument({
            googleId: user.googleId,
            driveFileId: file.id,
            title: file.name,
            indexedAt: new Date(),
          });

          const chunkRecords = chunks.map((chunkText, idx) => ({
            documentId: docId,
            googleId: user.googleId,
            text: chunkText,
            embedding: embeddings[idx].buffer,
          }));
          await saveChunks(chunkRecords);
        } catch (err) {
          console.error(`Failed to process ${file.name}:`, err);
          if (err.status === 401) {
            addToast('Session expired. Please sign in again.', 'error');
            return;
          }
          skipped++;
        }
      }

      // Phase 5: Complete
      const indexedCount = files.length - skipped;
      setDocumentCount(indexedCount);
      setLastIndexed(new Date().toISOString());
      updateIndexingStatus({
        phase: 'complete',
        message: 'Indexing complete!',
        progress: 100,
        documentCount: indexedCount,
      });

      if (skipped > 0) {
        addToast(`Skipped ${skipped} file(s) that could not be processed.`, 'warning');
      }
    } catch (err) {
      console.error('Indexing failed:', err);
      if (err.status === 401) {
        addToast('Session expired. Please sign in again.', 'error');
      } else {
        addToast('Failed to index documents. Please try again.', 'error');
      }
      goToOnboarding();
    }
  };

  const handleReindex = () => {
    setResults(null);
    handleIndex();
  };

  const handleIndexingComplete = () => {
    goToReady();
  };

  const handleSearch = async (query, topK) => {
    setIsSearching(true);
    startSearching();
    setResults(null);

    try {
      // Load model if not loaded
      if (!isModelLoaded()) {
        await loadModel();
      }

      // Get all chunks from IndexedDB
      const allChunks = await getChunks(user.googleId);
      if (allChunks.length === 0) {
        setResults([]);
        return;
      }

      // Embed query
      const queryEmb = await embedQuery(query);

      // Reconstruct embeddings from stored ArrayBuffers
      const chunkEmbeddings = allChunks.map(c => new Float32Array(c.embedding));

      // Search
      const searchResults = await search(queryEmb, chunkEmbeddings, topK);

      // Build result objects (need document info)
      const docs = await import('./services/storage').then(m => m.getDocuments(user.googleId));
      const docMap = Object.fromEntries(docs.map(d => [d.id, d]));

      const formattedResults = searchResults.map(r => {
        const chunk = allChunks[r.index];
        const doc = docMap[chunk.documentId];
        return {
          title: doc?.title || 'Unknown',
          text: chunk.text,
          score: Math.round(r.score * 100),
          drive_file_id: doc?.driveFileId || null,
        };
      });

      setResults(formattedResults);
    } catch (err) {
      console.error('Search failed:', err);
      addToast('Search failed. Please try again.', 'error');
      setResults([]);
    } finally {
      setIsSearching(false);
      finishSearching();
    }
  };

  return (
    <>
      <Layout
        appState={appState}
        documentCount={documentCount}
        lastIndexed={lastIndexed}
        onReindex={handleReindex}
      >
        {appState === APP_STATES.ONBOARDING && (
          <OnboardingPrompt onIndex={handleIndex} />
        )}

        {(appState === APP_STATES.READY || appState === APP_STATES.SEARCHING) && (
          <>
            <TopBar
              onSearch={handleSearch}
              isSearching={isSearching}
              disabled={false}
            />
            <ResultsList
              results={results}
              isLoading={isSearching}
              onResultClick={setSelectedResult}
            />
          </>
        )}
      </Layout>

      {appState === APP_STATES.INDEXING && (
        <IndexProgress
          status={indexingStatus}
          onComplete={handleIndexingComplete}
        />
      )}

      {selectedResult && (
        <ResultModal
          result={selectedResult}
          onClose={() => setSelectedResult(null)}
        />
      )}
    </>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return user ? <Dashboard /> : <Login />;
}

export default function AppWithProvider() {
  return (
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  );
}
```

Key changes from the original:
- Imports browser services instead of `api` (axios)
- `handleIndex()` orchestrates the full browser-side pipeline: load model -> scan Drive -> download/parse/chunk/embed -> store in IndexedDB
- `handleSearch()` loads chunks from IndexedDB, embeds query in worker, runs similarity search in worker
- `useEffect` checks IndexedDB status instead of `GET /api/status`
- Merged the duplicate `READY`/`SEARCHING` render blocks into one conditional
- Added `chunkText()` utility (same algorithm as Python backend)

**Step 2: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: rewrite App.jsx to use browser services instead of backend API"
```

---

### Task 8: Update Vite Config for Static Build

**Files:**
- Modify: `frontend/vite.config.js`

**Step 1: Rewrite vite.config.js**

Remove the proxy configuration (no backend). Add `base` for GitHub Pages. Ensure the worker is handled correctly by Vite.

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    port: 3000,
  },
  worker: {
    format: 'es',
  },
})
```

The `base` path defaults to `/` for local development but can be set to e.g. `/vector_search/` for GitHub Pages via env var.

**Step 2: Commit**

```bash
git add frontend/vite.config.js
git commit -m "chore: update vite config for static build (remove proxy, add base path)"
```

---

### Task 9: Add GitHub Pages Deployment

**Files:**
- Create: `.github/workflows/deploy.yml`
- Create: `frontend/public/404.html`

**Step 1: Create the GitHub Actions workflow**

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: frontend
        run: npm ci

      - name: Build
        working-directory: frontend
        env:
          VITE_GOOGLE_CLIENT_ID: ${{ secrets.VITE_GOOGLE_CLIENT_ID }}
          VITE_BASE_PATH: /${{ github.event.repository.name }}/
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: frontend/dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**Step 2: Create SPA fallback 404.html**

GitHub Pages doesn't support SPA routing fallback, but since this app doesn't use client-side routing (it's a single-route app), we only need a basic 404 that redirects to index:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Vector Search</title>
    <script>
      // Redirect to the main page for SPA support
      window.location.replace(window.location.origin + window.location.pathname.split('/').slice(0, 2).join('/') + '/');
    </script>
  </head>
  <body>
    <p>Redirecting...</p>
  </body>
</html>
```

**Step 3: Commit**

```bash
git add .github/workflows/deploy.yml frontend/public/404.html
git commit -m "feat: add GitHub Pages deployment workflow and SPA 404 fallback"
```

---

### Task 10: Verify Build & Test Locally

**Step 1: Run the build**

```bash
cd frontend
VITE_GOOGLE_CLIENT_ID=test-client-id npm run build
```

Expected: Build succeeds, produces `frontend/dist/` with `index.html`, JS bundles, and the worker file.

**Step 2: Check the dist output**

```bash
ls frontend/dist/
ls frontend/dist/assets/
```

Verify that the worker JS file is present in the assets.

**Step 3: Preview locally**

```bash
cd frontend
VITE_GOOGLE_CLIENT_ID=test-client-id npm run preview
```

Open `http://localhost:4173` -- should show the login page (Google sign-in won't work with a test client ID, but the page should render without errors).

**Step 4: Fix any build errors**

If there are build errors (import issues, missing modules, etc.), fix them before proceeding.

**Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build issues"
```

---

### Task 11: Final Cleanup

**Step 1: Review for any remaining references to the old backend**

Search for any remaining references to `axios`, `/auth/`, `/api/`, `localhost:5000`, or `api.js`:

```bash
cd frontend
grep -r "axios\|localhost:5000\|from.*api" src/ --include="*.js" --include="*.jsx" | grep -v node_modules
```

Fix any remaining references.

**Step 2: Verify common barrel exports**

Check that `frontend/src/components/common/index.js` still exports correctly (it re-exports from `ToastContext` which hasn't moved).

**Step 3: Commit final cleanup**

```bash
git add -A
git commit -m "chore: final cleanup of backend references"
```
