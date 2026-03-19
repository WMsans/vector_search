# Multi-File-Type Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add support for indexing and searching PDF, PPTX, and TXT files in addition to DOCX.

**Architecture:** Create a modular extractor registry in `fileExtractors.js` that maps file extensions to extraction functions. Update Drive API queries to support multiple mime types. Add file type selector UI in the onboarding flow.

**Tech Stack:** pdfjs-dist for PDF parsing, browser DecompressionStream API for PPTX, TextDecoder for TXT, existing mammoth for DOCX.

---

### Task 1: Install pdfjs-dist dependency

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install pdfjs-dist**

Run: `cd frontend && npm install pdfjs-dist`

**Step 2: Verify installation**

Run: `grep pdfjs-dist frontend/package.json`
Expected: `"pdfjs-dist": "^X.Y.Z"` appears in dependencies

**Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore: add pdfjs-dist for PDF parsing"
```

---

### Task 2: Create file extractors module

**Files:**
- Create: `frontend/src/services/fileExtractors.js`

**Step 1: Create the file extractors module with TXT extractor**

```javascript
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

async function extractTxt(arrayBuffer) {
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(arrayBuffer);
}

async function extractDocx(arrayBuffer) {
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  return value;
}

async function extractPdf(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const textParts = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map(item => item.str).join(' ');
    textParts.push(pageText);
  }
  return textParts.join('\n');
}

async function extractPptx(arrayBuffer) {
  const ds = new DecompressionStream('gzip');
  const decompressedStream = new Response(arrayBuffer).body.pipeThrough(ds);
  const decompressed = await decompressedStream.arrayBuffer();
  
  const textDecoder = new TextDecoder();
  const text = textDecoder.decode(decompressed);
  
  const slideTexts = text.match(/<a:t>([^<]*)<\/a:t>/g) || [];
  return slideTexts.map(t => t.replace(/<\/?a:t>/g, '')).join(' ');
}

const EXTRACTORS = {
  docx: {
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extract: extractDocx,
  },
  pdf: {
    mimeType: 'application/pdf',
    extract: extractPdf,
  },
  pptx: {
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    extract: extractPptx,
  },
  txt: {
    mimeType: 'text/plain',
    extract: extractTxt,
  },
};

export function getSupportedExtensions() {
  return Object.keys(EXTRACTORS);
}

export function getMimeTypes(extensions) {
  return extensions
    .filter(ext => EXTRACTORS[ext])
    .map(ext => EXTRACTORS[ext].mimeType);
}

export async function extractText(arrayBuffer, filename) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const extractor = EXTRACTORS[ext];
  if (!extractor) {
    return '';
  }
  return extractor.extract(arrayBuffer);
}
```

**Step 2: Commit**

```bash
git add frontend/src/services/fileExtractors.js
git commit -m "feat: add file extractors module with PDF, PPTX, TXT support"
```

---

### Task 3: Update drive service for multiple file types

**Files:**
- Modify: `frontend/src/services/drive.js`

**Step 1: Replace listDocxFiles with listFiles**

Replace the `listDocxFiles` function (lines 25-32) with:

```javascript
export async function listFiles(accessToken, extensions = ['docx'], maxResults = 1000) {
  const mimeTypes = [];
  const supportedMimes = {
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pdf: 'application/pdf',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
  };
  
  extensions.forEach(ext => {
    if (supportedMimes[ext]) {
      mimeTypes.push(supportedMimes[ext]);
    }
  });
  
  const mimeQuery = mimeTypes.map(m => `mimeType='${m}'`).join(' or ');
  const query = `(${mimeQuery}) and trashed=false`;
  const fields = 'files(id,name,mimeType)';
  const url = `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=${maxResults}`;
  const res = await fetchWithAuth(url, accessToken);
  const data = await res.json();
  return data.files || [];
}
```

**Step 2: Commit**

```bash
git add frontend/src/services/drive.js
git commit -m "feat: update drive service to support multiple file types"
```

---

### Task 4: Update storage schema for fileType

**Files:**
- Modify: `frontend/src/services/storage.js`

**Step 1: Read current storage.js**

Read the file to understand the current schema.

**Step 2: Add fileType to documents table**

Find the documents table schema definition and add `fileType` field. The schema should include:
- `++id, googleId, driveFileId, title, fileType, indexedAt`

**Step 3: Update saveDocument function**

Modify `saveDocument` to accept and store `fileType`:
```javascript
export async function saveDocument(doc) {
  return db.documents.add({
    googleId: doc.googleId,
    driveFileId: doc.driveFileId,
    title: doc.title,
    fileType: doc.fileType || 'docx',
    indexedAt: doc.indexedAt,
  });
}
```

**Step 4: Commit**

```bash
git add frontend/src/services/storage.js
git commit -m "feat: add fileType field to documents storage"
```

---

### Task 5: Update OnboardingPrompt with file type selector

**Files:**
- Modify: `frontend/src/components/indexing/OnboardingPrompt.jsx`

**Step 1: Add file type checkboxes**

Update the component to accept and manage selected file types:

```jsx
import { CloudArrowUpIcon, DocumentTextIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

const FILE_TYPES = [
  { id: 'docx', label: 'Word (.docx)' },
  { id: 'pdf', label: 'PDF (.pdf)' },
  { id: 'pptx', label: 'PowerPoint (.pptx)' },
  { id: 'txt', label: 'Text (.txt)' },
];

export default function OnboardingPrompt({ onIndex }) {
  const [selectedTypes, setSelectedTypes] = useState(['docx', 'pdf', 'pptx', 'txt']);

  const toggleType = (typeId) => {
    setSelectedTypes(prev => 
      prev.includes(typeId)
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    );
  };

  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="max-w-lg text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
          <CloudArrowUpIcon className="h-10 w-10 text-blue-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Welcome to Vector Search
        </h2>
        
        <p className="text-gray-600 mb-6">
          Select which file types to index from your Google Drive:
        </p>

        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {FILE_TYPES.map(type => (
            <label
              key={type.id}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${
                selectedTypes.includes(type.id)
                  ? 'bg-blue-100 border-2 border-blue-500'
                  : 'bg-gray-100 border-2 border-transparent hover:bg-gray-200'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedTypes.includes(type.id)}
                onChange={() => toggleType(type.id)}
                className="sr-only"
              />
              <span className={`text-sm font-medium ${
                selectedTypes.includes(type.id) ? 'text-blue-700' : 'text-gray-600'
              }`}>
                {type.label}
              </span>
            </label>
          ))}
        </div>

        <button
          onClick={() => onIndex(selectedTypes)}
          disabled={selectedTypes.length === 0}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Index My Drive
        </button>

        <p className="text-xs text-gray-500 mt-4">
          This may take a few minutes depending on the number of documents
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/indexing/OnboardingPrompt.jsx
git commit -m "feat: add file type selector to onboarding"
```

---

### Task 6: Update App.jsx to use new extractors

**Files:**
- Modify: `frontend/src/App.jsx`

**Step 1: Update imports**

Replace:
```javascript
import { listDocxFiles, downloadFile } from './services/drive';
```

With:
```javascript
import { listFiles, downloadFile } from './services/drive';
import { extractText } from './services/fileExtractors';
```

Remove the mammoth import (no longer needed here):
```javascript
import mammoth from 'mammoth';
```

**Step 2: Update handleIndex function**

Modify `handleIndex` to:
1. Accept `selectedTypes` parameter
2. Use `listFiles` instead of `listDocxFiles`
3. Use `extractText` instead of mammoth
4. Store `fileType` in document record

Replace the handleIndex function:

```javascript
const handleIndex = async (selectedTypes = ['docx']) => {
  startIndexing();

  try {
    if (!isModelLoaded()) {
      updateIndexingStatus({ phase: 'loading', message: 'Loading AI model...', progress: 0 });
      await loadModel((progress) => {
        if (progress.type === 'model-progress') {
          updateIndexingStatus({ progress: Math.round(progress.progress * 0.3), message: `Loading AI model... ${progress.progress}%` });
        }
      });
    }

    updateIndexingStatus({ phase: 'scanning', message: 'Scanning Google Drive...', progress: 30 });
    const files = await listFiles(accessToken, selectedTypes);

    if (files.length === 0) {
      updateIndexingStatus({ phase: 'complete', message: 'No files found', progress: 100, documentCount: 0 });
      setDocumentCount(0);
      return;
    }

    await deleteAllDocuments(user.googleId);

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
        const arrayBuffer = await downloadFile(accessToken, file.id);

        const text = await extractText(arrayBuffer, file.name);
        if (!text || text.trim().length === 0) {
          skipped++;
          continue;
        }

        const chunks = chunkText(text);

        const embeddings = await embedChunks(chunks);

        const fileType = file.name.split('.').pop()?.toLowerCase() || 'unknown';
        const docId = await saveDocument({
          googleId: user.googleId,
          driveFileId: file.id,
          title: file.name,
          fileType: fileType,
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
          goToOnboarding();
          return;
        }
        skipped++;
      }
    }

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
```

**Step 3: Update handleReindex**

Update `handleReindex` to use default types:
```javascript
const handleReindex = () => {
  setResults(null);
  handleIndex(['docx', 'pdf', 'pptx', 'txt']);
};
```

**Step 4: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: integrate multi-file-type extraction in indexing flow"
```

---

### Task 7: Fix PPTX extraction (use correct decompression)

**Files:**
- Modify: `frontend/src/services/fileExtractors.js`

**Step 1: Update extractPptx to use JSZip pattern**

PPTX files are ZIP archives, not gzip. Update the function:

```javascript
async function extractPptx(arrayBuffer) {
  const zip = await JSZip.loadAsync(arrayBuffer);
  const slideFiles = Object.keys(zip.files).filter(name => 
    name.match(/^ppt\/slides\/slide\d+\.xml$/)
  );
  
  const textParts = [];
  for (const slideFile of slideFiles) {
    const content = await zip.file(slideFile).async('text');
    const matches = content.match(/<a:t>([^<]*)<\/a:t>/g) || [];
    textParts.push(...matches.map(t => t.replace(/<\/?a:t>/g, '')));
  }
  return textParts.join(' ');
}
```

**Step 2: Install JSZip**

Run: `cd frontend && npm install jszip`

**Step 3: Add JSZip import**

Add at top of fileExtractors.js:
```javascript
import JSZip from 'jszip';
```

**Step 4: Commit**

```bash
git add frontend/src/services/fileExtractors.js frontend/package.json frontend/package-lock.json
git commit -m "fix: use JSZip for PPTX extraction"
```

---

### Task 8: Test the implementation

**Step 1: Start development server**

Run: `cd frontend && npm run dev`

**Step 2: Manual testing checklist**

- [ ] Sign in with Google
- [ ] Verify file type checkboxes appear on onboarding
- [ ] Select all file types and index
- [ ] Verify DOCX files are indexed
- [ ] Verify PDF files are indexed
- [ ] Verify PPTX files are indexed
- [ ] Verify TXT files are indexed
- [ ] Search and verify results from all file types
- [ ] Test with only some file types selected

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve testing issues"
```

---

### Task 9: Update README documentation

**Files:**
- Modify: `README.md`

**Step 1: Update description**

Change:
```
Search your Google Drive .docx files with semantic vector search.
```

To:
```
Search your Google Drive documents with semantic vector search. Supports DOCX, PDF, PPTX, and TXT files.
```

**Step 2: Update How It Works section**

Change:
```
2. Click "Index My Drive" to scan and embed your .docx files
```

To:
```
2. Select file types and click "Index My Drive" to scan and embed your documents
```

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: update README for multi-file-type support"
```
