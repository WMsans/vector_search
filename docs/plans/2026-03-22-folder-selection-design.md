# Folder Selection for Indexing - Design Document

**Date:** 2026-03-22
**Status:** Approved

## Overview

Allow users to select specific folders and files to index instead of indexing their entire Google Drive. This provides more control over which documents are searchable and reduces indexing time for users with large drives.

## Requirements

- Select both folders and individual files
- Tree browser UI for navigation
- Include-only model (explicit selection required)
- Selection persisted across sessions
- Auto-include new files added to selected folders

## User Flow

### Initial Onboarding

1. **Folder Selection** - User browses folder tree, checks folders/files to include
2. **File Type Selection** - User selects which file types to index (existing)
3. **Indexing** - Process only selected folders/files

### Re-indexing

- User can edit folder selection from sidebar
- Returns to folder selection step with previous selection pre-populated
- New files in selected folders are auto-included

## Components

### New Components

**`FolderBrowser.jsx`**
- Tree view with expandable folders
- Checkboxes for selection
- Lazy-loads folder contents on expand
- "Select All" / "Deselect All" buttons
- Loading states

**`FolderTreeItem.jsx`**
- Individual folder/file row
- Expand/collapse for folders
- Checkbox for selection
- Indeterminate state for partial folder selection

### Modified Components

**`OnboardingPrompt.jsx`**
- Convert to multi-step wizard
- Step 1: Folder selection
- Step 2: File type selection (existing)
- Step indicator at top
- Back button to return to previous step

**`Sidebar.jsx`**
- Add "Edit folder selection" link below "Re-index" button
- Opens folder selection modal or navigates to step 1

## Google Drive API

### New Functions in `drive.js`

```javascript
// List root-level folders and files
listRootItems(accessToken, extensions)

// List contents of a specific folder (paginated)
listFolderContents(accessToken, folderId, extensions, pageToken)

// Get full path for breadcrumb display (optional enhancement)
getFilePath(accessToken, fileId)
```

### Modified `listFiles` Function

```javascript
listFiles(accessToken, extensions, folderIds = null)
```

- When `folderIds` provided: search only within those folders using `'folderId' in parents` query
- When `null`: search entire drive (backward compatible)

### API Considerations

- Use `fields=files(id,name,mimeType,modifiedTime)` for minimal data transfer
- Lazy-load folder contents on expand (not all at once)
- Support pagination for large folders (100 items per page)
- Use `supportsAllDrives=true` for shared drive support

## Data Storage

### New IndexedDB Store: `folderSelection`

```javascript
{
  id: 'user-googleId',
  selectedFolderIds: ['folder-id-1', 'folder-id-2'],
  selectedFileIds: ['file-id-1'],
  updatedAt: '2026-03-22T10:00:00Z'
}
```

### New Functions in `storage.js`

```javascript
saveFolderSelection(googleId, selection)
getFolderSelection(googleId)
clearFolderSelection(googleId)
```

### Backward Compatibility

- If no selection exists, behave as before (index entire drive)
- No migration needed - feature is optional

## UI Design

### FolderBrowser Component

- Header: "Select folders to index" with subtitle explaining the feature
- Tree view:
  - Folder icons for expandable items
  - File icons for non-expandable items
  - Checkboxes with indeterminate state for partial selection
- Footer: "Select All" / "Deselect All" buttons
- Loading spinner while fetching contents

### OnboardingPrompt Redesign

- Step indicator: "1. Select Folders" → "2. Select File Types"
- Step 1: FolderBrowser with "Continue" button (disabled if nothing selected)
- Step 2: Existing file type selection with "Index Selected Items" button
- Back button on step 2 to return to folder selection

### Sidebar Addition

- "Edit folder selection" link under "Re-index" button
- Shows current selection count
- Opens folder selection in modal or navigates to onboarding

## Error Handling

### Error Scenarios

| Scenario | Handling |
|----------|----------|
| Folder not found (deleted/moved) | Show warning toast, allow removal from selection |
| Permission denied | Skip folder, show toast notification |
| API rate limit | Retry with exponential backoff, show progress |
| Network error | Show retry button, cache loaded folders |

### Edge Cases

- **Empty selection:** Disable "Continue" button, show helper text
- **Shared drives:** Support via `supportsAllDrives=true` parameter
- **Deep folder nesting:** Virtual scrolling for performance
- **Large number of folders:** Add search/filter functionality (future enhancement)

### Re-indexing Behavior

- New files in selected folders → Auto-include
- Deleted files → Skip gracefully
- Moved folders → May appear in new location or be skipped

## Testing Strategy

### Unit Tests

- `listFolderContents()` pagination handling
- Folder selection state management
- IndexedDB operations for folder selection
- Tree expansion/collapse logic

### Integration Tests

- Folder selection flow end-to-end
- Re-indexing with existing selection
- Selection persistence across sessions
- File type filtering with folder selection

### Manual Testing Scenarios

- Various folder structures (flat, deep, shared drives)
- Large folders (1000+ items)
- Network interruption during browsing
- Permission scenarios (owned vs shared)
- Empty folders
- Nested shared folders

## Implementation Scope

### New Code

- 5 new functions in `drive.js`
- 3 new functions in `storage.js`
- 2 new components (`FolderBrowser.jsx`, `FolderTreeItem.jsx`)
- 1 new IndexedDB store migration

### Modified Code

- `OnboardingPrompt.jsx` - wizard conversion
- `Sidebar.jsx` - edit selection link
- `App.jsx` - integration with indexing flow
- `storage.js` - new store and functions
- `drive.js` - new functions and modified `listFiles`

## Future Enhancements

- Search within folder tree
- Folder path breadcrumbs
- Bulk selection by search query
- Exclude patterns (e.g., exclude "Archive" folders)
- Shared drive quick-select
