# Collapse Search Results by File

## Problem

Large documents (1000+ pages) produce many matching chunks that flood the search results screen, making it hard to browse results from different files.

## Solution

Group search results by source file. Each file shows as a collapsible card with:
- File header with title, match count, and best score
- Top 2 matching chunks previewed inline
- "Show X more" button to expand and see all chunks

## Design

### Data Transformation

Group flat results array by `drive_file_id` (or `title` as fallback) in `ResultsList.jsx`:

```javascript
const groupedResults = results.reduce((groups, result) => {
  const key = result.drive_file_id || result.title;
  if (!groups[key]) {
    groups[key] = { 
      driveFileId: key,
      title: result.title,
      chunks: [] 
    };
  }
  groups[key].chunks.push(result);
  return groups;
}, {});

const sortedGroups = Object.values(groupedResults).sort((a, b) => 
  b.chunks[0].score - a.chunks[0].score
);
```

Groups sorted by best chunk score. Chunks within each group sorted by score.

### Component Structure

**FileGroupCard.jsx** - new component:
- Header: file title, match count badge, best score
- Preview: top 2 chunks (sorted by score)
- "Show X more" button (if chunks > 2)
- Expandable section with remaining chunks
- Local `isExpanded` state (default: false)

**ChunkPreview.jsx** - new component:
- Compact chunk display extracted from ResultCard
- Props: chunk data, onClick handler
- Shows: score badge, truncated text (2-3 lines), word count, copy/open buttons
- No rank number

### UI Design

**Collapsed:**
- File title header (bold, larger)
- Badge: "X matches" + best score %
- 2 chunk previews
- "Show X more" button

**Expanded:**
- Same header
- All chunks visible
- "Show less" button

### Edge Cases

- No `drive_file_id`: group by `title`
- Single chunk: show without expand button
- Empty results: existing handling unchanged
- Loading state: existing handling unchanged

## Files Changed

| File | Change |
|------|--------|
| `ResultsList.jsx` | Add grouping logic, render FileGroupCard |
| `search/FileGroupCard.jsx` | New - header, preview, expand/collapse |
| `search/ChunkPreview.jsx` | New - compact chunk display |
