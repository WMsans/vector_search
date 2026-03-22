# Incremental Indexing Design

## Overview

Implement incremental indexing so users can:
- Resume indexing after an aborted session
- Index new files added since last session
- Re-index files that have been modified

## Requirements

1. **Resume aborted indexing**: Continue processing files that weren't indexed before interruption
2. **Index new files**: Detect and index files added to Drive since last session
3. **Re-index modified files**: Detect files where content changed and re-index them
4. **Change detection**: Use Drive API's `modifiedTime` field to detect changes

## Data Model Changes

### Schema Migration (v2 → v3)

```javascript
db.version(3).stores({
  documents: '++id, googleId, driveFileId, title, fileType, indexedAt, driveModifiedTime, status, [googleId+driveFileId]',
  chunks: '++id, documentId, googleId',
});
```

### New Fields

| Field | Type | Description |
|-------|------|-------------|
| `driveModifiedTime` | string (ISO 8601) | File's `modifiedTime` from Drive API at time of indexing |
| `status` | string | `'pending'` during processing, `'completed'` when done |

### Migration Strategy

Existing documents get:
- `status: 'completed'`
- `driveModifiedTime: null` (will be updated on next re-index)

## Storage Service Changes

New functions in `storage.js`:

```javascript
// Get all indexed file IDs for a user
export async function getIndexedFileIds(googleId) {
  const docs = await db.documents.where('googleId').equals(googleId).toArray();
  return new Set(docs.map(d => d.driveFileId));
}

// Get documents that need processing
export async function getPendingDocuments(googleId) {
  return db.documents
    .where('googleId').equals(googleId)
    .filter(d => d.status === 'pending')
    .toArray();
}

// Get files modified since last index
export async function getModifiedFiles(googleId, driveFiles) {
  const docs = await db.documents.where('googleId').equals(googleId).toArray();
  const docMap = new Map(docs.map(d => [d.driveFileId, d]));
  
  return driveFiles.filter(file => {
    const doc = docMap.get(file.id);
    if (!doc || !doc.driveModifiedTime) return false;
    return new Date(file.modifiedTime) > new Date(doc.driveModifiedTime);
  });
}

// Update document status
export async function updateDocumentStatus(docId, status, driveModifiedTime) {
  await db.documents.update(docId, { status, driveModifiedTime });
}

// Delete documents by file IDs
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

## Drive Service Changes

Modify `listFiles()` to include `modifiedTime`:

```javascript
const fields = 'files(id,name,mimeType,modifiedTime)';
```

Each file now returns: `{ id, name, mimeType, modifiedTime }`

## Indexing Flow

### Helper: `determineIndexingPlan()`

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

### Modified `handleIndex()`

```javascript
const handleIndex = async (selectedTypes = ['docx'], mode = 'full') => {
  startIndexing();
  
  try {
    if (!isModelLoaded()) {
      updateIndexingStatus({ phase: 'loading', message: 'Loading AI model...', progress: 0 });
      await loadModel(/* ... */);
    }
    
    updateIndexingStatus({ phase: 'scanning', message: 'Scanning...', progress: 30 });
    const files = await listFiles(accessToken, selectedTypes);
    
    const plan = await determineIndexingPlan(user.googleId, files);
    
    let workQueue = [];
    if (mode === 'resume') {
      workQueue = [...plan.resumeFiles, ...plan.newFiles, ...plan.modifiedFiles];
    } else {
      await deleteAllDocuments(user.googleId);
      workQueue = files;
    }
    
    for (const file of workQueue) {
      let docId = file.docId;
      if (!docId) {
        docId = await saveDocument({
          googleId: user.googleId,
          driveFileId: file.id,
          title: file.name,
          fileType: file.name.split('.').pop()?.toLowerCase(),
          indexedAt: new Date(),
          driveModifiedTime: file.modifiedTime,
          status: 'pending',
        });
      }
      
      // Download, extract, chunk, embed (same as before)
      const arrayBuffer = await downloadFile(accessToken, file.id);
      const text = await extractText(arrayBuffer, file.name);
      const chunks = chunkText(text);
      const embeddings = await embedChunks(chunks);
      
      const chunkRecords = chunks.map((text, idx) => ({
        documentId: docId,
        googleId: user.googleId,
        text,
        embedding: embeddings[idx].buffer,
      }));
      await saveChunks(chunkRecords);
      
      await updateDocumentStatus(docId, 'completed', file.modifiedTime);
    }
    
    // Update completion status
  } catch (err) {
    // Error handling
  }
};
```

## UI Changes

### Resume Prompt

When starting indexing with pending documents:

```jsx
{showResumePrompt && (
  <div className="resume-prompt">
    <h3>Resume Indexing?</h3>
    <p>
      {plan.resumeFiles.length} files remaining, 
      {plan.newFiles.length} new, 
      {plan.modifiedFiles.length} modified
    </p>
    <button onClick={() => handleIndex(types, 'resume')}>Resume</button>
    <button onClick={() => handleIndex(types, 'full')}>Start Fresh</button>
  </div>
)}
```

### Progress Display

Show breakdown in `IndexProgress`:
- "Processing file X of Y (Z new, W modified, V resumed)"

## Files to Modify

| File | Changes |
|------|---------|
| `storage.js` | Schema v3, add 5 new functions |
| `drive.js` | Add `modifiedTime` to listFiles |
| `App.jsx` | Add `determineIndexingPlan()`, refactor `handleIndex()` |
| `OnboardingPrompt.jsx` | Add resume prompt detection and UI |
| `IndexProgress.jsx` | Show file breakdown in completion |

## Not Included (YAGNI)

- Deleting files removed from Drive (not requested)
- Multiple concurrent sessions (overkill for single-user)
- MD5 hash comparison (modifiedTime sufficient)
