# Folder Browser Search Bar Design

## Overview

Add a search bar above the file browser to search across the entire Google Drive and select files/folders for indexing.

## Approach

Use Google Drive API's native `name contains 'query'` search. This provides complete results across all of Drive, not just loaded items.

## Architecture

### New Components

**SearchBar.jsx**
- Text input with search icon
- Debounced search (300ms)
- Results dropdown (max 200px, scrollable)
- States: empty, loading, results, no results, error
- Clear button (X) to reset search

**drive.js - searchDrive()**
```js
export async function searchDrive(accessToken, query, extensions = ['docx']) {
  const mimeTypes = getMimeTypes(extensions);
  const folderMime = "mimeType='application/vnd.google-apps.folder'";
  const mimeQuery = mimeTypes.map(m => `mimeType='${m}'`).join(' or ');
  const searchQuery = `(${folderMime} or ${mimeQuery}) and trashed=false and name contains '${query}'`;
  const fields = 'files(id,name,mimeType)';
  const url = `${DRIVE_API}/files?q=${encodeURIComponent(searchQuery)}&fields=${encodeURIComponent(fields)}&pageSize=50`;
  const res = await fetchWithAuth(url, accessToken);
  return res.json();
}
```

### Modified Components

**FolderBrowser.jsx**
- Import and render SearchBar above "Select all/Deselect all" row
- Pass handleToggle to SearchBar for result selection
- Clear search state after selection

## Data Flow

1. User types → debounce 300ms
2. Call `searchDrive(accessToken, query, extensions)`
3. Display results in dropdown
4. User clicks result → `handleToggle(item)` → clear search

## UI/UX

- Search bar: positioned above action row, placeholder "Search Drive..."
- Dropdown: shows file/folder names, scrollable
- Clear on selection or manual X click

## Error Handling

- API error → "Search failed" message
- Empty query → no search, clear results
- No results → "No files found" message

## Testing

Framework: Vitest + React Testing Library

**Test cases:**
1. Renders search input above tree
2. Calls searchDrive after debounce
3. Displays search results in dropdown
4. Selects file and clears search on click
5. Shows no results message when empty
6. Shows error message on API failure
7. Does not search on empty input

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/indexing/SearchBar.jsx` | Create |
| `src/services/drive.js` | Add searchDrive() |
| `src/components/indexing/FolderBrowser.jsx` | Integrate SearchBar |
| `src/components/indexing/SearchBar.test.jsx` | Create |
