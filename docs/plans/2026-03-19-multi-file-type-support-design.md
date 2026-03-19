# Multi-File-Type Support Design

**Date:** 2026-03-19  
**Status:** Approved

## Summary

Extend vector search to support PDF, PPTX, and TXT files in addition to the existing DOCX support. Users can select which file types to index via checkboxes in the onboarding UI.

## Architecture

### New Module: `src/services/fileExtractors.js`

Registry-based module mapping file extensions to extractor functions:

```
fileExtractors.js
├── EXTRACTORS registry (ext → { extract, mimeType })
├── extractText(arrayBuffer, filename) → text
├── getSupportedExtensions() → ['docx', 'pdf', 'pptx', 'txt']
└── getMimeTypes(extensions[]) → mime type query for Drive API
```

### Extractor Implementations

| Type | Library | Approach |
|------|---------|----------|
| docx | mammoth (existing) | No changes |
| pdf | pdfjs-dist | Extract text page by page |
| pptx | Built-in APIs | DecompressionStream + XML parsing |
| txt | TextDecoder | Simple arrayBuffer decode |

### File Changes

- `drive.js`: Rename `listDocxFiles` → `listFiles(accessToken, extensions[])`
- `App.jsx`: Add file type selector, dispatch to `extractText()`
- `OnboardingPrompt.jsx`: Add file type checkboxes
- `storage.js`: Add `fileType` field to documents table

## Data Flow

1. User selects file types from checkboxes (default: all checked)
2. `listFiles(accessToken, selectedExtensions)` queries Drive API with combined mime types
3. For each file:
   - Download as arrayBuffer
   - `extractText(arrayBuffer, filename)` dispatches to correct extractor
   - Chunk and embed
   - Store with `fileType` field

## Component Changes

### OnboardingPrompt.jsx

- Add 4 checkboxes: DOCX, PDF, PPTX, TXT
- All checked by default
- Pass selected types to `onIndex(selectedTypes)`

### App.jsx

- `handleIndex` receives selected file types
- Use generic `listFiles()` instead of `listDocxFiles()`
- Replace mammoth with `extractText(arrayBuffer, file.name)`
- Store `fileType` in document record

### drive.js

```javascript
export async function listFiles(accessToken, extensions, maxResults = 1000) {
  const mimeTypes = getMimeTypes(extensions);
  const query = `(${mimeTypes.map(m => `mimeType='${m}'`).join(' or ')}) and trashed=false`;
  // ... rest of query
}
```

### fileExtractors.js (new)

```javascript
const EXTRACTORS = {
  docx: { 
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extract: docxExtract 
  },
  pdf:  { 
    mimeType: 'application/pdf', 
    extract: pdfExtract 
  },
  pptx: { 
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    extract: pptxExtract 
  },
  txt:  { 
    mimeType: 'text/plain', 
    extract: txtExtract 
  },
};

export function extractText(arrayBuffer, filename) {
  const ext = filename.split('.').pop().toLowerCase();
  return EXTRACTORS[ext]?.extract(arrayBuffer) ?? '';
}

export function getSupportedExtensions() {
  return Object.keys(EXTRACTORS);
}

export function getMimeTypes(extensions) {
  return extensions.map(ext => EXTRACTORS[ext]?.mimeType).filter(Boolean);
}
```

## Error Handling

- **Extraction failures**: Catch and skip file, increment skipped count
- **Empty extraction**: Skip files with no extractable text
- **Unsupported types**: Return empty string, file is skipped
- **Password-protected PDFs**: Skip with console log
- **Malformed files**: Skip, log to console

Show toast at indexing completion: "Skipped N file(s) that could not be processed"

## Dependencies

- `pdfjs-dist` - PDF parsing (~500KB gzipped)

## Testing

- Manual testing with sample files of each type
- Edge cases: empty files, corrupted files, password-protected PDFs
- Verify search results include all indexed file types
