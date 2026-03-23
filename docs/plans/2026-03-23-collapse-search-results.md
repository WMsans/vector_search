# Collapse Search Results by File Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Group search results by source file with collapsible previews to reduce screen flooding from large documents.

**Architecture:** Add grouping logic to ResultsList, create FileGroupCard for collapsed/expanded file display, and extract ChunkPreview for compact chunk rendering.

**Tech Stack:** React, Heroicons, Tailwind CSS

---

### Task 1: Create ChunkPreview Component

**Files:**
- Create: `frontend/src/components/search/ChunkPreview.jsx`

**Step 1: Create ChunkPreview component**

```jsx
import { ClipboardDocumentIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

export default function ChunkPreview({ chunk, onClick }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(chunk.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpen = (e) => {
    e.stopPropagation();
    if (chunk.drive_file_id) {
      window.open(`https://docs.google.com/document/d/${chunk.drive_file_id}/edit`, '_blank', 'noopener,noreferrer');
    }
  };

  const wordCount = chunk.text.split(/\s+/).length;

  return (
    <div
      onClick={onClick}
      className="rounded-lg border p-4 hover:shadow-sm transition-all cursor-pointer"
      style={{ 
        backgroundColor: 'var(--theme-bg-1)', 
        borderColor: 'rgba(128,128,128,0.15)',
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <p className="text-sm line-clamp-2 flex-1" style={{ color: 'var(--theme-text)', opacity: 0.85 }}>
          {chunk.text}
        </p>
        <span className="flex-shrink-0 ml-2 px-2 py-0.5 text-xs font-medium rounded-full relative" style={{ color: 'var(--theme-accent)' }}>
          <span className="absolute inset-0 rounded-full" style={{ backgroundColor: 'var(--theme-accent)', opacity: 0.15 }}></span>
          <span className="relative">{chunk.score}%</span>
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--theme-text)', opacity: 0.5 }}>
          {wordCount} words
        </span>
        
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs transition-colors"
            style={{ color: 'var(--theme-text)', opacity: 0.5 }}
          >
            <ClipboardDocumentIcon className="h-3.5 w-3.5" />
            {copied ? 'Copied' : 'Copy'}
          </button>
          {chunk.drive_file_id && (
            <button
              onClick={handleOpen}
              className="flex items-center gap-1 text-xs transition-colors"
              style={{ color: 'var(--theme-text)', opacity: 0.5 }}
              title="Open in Google Docs"
            >
              <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify file creates successfully**

Run: `ls frontend/src/components/search/ChunkPreview.jsx`
Expected: File exists

**Step 3: Commit**

```bash
git add frontend/src/components/search/ChunkPreview.jsx
git commit -m "feat: add ChunkPreview component for compact chunk display"
```

---

### Task 2: Create FileGroupCard Component

**Files:**
- Create: `frontend/src/components/search/FileGroupCard.jsx`

**Step 1: Create FileGroupCard component**

```jsx
import { DocumentTextIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import ChunkPreview from './ChunkPreview';

const PREVIEW_COUNT = 2;

export default function FileGroupCard({ group, onChunkClick }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const sortedChunks = [...group.chunks].sort((a, b) => b.score - a.score);
  const bestScore = sortedChunks[0].score;
  const totalChunks = sortedChunks.length;
  const previewChunks = sortedChunks.slice(0, PREVIEW_COUNT);
  const remainingChunks = sortedChunks.slice(PREVIEW_COUNT);
  const hasMore = remainingChunks.length > 0;

  return (
    <div className="rounded-lg border mb-4" style={{ borderColor: 'rgba(128,128,128,0.2)' }}>
      <div className="p-4 border-b" style={{ borderColor: 'rgba(128,128,128,0.15)', backgroundColor: 'var(--theme-bg-2)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <DocumentTextIcon className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--theme-accent)' }} />
            <h3 className="text-lg font-semibold truncate" style={{ color: 'var(--theme-text)' }}>
              {group.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="px-2 py-1 text-xs font-medium rounded-full relative" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
              {totalChunks} {totalChunks === 1 ? 'match' : 'matches'}
            </span>
            <span className="px-2 py-1 text-xs font-medium rounded-full relative" style={{ color: 'var(--theme-accent)' }}>
              <span className="absolute inset-0 rounded-full" style={{ backgroundColor: 'var(--theme-accent)', opacity: 0.15 }}></span>
              <span className="relative">{bestScore}%</span>
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3" style={{ backgroundColor: 'var(--theme-bg-1)' }}>
        {previewChunks.map((chunk, idx) => (
          <ChunkPreview
            key={idx}
            chunk={chunk}
            onClick={() => onChunkClick(chunk)}
          />
        ))}

        {hasMore && !isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-1 text-sm font-medium transition-colors mx-auto"
            style={{ color: 'var(--theme-accent)' }}
          >
            <ChevronDownIcon className="h-4 w-4" />
            Show {remainingChunks.length} more
          </button>
        )}

        {isExpanded && remainingChunks.map((chunk, idx) => (
          <ChunkPreview
            key={idx}
            chunk={chunk}
            onClick={() => onChunkClick(chunk)}
          />
        ))}

        {isExpanded && hasMore && (
          <button
            onClick={() => setIsExpanded(false)}
            className="flex items-center gap-1 text-sm font-medium transition-colors mx-auto"
            style={{ color: 'var(--theme-accent)' }}
          >
            <ChevronUpIcon className="h-4 w-4" />
            Show less
          </button>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify file creates successfully**

Run: `ls frontend/src/components/search/FileGroupCard.jsx`
Expected: File exists

**Step 3: Commit**

```bash
git add frontend/src/components/search/FileGroupCard.jsx
git commit -m "feat: add FileGroupCard component with expand/collapse"
```

---

### Task 3: Update ResultsList to Group Results

**Files:**
- Modify: `frontend/src/components/ResultsList.jsx`

**Step 1: Update ResultsList with grouping logic**

Replace the entire content of `frontend/src/components/ResultsList.jsx`:

```jsx
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useMemo } from 'react';
import FileGroupCard from './search/FileGroupCard';
import { ResultCardSkeleton } from './common/Skeleton';

export default function ResultsList({ results, isLoading, onResultClick }) {
  const groupedResults = useMemo(() => {
    if (!results) return [];

    const groups = results.reduce((acc, result) => {
      const key = result.drive_file_id || result.title;
      if (!acc[key]) {
        acc[key] = {
          driveFileId: key,
          title: result.title,
          chunks: [],
        };
      }
      acc[key].chunks.push(result);
      return acc;
    }, {});

    return Object.values(groups).sort((a, b) => {
      const aBestScore = Math.max(...a.chunks.map(c => c.score));
      const bBestScore = Math.max(...b.chunks.map(c => c.score));
      return bBestScore - aBestScore;
    });
  }, [results]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(5)].map((_, i) => (
          <ResultCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!results) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <MagnifyingGlassIcon className="h-12 w-12 mb-4 text-gray-300" />
        <p className="text-lg font-medium">Search your documents</p>
        <p className="text-sm">Enter a query above to get started</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <MagnifyingGlassIcon className="h-12 w-12 mb-4 text-gray-300" />
        <p className="text-lg font-medium">No results found</p>
        <p className="text-sm">Try different keywords or broader terms</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          Found {results.length} result{results.length !== 1 ? 's' : ''} in {groupedResults.length} file{groupedResults.length !== 1 ? 's' : ''}
        </p>
        <p className="text-xs text-gray-500">Sorted by relevance</p>
      </div>
      <div>
        {groupedResults.map((group, idx) => (
          <FileGroupCard
            key={group.driveFileId || idx}
            group={group}
            onChunkClick={onResultClick}
          />
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Verify changes**

Run: `cd frontend && npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add frontend/src/components/ResultsList.jsx
git commit -m "feat: group search results by file in ResultsList"
```

---

### Task 4: Update Search Index Exports

**Files:**
- Modify: `frontend/src/components/search/index.js`

**Step 1: Add new component exports**

Add exports for the new components:

```javascript
export { default as ResultCard } from './ResultCard';
export { default as ResultModal } from './ResultModal';
export { default as FileGroupCard } from './FileGroupCard';
export { default as ChunkPreview } from './ChunkPreview';
```

**Step 2: Commit**

```bash
git add frontend/src/components/search/index.js
git commit -m "feat: export FileGroupCard and ChunkPreview components"
```

---

### Task 5: Manual Testing

**Step 1: Start the development server**

Run: `cd frontend && npm run dev`

**Step 2: Test scenarios**

1. Search for a query that matches multiple chunks in a single file
   - Expected: File appears as a group with top 2 chunks visible
   - Expected: "Show X more" button appears if more than 2 chunks
2. Click "Show X more"
   - Expected: Remaining chunks appear inline
   - Expected: Button changes to "Show less"
3. Click "Show less"
   - Expected: Chunks collapse back to preview state
4. Search for a query matching chunks across multiple files
   - Expected: Files sorted by best chunk score
5. Click on a chunk
   - Expected: Modal opens with chunk details (existing behavior)

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: any issues found during testing"
```
