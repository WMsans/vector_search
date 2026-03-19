# Static Site Migration Design

**Date:** 2026-03-18
**Goal:** Convert the Vector Search webapp from a Flask+React client-server app to a purely static SPA hostable on GitHub Pages, with all functionality preserved.

## Summary

Remove the Python/Flask backend entirely. Replace all server-side functionality (OAuth, Google Drive access, embedding, search, storage) with browser-based equivalents. The React frontend stays largely unchanged -- only the service layer is rewritten.

## Architecture

```
User's Browser (static files from GitHub Pages)
  |
  |-- Google Identity Services (GIS) --> OAuth access token
  |-- Google Drive API (via fetch + token) --> list/download .docx files
  |-- mammoth.js --> extract text from .docx
  |-- Web Worker:
  |     |-- @xenova/transformers (ONNX/WASM) --> embed text chunks (e5-base-v2)
  |     |-- cosine similarity search --> ranked results
  |-- IndexedDB (via Dexie.js) --> persist documents, chunks, embeddings
  |-- React UI (unchanged components) --> display results
```

## What Gets Deleted

- `backend/` (entire directory)
- `backend_setup.sh`, `frontend_setup.sh`
- `.env.example` (no server secrets needed)

## What Stays

- `frontend/` remains the entire project
- All UI components remain identical
- `docs/` stays for design docs

## New Dependencies

| Package | Purpose | Size |
|---------|---------|------|
| `@xenova/transformers` | Run e5-base-v2 embedding model in browser (ONNX Runtime + WASM) | ~2MB JS + ~67MB model (lazy-loaded, cached) |
| `mammoth` | Parse .docx files to text in browser | ~100KB |
| `dexie` | IndexedDB wrapper for structured storage | ~40KB |
| `google-accounts` (CDN) | Google Identity Services for client-side OAuth | Loaded from Google CDN |

## Removed Dependencies

- `axios` (replaced by native `fetch` for Drive API calls)

---

## Authentication & Google Drive Access

### Client-Side OAuth with Google Identity Services

1. Load the GIS library (`accounts.google.com/gsi/client`) via a script tag in `index.html`.
2. Initialize a `TokenClient` with the Google Client ID and requested scopes (`drive.readonly`, `userinfo.email`, `userinfo.profile`, `openid`).
3. User clicks "Sign in with Google" -> GIS opens a popup -> user consents -> GIS returns an `access_token` directly to the browser.
4. Token stored in React state via `AuthContext`, optionally persisted in `sessionStorage` for tab refresh survival.
5. All Google API calls use `Authorization: Bearer <token>` header in `fetch` requests.

**Token lifecycle:**
- GIS tokens expire after 1 hour.
- On 401 from Drive API, prompt re-authentication (GIS can do this silently if user already consented).
- No refresh tokens in client-side flow.

**OAuth credential changes:**
- Add GitHub Pages URL as authorized JavaScript origin in Google Cloud Console.
- Remove server redirect URI (`localhost:5000/auth/callback`).

### Google Drive API (Browser-Side)

Direct `fetch` calls to the Drive REST API:
- **List .docx files:** `GET https://www.googleapis.com/drive/v3/files?q=mimeType='...'`
- **Download file:** `GET https://www.googleapis.com/drive/v3/files/{fileId}?alt=media`
- **User info:** `GET https://www.googleapis.com/oauth2/v2/userinfo`

### Service Modules

**`services/auth.js`** -- replaces server-side OAuth:
- `initGoogleAuth(clientId)` -- load GIS, create token client
- `signIn()` -- trigger GIS consent flow, returns `{ accessToken, user }`
- `signOut()` -- revoke token
- `getAccessToken()` -- return current token or null

**`services/drive.js`** -- replaces backend `DriveService`:
- `listDocxFiles(accessToken)` -- list .docx files from Drive
- `downloadFile(accessToken, fileId)` -- download raw .docx as ArrayBuffer
- `getUserInfo(accessToken)` -- get email/profile

---

## Embeddings, Search & Web Worker

### Embedding Model

**Model:** `Xenova/e5-base-v2` via `@xenova/transformers` (ONNX Runtime WASM).
- 768-dimensional embeddings (identical to the current Python backend).
- Quantized ONNX variant is ~67MB, cached by the browser after first download.
- Same model family as current backend -- search quality is identical.

**E5 prefixes:** Queries prefixed with `"query: "`, passages with `"passage: "` for optimal retrieval. The worker handles this automatically.

### Text Chunking

Same algorithm as current backend: sliding window of 50 words with 5-word overlap. Reimplemented in JavaScript.

### Cosine Similarity Search

Plain JavaScript with typed arrays. For 1,000 chunks with 768-dim vectors, computation takes <2ms. No approximate nearest neighbor index needed at this scale.

### Web Worker

A single Web Worker (`workers/embeddings.worker.js`) handles all CPU-intensive work:

**Message protocol:**

```
Main Thread -> Worker:
  { type: 'load-model' }
  { type: 'embed-chunks', chunks: string[] }
  { type: 'embed-query', query: string }
  { type: 'search', queryEmbedding: Float32Array, chunkEmbeddings: Float32Array[], topK: number }

Worker -> Main Thread:
  { type: 'model-loaded' }
  { type: 'model-progress', progress: number }
  { type: 'chunks-embedded', embeddings: Float32Array[] }
  { type: 'chunk-progress', current: number, total: number }
  { type: 'query-embedded', embedding: Float32Array }
  { type: 'search-results', results: { index: number, score: number }[] }
```

**Service module: `services/embeddings.js`** -- promise-based wrapper:
- `loadModel()` -> Promise (with progress callback)
- `embedChunks(chunks, onProgress)` -> Promise<Float32Array[]>
- `embedQuery(query)` -> Promise<Float32Array>
- `search(queryEmbedding, chunkEmbeddings, topK)` -> Promise<{index, score}[]>

---

## Storage (IndexedDB via Dexie)

### Schema

Database name: `vectorSearchDB`

**`userProfile`**
| Field | Type | Index | Notes |
|-------|------|-------|-------|
| `googleId` | string | Primary key | From Google userinfo |
| `email` | string | | Display only |

**`documents`**
| Field | Type | Index | Notes |
|-------|------|-------|-------|
| `id` | auto | Primary key | Auto-incremented |
| `googleId` | string | Indexed | Owner |
| `driveFileId` | string | Indexed | Google Drive file ID |
| `title` | string | | File name |
| `indexedAt` | Date | | Timestamp |

Compound index on `[googleId+driveFileId]`.

**`chunks`**
| Field | Type | Index | Notes |
|-------|------|-------|-------|
| `id` | auto | Primary key | Auto-incremented |
| `documentId` | number | Indexed | FK to documents |
| `googleId` | string | Indexed | For user-scoped queries |
| `text` | string | | Chunk text |
| `embedding` | ArrayBuffer | | Raw Float32Array (768 * 4 = 3,072 bytes) |

### Storage Estimates

- 1,000 chunks: ~3MB embeddings + ~500KB text = ~3.5MB
- 10,000 chunks: ~30MB embeddings + ~5MB text = ~35MB
- Well within IndexedDB limits.

### Service Module: `services/storage.js`

- `getUser(googleId)` / `saveUser(user)`
- `getDocuments(googleId)` / `saveDocument(doc)` / `deleteAllDocuments(googleId)`
- `getChunks(googleId)` / `saveChunks(chunks)` / `getChunksByDocumentId(docId)`
- `getIndexStatus(googleId)` -> `{ indexed, documentCount, lastIndexedAt }`

### Re-indexing

Full re-index: delete all existing documents/chunks, re-index everything. No incremental indexing.

---

## Indexing Pipeline

1. Worker sends `load-model` if not already loaded. Progress events update UI.
2. Call Drive API to list all .docx files. UI shows "Scanning..." phase.
3. Clear all documents/chunks for this user in IndexedDB.
4. For each file:
   a. Download .docx binary from Drive API
   b. Parse with mammoth.js -> extract text
   c. Chunk text (50 words, 5 overlap)
   d. Send chunks to worker for embedding
   e. Store Document + Chunks in IndexedDB
   f. Report progress (current file / total files)
5. Complete: UI transitions to search-ready state.

Progress uses the same phases as current (`scanning` -> `processing` -> `complete`), via React state updates instead of SSE. The `IndexProgress` component props interface is unchanged.

---

## Error Handling

| Error | Handling |
|-------|----------|
| OAuth token expired (401) | Toast "Session expired", prompt re-auth via GIS |
| Drive API rate limit (403) | Retry with exponential backoff (3 attempts), then error toast |
| .docx download fails | Skip file, continue, show skipped count at end |
| mammoth.js parse error | Skip file (same as above) |
| Worker crash | Detect via `worker.onerror`, error toast, offer retry |
| IndexedDB quota exceeded | Catch `QuotaExceededError`, toast suggesting clearing data |
| Model download fails | Retry 3 times, then "Try again" button |

---

## Deployment (GitHub Pages)

- Set `base` in `vite.config.js` to the repo name (e.g., `'/vector_search/'`)
- GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and deploys to `gh-pages` branch
- `404.html` redirecting to `index.html` for SPA routing
- Google Client ID as build-time env var: `VITE_GOOGLE_CLIENT_ID`

---

## Hook Changes

### `useAuth`
- Current: calls `GET /auth/me` on mount, redirects to `/auth/google`
- New: initializes GIS `TokenClient`, checks `sessionStorage` for token, validates via userinfo API

### `useAppState`
- State machine unchanged (`login` -> `onboarding` -> `indexing` -> `ready` -> `searching`)
- `checkStatus()` reads from IndexedDB instead of `GET /api/status`
- `startIndexing()` runs browser-side pipeline instead of SSE
- `search()` runs worker-based search instead of `POST /api/search`

## UI Components

No changes needed. Components receive the same props regardless of data source.
