# Folder Selection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add folder/file selection UI so users can choose which parts of their Google Drive to index instead of indexing everything.

**Architecture:** Multi-step onboarding wizard with lazy-loaded folder tree browser. Selection stored in IndexedDB and used to filter files during indexing. Folder tree loads contents on-demand via Google Drive API.

**Tech Stack:** React, Dexie (IndexedDB), Google Drive API, Heroicons

---

## Task 1: Add folderSelection store to IndexedDB

**Files:**
- Modify: `frontend/src/services/storage.js`

**Step 1: Add folderSelection store to schema**

Update the database version and add the new store:

```javascript
db.version(4).stores({
  userProfile: 'googleId',
  documents: '++id, googleId, driveFileId, title, fileType, indexedAt, driveModifiedTime, status, [googleId+driveFileId]',
  chunks: '++id, documentId, googleId',
  folderSelection: 'googleId',
});
```

**Step 2: Add folder selection functions**

Add these functions to storage.js:

```javascript
export async function saveFolderSelection(googleId, selection) {
  await db.folderSelection.put({
    googleId,
    selectedFolderIds: selection.selectedFolderIds || [],
    selectedFileIds: selection.selectedFileIds || [],
    updatedAt: new Date().toISOString(),
  });
}

export async function getFolderSelection(googleId) {
  return db.folderSelection.get(googleId);
}

export async function clearFolderSelection(googleId) {
  await db.folderSelection.delete(googleId);
}
```

**Step 3: Commit**

```bash
git add frontend/src/services/storage.js
git commit -m "feat(storage): add folderSelection store and functions"
```

---

## Task 2: Add Drive API functions for folder browsing

**Files:**
- Modify: `frontend/src/services/drive.js`

**Step 1: Add listRootItems function**

Add function to list root-level folders and files:

```javascript
export async function listRootItems(accessToken, extensions = ['docx'], pageToken = null) {
  const mimeTypes = getMimeTypes(extensions);
  const folderMime = "mimeType='application/vnd.google-apps.folder'";
  const mimeQuery = mimeTypes.map(m => `mimeType='${m}'`).join(' or ');
  const query = `(${folderMime} or ${mimeQuery}) and trashed=false and 'root' in parents`;
  const fields = 'files(id,name,mimeType),nextPageToken';
  let url = `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=100&orderBy=name`;
  if (pageToken) {
    url += `&pageToken=${pageToken}`;
  }
  const res = await fetchWithAuth(url, accessToken);
  return res.json();
}
```

**Step 2: Add listFolderContents function**

Add function to list contents of a specific folder:

```javascript
export async function listFolderContents(accessToken, folderId, extensions = ['docx'], pageToken = null) {
  const mimeTypes = getMimeTypes(extensions);
  const folderMime = "mimeType='application/vnd.google-apps.folder'";
  const mimeQuery = mimeTypes.map(m => `mimeType='${m}'`).join(' or ');
  const query = `(${folderMime} or ${mimeQuery}) and trashed=false and '${folderId}' in parents`;
  const fields = 'files(id,name,mimeType,modifiedTime),nextPageToken';
  let url = `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=100&orderBy=name`;
  if (pageToken) {
    url += `&pageToken=${pageToken}`;
  }
  const res = await fetchWithAuth(url, accessToken);
  return res.json();
}
```

**Step 3: Modify listFiles to accept folderIds parameter**

Update the existing listFiles function:

```javascript
export async function listFiles(accessToken, extensions = ['docx'], folderIds = null, maxResults = 1000) {
  const mimeTypes = getMimeTypes(extensions);
  
  if (mimeTypes.length === 0) {
    return [];
  }
  
  const mimeQuery = mimeTypes.map(m => `mimeType='${m}'`).join(' or ');
  let query = `(${mimeQuery}) and trashed=false`;
  
  if (folderIds && folderIds.length > 0) {
    const folderQuery = folderIds.map(id => `'${id}' in parents`).join(' or ');
    query += ` and (${folderQuery})`;
  }
  
  const fields = 'files(id,name,mimeType,modifiedTime)';
  const url = `${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=${maxResults}`;
  const res = await fetchWithAuth(url, accessToken);
  const data = await res.json();
  return data.files || [];
}
```

**Step 4: Commit**

```bash
git add frontend/src/services/drive.js
git commit -m "feat(drive): add folder browsing and filtering functions"
```

---

## Task 3: Create FolderTreeItem component

**Files:**
- Create: `frontend/src/components/indexing/FolderTreeItem.jsx`

**Step 1: Create the component**

```jsx
import { ChevronRightIcon, ChevronDownIcon, FolderIcon, DocumentIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

export default function FolderTreeItem({ 
  item, 
  isSelected, 
  isPartial,
  onToggle, 
  onExpand, 
  children,
  isExpanded,
  isLoading,
  level = 0 
}) {
  const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
  const hasChildren = children && children.length > 0;

  const handleCheckboxChange = (e) => {
    e.stopPropagation();
    onToggle(item);
  };

  return (
    <div>
      <div 
        className="flex items-center gap-2 py-1.5 px-2 hover:bg-gray-100 rounded cursor-pointer"
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        {isFolder && (
          <button
            onClick={() => onExpand(item.id)}
            className="p-0.5 hover:bg-gray-200 rounded"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            ) : isExpanded ? (
              <ChevronDownIcon className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-gray-500" />
            )}
          </button>
        )}
        {!isFolder && <div className="w-5" />}
        
        <input
          type="checkbox"
          checked={isSelected}
          ref={el => {
            if (el) el.indeterminate = isPartial && !isSelected;
          }}
          onChange={handleCheckboxChange}
          className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
        />
        
        {isFolder ? (
          <FolderIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
        ) : (
          <DocumentIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
        )}
        
        <span className="text-sm text-gray-700 truncate">{item.name}</span>
      </div>
      
      {isFolder && isExpanded && hasChildren && (
        <div>
          {children}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/indexing/FolderTreeItem.jsx
git commit -m "feat(ui): add FolderTreeItem component"
```

---

## Task 4: Create FolderBrowser component

**Files:**
- Create: `frontend/src/components/indexing/FolderBrowser.jsx`

**Step 1: Create the component**

```jsx
import { useState, useEffect, useCallback } from 'react';
import { FolderTreeItem } from './index';
import { listRootItems, listFolderContents } from '../../services/drive';
import { Spinner } from '../common';

export default function FolderBrowser({ 
  accessToken, 
  extensions,
  selection,
  onSelectionChange 
}) {
  const [rootItems, setRootItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState({});
  const [folderContents, setFolderContents] = useState({});
  const [loadingFolders, setLoadingFolders] = useState(new Set());

  useEffect(() => {
    loadRootItems();
  }, [accessToken, extensions]);

  const loadRootItems = async () => {
    setLoading(true);
    try {
      const data = await listRootItems(accessToken, extensions);
      setRootItems(data.files || []);
    } catch (err) {
      console.error('Failed to load root items:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = useCallback(async (folderId) => {
    if (expandedFolders[folderId]) {
      setExpandedFolders(prev => {
        const next = { ...prev };
        delete next[folderId];
        return next;
      });
      return;
    }

    setLoadingFolders(prev => new Set([...prev, folderId]));
    
    try {
      const data = await listFolderContents(accessToken, folderId, extensions);
      setFolderContents(prev => ({
        ...prev,
        [folderId]: data.files || [],
      }));
      setExpandedFolders(prev => ({
        ...prev,
        [folderId]: true,
      }));
    } catch (err) {
      console.error('Failed to load folder contents:', err);
    } finally {
      setLoadingFolders(prev => {
        const next = new Set(prev);
        next.delete(folderId);
        return next;
      });
    }
  }, [accessToken, extensions, expandedFolders]);

  const isItemSelected = (item) => {
    if (item.mimeType === 'application/vnd.google-apps.folder') {
      return selection.selectedFolderIds.includes(item.id);
    }
    return selection.selectedFileIds.includes(item.id);
  };

  const isItemPartial = (item) => {
    if (item.mimeType !== 'application/vnd.google-apps.folder') return false;
    
    const contents = folderContents[item.id] || [];
    if (contents.length === 0) return false;
    
    const selectedCount = contents.filter(child => isItemSelected(child)).length;
    return selectedCount > 0 && selectedCount < contents.length;
  };

  const handleToggle = useCallback((item) => {
    const isFolder = item.mimeType === 'application/vnd.google-apps.folder';
    const key = isFolder ? 'selectedFolderIds' : 'selectedFileIds';
    const currentList = selection[key];
    
    if (currentList.includes(item.id)) {
      onSelectionChange({
        ...selection,
        [key]: currentList.filter(id => id !== item.id),
      });
    } else {
      onSelectionChange({
        ...selection,
        [key]: [...currentList, item.id],
      });
    }
  }, [selection, onSelectionChange]);

  const handleSelectAll = () => {
    const allFolderIds = rootItems
      .filter(item => item.mimeType === 'application/vnd.google-apps.folder')
      .map(item => item.id);
    const allFileIds = rootItems
      .filter(item => item.mimeType !== 'application/vnd.google-apps.folder')
      .map(item => item.id);
    
    onSelectionChange({
      selectedFolderIds: allFolderIds,
      selectedFileIds: allFileIds,
    });
  };

  const handleDeselectAll = () => {
    onSelectionChange({
      selectedFolderIds: [],
      selectedFileIds: [],
    });
  };

  const renderItems = (items, level = 0) => {
    return items.map(item => (
      <FolderTreeItem
        key={item.id}
        item={item}
        isSelected={isItemSelected(item)}
        isPartial={isItemPartial(item)}
        onToggle={handleToggle}
        onExpand={handleExpand}
        isExpanded={expandedFolders[item.id]}
        isLoading={loadingFolders.has(item.id)}
        level={level}
      >
        {expandedFolders[item.id] && folderContents[item.id] && (
          renderItems(folderContents[item.id], level + 1)
        )}
      </FolderTreeItem>
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
        <span className="ml-2 text-gray-600">Loading your Drive...</span>
      </div>
    );
  }

  const totalSelected = selection.selectedFolderIds.length + selection.selectedFileIds.length;

  return (
    <div className="flex flex-col h-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Select folders to index</h3>
        <p className="text-sm text-gray-500">Choose which folders and files to include in your search index</p>
      </div>
      
      <div className="flex gap-2 mb-3">
        <button
          onClick={handleSelectAll}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Select all
        </button>
        <span className="text-gray-300">|</span>
        <button
          onClick={handleDeselectAll}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Deselect all
        </button>
        {totalSelected > 0 && (
          <span className="ml-auto text-sm text-gray-500">
            {totalSelected} selected
          </span>
        )}
      </div>
      
      <div className="flex-1 overflow-auto border border-gray-200 rounded-lg bg-white max-h-80">
        {rootItems.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No folders or files found
          </div>
        ) : (
          <div className="py-1">
            {renderItems(rootItems)}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/indexing/FolderBrowser.jsx
git commit -m "feat(ui): add FolderBrowser component"
```

---

## Task 5: Update indexing exports

**Files:**
- Modify: `frontend/src/components/indexing/index.js`

**Step 1: Add new exports**

```javascript
export { default as OnboardingPrompt } from './OnboardingPrompt';
export { default as IndexProgress } from './IndexProgress';
export { default as FolderBrowser } from './FolderBrowser';
export { default as FolderTreeItem } from './FolderTreeItem';
```

**Step 2: Commit**

```bash
git add frontend/src/components/indexing/index.js
git commit -m "feat(ui): export FolderBrowser and FolderTreeItem"
```

---

## Task 6: Refactor OnboardingPrompt to multi-step wizard

**Files:**
- Modify: `frontend/src/components/indexing/OnboardingPrompt.jsx`

**Step 1: Convert to wizard with folder selection**

Replace the entire file:

```jsx
import { CloudArrowUpIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import { FolderBrowser } from './index';
import { useAuth } from '../../hooks/useAuth';
import { getFolderSelection } from '../../services/storage';

const FILE_TYPES = [
  { id: 'docx', label: 'Word (.docx)' },
  { id: 'pdf', label: 'PDF (.pdf)' },
  { id: 'pptx', label: 'PowerPoint (.pptx)' },
  { id: 'txt', label: 'Text (.txt)' },
];

export default function OnboardingPrompt({ onIndex }) {
  const { accessToken } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedTypes, setSelectedTypes] = useState(['docx', 'pdf', 'pptx', 'txt']);
  const [folderSelection, setFolderSelection] = useState({
    selectedFolderIds: [],
    selectedFileIds: [],
  });

  useEffect(() => {
    loadSavedSelection();
  }, []);

  const loadSavedSelection = async () => {
    try {
      const saved = await getFolderSelection('default');
      if (saved) {
        setFolderSelection({
          selectedFolderIds: saved.selectedFolderIds || [],
          selectedFileIds: saved.selectedFileIds || [],
        });
      }
    } catch (err) {
      console.error('Failed to load saved selection:', err);
    }
  };

  const toggleType = (typeId) => {
    setSelectedTypes(prev => 
      prev.includes(typeId)
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    );
  };

  const handleFolderSelectionChange = (newSelection) => {
    setFolderSelection(newSelection);
  };

  const handleContinue = () => {
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleIndex = () => {
    onIndex(selectedTypes, folderSelection);
  };

  const hasSelection = folderSelection.selectedFolderIds.length > 0 || folderSelection.selectedFileIds.length > 0;

  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="max-w-lg w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
          <CloudArrowUpIcon className="h-10 w-10 text-blue-600" />
        </div>
        
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            <span className={`w-7 h-7 rounded-full text-sm flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              1
            </span>
            <span className="ml-2 text-sm font-medium">Select Folders</span>
          </div>
          <div className="w-8 h-0.5 bg-gray-200" />
          <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <span className={`w-7 h-7 rounded-full text-sm flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>
              2
            </span>
            <span className="ml-2 text-sm font-medium">Select File Types</span>
          </div>
        </div>

        {step === 1 && (
          <div className="text-left mb-6">
            <FolderBrowser
              accessToken={accessToken}
              extensions={selectedTypes}
              selection={folderSelection}
              onSelectionChange={handleFolderSelectionChange}
            />
          </div>
        )}

        {step === 1 && (
          <button
            onClick={handleContinue}
            disabled={!hasSelection}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        )}

        {step === 2 && (
          <>
            <p className="text-gray-600 mb-6">
              Select which file types to index from selected folders:
            </p>

            <div className="flex flex-wrap justify-center gap-3 mb-6">
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

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleBack}
                className="px-4 py-3 text-gray-600 hover:text-gray-800 font-medium flex items-center gap-1"
              >
                <ChevronLeftIcon className="w-4 h-4" />
                Back
              </button>
              <button
                onClick={handleIndex}
                disabled={selectedTypes.length === 0}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Index Selected Items
              </button>
            </div>
          </>
        )}

        <p className="text-xs text-gray-500 mt-4">
          {step === 1 
            ? 'Select the folders and files you want to make searchable'
            : 'This may take a few minutes depending on the number of documents'
          }
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/indexing/OnboardingPrompt.jsx
git commit -m "feat(ui): convert OnboardingPrompt to multi-step wizard"
```

---

## Task 7: Update App.jsx to use folder selection

**Files:**
- Modify: `frontend/src/App.jsx`

**Step 1: Import saveFolderSelection**

Add to imports:

```javascript
import { getIndexStatus, deleteAllDocuments, saveDocument, saveChunks, getChunks, getDocuments, getIndexedFileIds, getPendingDocuments, getModifiedFiles, updateDocumentStatus, deleteDocument, saveFolderSelection, getFolderSelection } from './services/storage';
```

**Step 2: Update handleIndex signature**

Modify the handleIndex function to accept folderSelection:

```javascript
const handleIndex = async (selectedTypes = ['docx'], folderSelection = null, mode = 'full') => {
  startIndexing();
  setIndexingPlan(null);
  setSelectedTypes(selectedTypes);

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
    
    const folderIds = folderSelection?.selectedFolderIds?.length > 0 
      ? folderSelection.selectedFolderIds 
      : null;
    
    const files = await listFiles(accessToken, selectedTypes, folderIds);

    if (files.length === 0) {
      updateIndexingStatus({ phase: 'complete', message: 'No files found', progress: 100, documentCount: 0 });
      setDocumentCount(0);
      return;
    }

    if (folderSelection) {
      await saveFolderSelection(user.googleId, folderSelection);
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

    await executeIndexing(files, plan, mode);
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

**Step 3: Update handleReindex to load saved selection**

```javascript
const handleReindex = async () => {
  setResults(null);
  try {
    const savedSelection = await getFolderSelection(user.googleId);
    handleIndex(['docx', 'pdf', 'pptx', 'txt'], savedSelection, 'prompt');
  } catch (err) {
    handleIndex(['docx', 'pdf', 'pptx', 'txt'], null, 'prompt');
  }
};
```

**Step 4: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat(indexing): integrate folder selection with indexing flow"
```

---

## Task 8: Add edit folder selection to Sidebar

**Files:**
- Modify: `frontend/src/components/layout/Sidebar.jsx`

**Step 1: Read current Sidebar content**

First read the file to understand current structure.

**Step 2: Add edit folder selection option**

Add an "Edit folder selection" link near the re-index button that resets the app to onboarding step 1.

---

## Task 9: Manual testing

**Test scenarios:**

1. Fresh start - no saved selection
   - Open app, verify folder browser shows root items
   - Select folders, verify checkboxes work
   - Expand folders, verify lazy loading
   - Continue to step 2, select file types
   - Start indexing, verify correct files are processed

2. Saved selection
   - Complete initial indexing with selection
   - Refresh page, re-index
   - Verify saved selection is loaded

3. Edge cases
   - Empty Drive
   - Deep folder nesting
   - Large folders (100+ items)
   - Network errors during folder load

---

## Summary

| Task | Files | Description |
|------|-------|-------------|
| 1 | storage.js | Add folderSelection store |
| 2 | drive.js | Add folder browsing API functions |
| 3 | FolderTreeItem.jsx | Tree item component |
| 4 | FolderBrowser.jsx | Main browser component |
| 5 | index.js | Export new components |
| 6 | OnboardingPrompt.jsx | Multi-step wizard |
| 7 | App.jsx | Integrate with indexing |
| 8 | Sidebar.jsx | Edit selection option |
| 9 | - | Manual testing |
