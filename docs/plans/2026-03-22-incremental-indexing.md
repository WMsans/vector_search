# Incremental Indexing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable users to resume aborted indexing sessions, index new files, and re-index modified files without starting from scratch.

**Architecture:** Extend the IndexedDB documents table with `driveModifiedTime` and `status` fields. The indexing flow detects new/modified/pending files and processes only those, creating document records with `status: 'pending'` before processing and updating to `'completed'` after.

**Tech Stack:** React, Dexie (IndexedDB), Google Drive API

---

## Task 1: Update Dexie Schema

**Files:**
- Modify: `frontend/src/services/storage.js`

**Step 1: Bump schema version and add new fields**

Change the schema version from 2 to 3 and add `driveModifiedTime` and `status` to the documents store:

```javascript
db.version(3).stores({
  userProfile: 'googleId',
  documents: '++id, googleId, driveFileId, title, fileType, indexedAt, driveModifiedTime, status, [googleId+driveFileId]',
  chunks: '++id, documentId, googleId',
});
```

**Step 2: Verify no errors on load**

Run: `cd frontend && npm run dev`
Expected: App loads without Dexie schema errors

**Step 3: Commit**

```bash
git add frontend/src/services/storage.js
git commit -m "feat(storage): add driveModifiedTime and status fields to documents schema"
```

---

## Task 2: Add Storage Helper Functions

**Files:**
- Modify: `frontend/src/services/storage.js`

**Step 1: Add `getIndexedFileIds` function**

Add after the existing exports:

```javascript
export async function getIndexedFileIds(googleId) {
  const docs = await db.documents.where('googleId').equals(googleId).toArray();
  return new Set(docs.map(d => d.driveFileId));
}
```

**Step 2: Add `getPendingDocuments` function**

```javascript
export async function getPendingDocuments(googleId) {
  return db.documents
    .where('googleId').equals(googleId)
    .filter(d => d.status === 'pending')
    .toArray();
}
```

**Step 3: Add `getModifiedFiles` function**

```javascript
export async function getModifiedFiles(googleId, driveFiles) {
  const docs = await db.documents.where('googleId').equals(googleId).toArray();
  const docMap = new Map(docs.map(d => [d.driveFileId, d]));
  
  return driveFiles.filter(file => {
    const doc = docMap.get(file.id);
    if (!doc || !doc.driveModifiedTime) return false;
    return new Date(file.modifiedTime) > new Date(doc.driveModifiedTime);
  });
}
```

**Step 4: Add `updateDocumentStatus` function**

```javascript
export async function updateDocumentStatus(docId, status, driveModifiedTime) {
  await db.documents.update(docId, { status, driveModifiedTime });
}
```

**Step 5: Add `deleteDocumentsByFileIds` function**

```javascript
export async function deleteDocumentsByFileIds(googleId, fileIds) {
  const docs = await db.documents
    .where('googleId').equals(googleId)
    .filter(d => fileIds.includes(d.driveFileId))
    .toArray();
  const docIds = docs.map(d => d.id);
  await db.chunks.where('documentId').anyOf(docIds).delete();
  await db.documents.bulkDelete(docIds);
}
```

**Step 6: Update `saveDocument` to include new fields**

Modify the existing `saveDocument` function:

```javascript
export async function saveDocument(doc) {
  return db.documents.add({
    googleId: doc.googleId,
    driveFileId: doc.driveFileId,
    title: doc.title,
    fileType: doc.fileType || 'docx',
    indexedAt: doc.indexedAt,
    driveModifiedTime: doc.driveModifiedTime || null,
    status: doc.status || 'pending',
  });
}
```

**Step 7: Commit**

```bash
git add frontend/src/services/storage.js
git commit -m "feat(storage): add incremental indexing helper functions"
```

---

## Task 3: Update Drive Service to Fetch modifiedTime

**Files:**
- Modify: `frontend/src/services/drive.js`

**Step 1: Add modifiedTime to fields parameter**

Change line 37 from:

```javascript
const fields = 'files(id,name,mimeType)';
```

to:

```javascript
const fields = 'files(id,name,mimeType,modifiedTime)';
```

**Step 2: Commit**

```bash
git add frontend/src/services/drive.js
git commit -m "feat(drive): include modifiedTime in file listing"
```

---

## Task 4: Add Indexing Plan Logic to App.jsx

**Files:**
- Modify: `frontend/src/App.jsx`

**Step 1: Add new imports**

Update the storage import at line 11:

```javascript
import { getIndexStatus, deleteAllDocuments, saveDocument, saveChunks, getChunks, getDocuments, getIndexedFileIds, getPendingDocuments, getModifiedFiles, updateDocumentStatus } from './services/storage';
```

**Step 2: Add `determineIndexingPlan` helper function**

Add after the `chunkText` function (around line 23):

```javascript
async function determineIndexingPlan(googleId, driveFiles) {
  const indexedFileIds = await getIndexedFileIds(googleId);
  const pendingDocs = await getPendingDocuments(googleId);
  const modifiedFiles = await getModifiedFiles(googleId, driveFiles);
  
  const newFiles = driveFiles.filter(f => !indexedFileIds.has(f.id));
  
  const resumeFiles = pendingDocs.map(d => ({
    id: d.driveFileId,
    name: d.title,
    resume: true,
    docId: d.id,
    modifiedTime: d.driveModifiedTime,
  }));
  
  return {
    newFiles,
    modifiedFiles,
    resumeFiles,
    alreadyIndexed: driveFiles.filter(f => 
      indexedFileIds.has(f.id) && 
      !pendingDocs.some(p => p.driveFileId === f.id) &&
      !modifiedFiles.some(m => m.id === f.id)
    ),
  };
}
```

**Step 3: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat(indexing): add determineIndexingPlan helper function"
```

---

## Task 5: Refactor handleIndex for Incremental Mode

**Files:**
- Modify: `frontend/src/App.jsx`

**Step 1: Add indexingPlan state**

Add to Dashboard function state declarations (around line 29):

```javascript
const [indexingPlan, setIndexingPlan] = useState(null);
```

**Step 2: Modify handleIndex signature and initial logic**

Replace the `handleIndex` function (lines 59-157) with:

```javascript
const handleIndex = async (selectedTypes = ['docx'], mode = 'full') => {
  startIndexing();
  setIndexingPlan(null);

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

    const plan = await determineIndexingPlan(user.googleId, files);
    setIndexingPlan(plan);

    if (mode === 'prompt' && (plan.resumeFiles.length > 0 || plan.newFiles.length > 0 || plan.modifiedFiles.length > 0)) {
      updateIndexingStatus({
        phase: 'prompt',
        message: 'Choose indexing mode',
        progress: 35,
        plan,
      });
      return;
    }

    await executeIndexing(files, plan, mode, selectedTypes);
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

**Step 3: Add executeIndexing helper function**

Add after `handleIndex`:

```javascript
const executeIndexing = async (files, plan, mode, selectedTypes) => {
  let workQueue = [];
  
  if (mode === 'resume') {
    workQueue = [...plan.resumeFiles, ...plan.newFiles, ...plan.modifiedFiles];
  } else {
    await deleteAllDocuments(user.googleId);
    workQueue = files;
  }

  if (workQueue.length === 0) {
    updateIndexingStatus({
      phase: 'complete',
      message: 'All files already indexed',
      progress: 100,
      documentCount: plan.alreadyIndexed.length,
    });
    return;
  }

  let skipped = 0;
  for (let i = 0; i < workQueue.length; i++) {
    const file = workQueue[i];
    const progressBase = 30 + (i / workQueue.length) * 65;
    updateIndexingStatus({
      phase: 'processing',
      message: `Processing: ${file.name}`,
      progress: Math.round(progressBase),
      current: i + 1,
      total: workQueue.length,
    });

    try {
      let docId = file.docId;
      
      if (!docId) {
        docId = await saveDocument({
          googleId: user.googleId,
          driveFileId: file.id,
          title: file.name,
          fileType: file.name.split('.').pop()?.toLowerCase() || 'unknown',
          indexedAt: new Date(),
          driveModifiedTime: file.modifiedTime,
          status: 'pending',
        });
      }

      const arrayBuffer = await downloadFile(accessToken, file.id);
      const text = await extractText(arrayBuffer, file.name);
      
      if (!text || text.trim().length === 0) {
        if (!file.resume) {
          await db.documents.delete(docId);
        }
        skipped++;
        continue;
      }

      const chunks = chunkText(text);
      const embeddings = await embedChunks(chunks);

      const chunkRecords = chunks.map((chunkText, idx) => ({
        documentId: docId,
        googleId: user.googleId,
        text: chunkText,
        embedding: embeddings[idx].buffer,
      }));
      await saveChunks(chunkRecords);

      await updateDocumentStatus(docId, 'completed', file.modifiedTime);
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

  const indexedCount = workQueue.length - skipped;
  const totalCount = mode === 'resume' 
    ? plan.alreadyIndexed.length + indexedCount 
    : indexedCount;
  
  setDocumentCount(totalCount);
  setLastIndexed(new Date().toISOString());
  updateIndexingStatus({
    phase: 'complete',
    message: 'Indexing complete!',
    progress: 100,
    documentCount: totalCount,
  });

  if (skipped > 0) {
    addToast(`Skipped ${skipped} file(s) that could not be processed.`, 'warning');
  }
};
```

**Step 4: Add db import**

Add `db` to the storage import:

```javascript
import { getIndexStatus, deleteAllDocuments, saveDocument, saveChunks, getChunks, getDocuments, getIndexedFileIds, getPendingDocuments, getModifiedFiles, updateDocumentStatus } from './services/storage';
import db from './services/storage';
```

Or alternatively, add a delete function to storage.js:

```javascript
export async function deleteDocument(docId) {
  await db.documents.delete(docId);
}
```

And import it. Let's use the cleaner approach - add `deleteDocument` to storage.js.

**Step 5: Add deleteDocument to storage.js**

Add to `frontend/src/services/storage.js`:

```javascript
export async function deleteDocument(docId) {
  await db.chunks.where('documentId').equals(docId).delete();
  await db.documents.delete(docId);
}
```

**Step 6: Update import in App.jsx**

```javascript
import { getIndexStatus, deleteAllDocuments, saveDocument, saveChunks, getChunks, getDocuments, getIndexedFileIds, getPendingDocuments, getModifiedFiles, updateDocumentStatus, deleteDocument } from './services/storage';
```

**Step 7: Update executeIndexing to use deleteDocument**

Change the empty text handling:

```javascript
if (!text || text.trim().length === 0) {
  await deleteDocument(docId);
  skipped++;
  continue;
}
```

**Step 8: Commit**

```bash
git add frontend/src/App.jsx frontend/src/services/storage.js
git commit -m "feat(indexing): implement incremental indexing with resume support"
```

---

## Task 6: Add Resume Prompt to OnboardingPrompt

**Files:**
- Modify: `frontend/src/components/indexing/OnboardingPrompt.jsx`

**Step 1: Read current file**

Run: Read `frontend/src/components/indexing/OnboardingPrompt.jsx`

**Step 2: Add resume prompt UI**

Add props for resume detection and modify the component to show resume options when there are pending documents.

(Implementation will depend on current component structure)

**Step 3: Commit**

```bash
git add frontend/src/components/indexing/OnboardingPrompt.jsx
git commit -m "feat(ui): add resume prompt to onboarding"
```

---

## Task 7: Update handleReindex for Incremental Mode

**Files:**
- Modify: `frontend/src/App.jsx`

**Step 1: Modify handleReindex to use prompt mode**

Change line 159-162:

```javascript
const handleReindex = () => {
  setResults(null);
  handleIndex(['docx', 'pdf', 'pptx', 'txt'], 'prompt');
};
```

**Step 2: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat(indexing): use prompt mode for reindex button"
```

---

## Task 8: Update IndexProgress for Prompt Phase

**Files:**
- Modify: `frontend/src/components/indexing/IndexProgress.jsx`

**Step 1: Add prompt phase handling**

Add UI for when `status.phase === 'prompt'` to show resume/start fresh options.

**Step 2: Commit**

```bash
git add frontend/src/components/indexing/IndexProgress.jsx
git commit -m "feat(ui): add resume/start fresh prompt to IndexProgress"
```

---

## Task 9: Manual Testing

**Step 1: Test full indexing**

1. Clear IndexedDB data
2. Start indexing
3. Verify all files are processed
4. Verify documents have `status: 'completed'` and `driveModifiedTime` set

**Step 2: Test abort and resume**

1. Start indexing a large Drive
2. Close browser tab mid-indexing
3. Reopen app
4. Verify prompt to resume appears
5. Click Resume
6. Verify indexing continues from where it stopped

**Step 3: Test new file detection**

1. Complete indexing
2. Add a new file to Google Drive
3. Click Reindex
4. Verify only the new file is processed

**Step 4: Test modified file detection**

1. Complete indexing
2. Modify an existing file in Google Drive
3. Click Reindex
4. Verify only the modified file is re-indexed

---

## Files Summary

| File | Changes |
|------|---------|
| `frontend/src/services/storage.js` | Schema v3, add 6 new functions |
| `frontend/src/services/drive.js` | Add `modifiedTime` to fields |
| `frontend/src/App.jsx` | Add `determineIndexingPlan`, refactor `handleIndex`, add `executeIndexing` |
| `frontend/src/components/indexing/OnboardingPrompt.jsx` | Add resume detection UI |
| `frontend/src/components/indexing/IndexProgress.jsx` | Add prompt phase UI |
