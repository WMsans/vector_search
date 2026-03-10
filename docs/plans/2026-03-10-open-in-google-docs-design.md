# Design: Open in Google Docs Feature

Date: 2026-03-10

## Overview

Add ability to open search results in their original Google Doc location in a new browser tab.

## Requirements

- Display "Open in Google Docs" option on search result cards
- Display same option in expanded result modal
- Open document in new browser tab
- Use compact icon button style (not full button with text)

## Architecture

### Backend

**Change to `/api/search` endpoint:**
- Include `drive_file_id` in each search result
- Field already stored in `Document` model, just needs to be added to response

```python
# routes/search.py - line 76-80
results.append({
    'title': doc.title,
    'text': chunk.text,
    'document_id': doc.id,
    'drive_file_id': doc.drive_file_id  # Add this line
})
```

### Frontend

**URL Construction:**
- Pattern: `https://docs.google.com/document/d/{drive_file_id}/edit`
- Frontend constructs URL from returned `drive_file_id`
- Opens with `target="_blank"` and `rel="noopener noreferrer"`

## Components

### ResultCard.jsx

**Location:** Bottom-right corner, next to Copy button

**Changes:**
- Import `ArrowTopRightOnSquareIcon` from `@heroicons/react/24/outline`
- Add icon button with same styling as Copy button
- Construct Google Docs URL from `result.drive_file_id`
- Add hover tooltip: "Open in Google Docs"

### ResultModal.jsx

**Location:** Footer, alongside "Copy Text" button

**Changes:**
- Import `ArrowTopRightOnSquareIcon`
- Add icon button with same styling as ResultCard
- Positioned before "Close" button
- Same tooltip as ResultCard

## Data Flow

1. User searches → `/api/search` returns results with `drive_file_id`
2. `ResultsList` passes result object to `ResultCard`
3. `ResultCard` extracts `drive_file_id` and constructs URL
4. On click, opens Google Docs in new tab
5. Same flow for `ResultModal` when user expands result

## Error Handling

### Missing drive_file_id

- Hide "Open in Google Docs" button if `drive_file_id` is null/undefined
- Handles edge cases: old indexed documents, data corruption

### Navigation Failures

- Browser handles `target="_blank"` failures naturally
- No additional error handling required

## Testing

### Manual Test Cases

1. Search for query that returns results
2. Verify "Open in Google Docs" icon appears on result cards
3. Click icon - verify Google Docs opens in new tab with correct document
4. Open result modal - verify icon appears and works
5. Test with multiple documents to ensure correct `drive_file_id` mapping

### Automated Testing

No automated tests needed - straightforward UI addition with standard link behavior.

## Implementation Approach

Backend returns `drive_file_id`, frontend constructs URL. This keeps backend focused on data and frontend on presentation, following existing patterns in the codebase.

## Files to Modify

1. `backend/routes/search.py` - Add `drive_file_id` to search response
2. `frontend/src/components/search/ResultCard.jsx` - Add icon button
3. `frontend/src/components/search/ResultModal.jsx` - Add icon button
