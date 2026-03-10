# Open in Google Docs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add ability to open search results in their original Google Doc location in a new browser tab.

**Architecture:** Backend returns `drive_file_id` in search results. Frontend constructs Google Docs URL and displays icon button in both ResultCard and ResultModal components. Opens in new tab with proper security attributes.

**Tech Stack:** Flask (backend), React with Tailwind CSS and Heroicons (frontend)

---

### Task 1: Backend - Add drive_file_id to search response

**Files:**
- Modify: `backend/routes/search.py:76-80`

**Step 1: Update search endpoint to include drive_file_id**

```python
    results = []
    for idx in indices:
        chunk = chunks[idx]
        doc = chunk.document
        results.append({
            'title': doc.title,
            'text': chunk.text,
            'document_id': doc.id,
            'drive_file_id': doc.drive_file_id
        })
    
    return {'results': results}
```

**Step 2: Commit backend change**

```bash
git add backend/routes/search.py
git commit -m "feat: include drive_file_id in search results"
```

---

### Task 2: Frontend - Add Open in Google Docs to ResultCard

**Files:**
- Modify: `frontend/src/components/search/ResultCard.jsx`

**Step 1: Add ArrowTopRightOnSquareIcon import**

Update line 1:

```javascript
import { DocumentTextIcon, ClipboardDocumentIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
```

**Step 2: Add handleOpen function and Google Docs URL construction**

Add after the handleCopy function (around line 13):

```javascript
  const handleOpen = (e) => {
    e.stopPropagation();
    if (result.drive_file_id) {
      window.open(`https://docs.google.com/document/d/${result.drive_file_id}/edit`, '_blank', 'noopener,noreferrer');
    }
  };
```

**Step 3: Add Open button to the bottom-right section**

Replace the button section (lines 49-55) with:

```javascript
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          {result.drive_file_id && (
            <button
              onClick={handleOpen}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              title="Open in Google Docs"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            </button>
          )}
        </div>
```

**Step 4: Commit ResultCard changes**

```bash
git add frontend/src/components/search/ResultCard.jsx
git commit -m "feat: add open in google docs button to result card"
```

---

### Task 3: Frontend - Add Open in Google Docs to ResultModal

**Files:**
- Modify: `frontend/src/components/search/ResultModal.jsx`

**Step 1: Add ArrowTopRightOnSquareIcon import**

Update line 1:

```javascript
import { XMarkIcon, DocumentTextIcon, ClipboardDocumentIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
```

**Step 2: Add handleOpen function**

Add after the handleCopy function (around line 13):

```javascript
  const handleOpen = () => {
    if (result.drive_file_id) {
      window.open(`https://docs.google.com/document/d/${result.drive_file_id}/edit`, '_blank', 'noopener,noreferrer');
    }
  };
```

**Step 3: Add Open button to modal footer**

Replace the footer section (lines 55-69) with:

```javascript
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
            {copied ? 'Copied!' : 'Copy Text'}
          </button>
          {result.drive_file_id && (
            <button
              onClick={handleOpen}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
              title="Open in Google Docs"
            >
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              Open in Docs
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
```

**Step 4: Commit ResultModal changes**

```bash
git add frontend/src/components/search/ResultModal.jsx
git commit -m "feat: add open in google docs button to result modal"
```

---

### Task 4: Manual Testing

**Step 1: Start backend server**

```bash
cd backend
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
python app.py
```

**Step 2: Start frontend dev server**

```bash
cd frontend
npm run dev
```

**Step 3: Test the feature**

1. Open http://localhost:3000
2. Sign in with Google
3. Index your Drive (if not already indexed)
4. Perform a search
5. Verify "Open in Google Docs" icon appears on result cards
6. Click the icon - verify Google Docs opens in new tab with correct document
7. Click a result to open the modal
8. Verify "Open in Docs" button appears in modal footer
9. Click the button - verify it opens the same document

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete open in google docs feature"
```

---

## Summary

This plan adds the "Open in Google Docs" feature through 4 tasks:
1. Backend: Return `drive_file_id` in search API response
2. Frontend: Add icon button to ResultCard component
3. Frontend: Add button to ResultModal component
4. Manual testing to verify functionality

Total implementation time: ~15-20 minutes
