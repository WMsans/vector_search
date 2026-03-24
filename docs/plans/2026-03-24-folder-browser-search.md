# Folder Browser Search Bar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a search bar to the folder browser that searches Google Drive and allows selecting files/folders for indexing.

**Architecture:** SearchBar component calls Drive API's `name contains` query, displays results in dropdown. Clicking a result adds to selection and clears search.

**Tech Stack:** React, Google Drive API, Vitest, React Testing Library

---

### Task 1: Set up testing framework

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.js`
- Create: `frontend/src/setupTests.js`

**Step 1: Install testing dependencies**

Run:
```bash
cd frontend && npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Expected: Dependencies added to package.json

**Step 2: Create vitest config**

Create `frontend/vitest.config.js`:
```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    globals: true,
  },
});
```

**Step 3: Create setup file**

Create `frontend/src/setupTests.js`:
```js
import '@testing-library/jest-dom';
```

**Step 4: Add test script to package.json**

Add to `frontend/package.json` scripts:
```json
"test": "vitest",
"test:run": "vitest run"
```

**Step 5: Verify setup**

Run:
```bash
cd frontend && npm test
```
Expected: Vitest starts (no tests found yet is OK)

**Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.js frontend/src/setupTests.js
git commit -m "chore: set up vitest and react testing library"
```

---

### Task 2: Add searchDrive function to drive service

**Files:**
- Modify: `frontend/src/services/drive.js`
- Create: `frontend/src/services/drive.test.js`

**Step 1: Write the failing test**

Create `frontend/src/services/drive.test.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchDrive } from './drive';

global.fetch = vi.fn();

describe('searchDrive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls Drive API with name contains query', async () => {
    const mockResponse = { files: [{ id: '1', name: 'test.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }] };
    fetch.mockResolvedValueOnce({ ok: true, json: async () => mockResponse });

    const result = await searchDrive('test-token', 'test', ['docx']);

    expect(fetch).toHaveBeenCalledTimes(1);
    const url = fetch.mock.calls[0][0];
    expect(url).toContain('name contains');
    expect(url).toContain('test');
    expect(result).toEqual(mockResponse);
  });

  it('throws on API error', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(searchDrive('token', 'query', ['docx'])).rejects.toThrow('API request failed');
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd frontend && npm run test:run -- src/services/drive.test.js
```
Expected: FAIL - searchDrive is not exported

**Step 3: Write the implementation**

Add to `frontend/src/services/drive.js`:
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

**Step 4: Run test to verify it passes**

Run:
```bash
cd frontend && npm run test:run -- src/services/drive.test.js
```
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/services/drive.js frontend/src/services/drive.test.js
git commit -m "feat: add searchDrive function to drive service"
```

---

### Task 3: Create SearchBar component

**Files:**
- Create: `frontend/src/components/indexing/SearchBar.jsx`
- Create: `frontend/src/components/indexing/SearchBar.test.jsx`

**Step 1: Write the failing test**

Create `frontend/src/components/indexing/SearchBar.test.jsx`:
```js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SearchBar from './SearchBar';

vi.mock('../../services/drive', () => ({
  searchDrive: vi.fn(),
}));

import { searchDrive } from '../../services/drive';

describe('SearchBar', () => {
  const defaultProps = {
    accessToken: 'test-token',
    extensions: ['docx'],
    onSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders search input', () => {
    render(<SearchBar {...defaultProps} />);
    expect(screen.getByPlaceholderText(/search drive/i)).toBeInTheDocument();
  });

  it('calls searchDrive after debounce', async () => {
    searchDrive.mockResolvedValueOnce({ files: [] });
    
    render(<SearchBar {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText(/search drive/i), { target: { value: 'test' } });
    
    vi.advanceTimersByTime(300);
    
    await waitFor(() => expect(searchDrive).toHaveBeenCalledWith('test-token', 'test', ['docx']));
  });

  it('displays search results', async () => {
    const mockFile = { id: '1', name: 'report.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
    searchDrive.mockResolvedValueOnce({ files: [mockFile] });
    
    render(<SearchBar {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText(/search drive/i), { target: { value: 'report' } });
    vi.advanceTimersByTime(300);
    
    await waitFor(() => expect(screen.getByText('report.docx')).toBeInTheDocument());
  });

  it('calls onSelect and clears search on result click', async () => {
    const mockFile = { id: '1', name: 'report.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
    searchDrive.mockResolvedValueOnce({ files: [mockFile] });
    const onSelect = vi.fn();
    
    render(<SearchBar {...defaultProps} onSelect={onSelect} />);
    fireEvent.change(screen.getByPlaceholderText(/search drive/i), { target: { value: 'report' } });
    vi.advanceTimersByTime(300);
    
    await waitFor(() => expect(screen.getByText('report.docx')).toBeInTheDocument());
    fireEvent.click(screen.getByText('report.docx'));
    
    expect(onSelect).toHaveBeenCalledWith(mockFile);
    expect(screen.getByPlaceholderText(/search drive/i).value).toBe('');
  });

  it('shows no results message', async () => {
    searchDrive.mockResolvedValueOnce({ files: [] });
    
    render(<SearchBar {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText(/search drive/i), { target: { value: 'xyz' } });
    vi.advanceTimersByTime(300);
    
    await waitFor(() => expect(screen.getByText(/no files found/i)).toBeInTheDocument());
  });

  it('shows error message on API failure', async () => {
    searchDrive.mockRejectedValueOnce(new Error('API error'));
    
    render(<SearchBar {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText(/search drive/i), { target: { value: 'test' } });
    vi.advanceTimersByTime(300);
    
    await waitFor(() => expect(screen.getByText(/search failed/i)).toBeInTheDocument());
  });

  it('does not search on empty input', async () => {
    render(<SearchBar {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText(/search drive/i), { target: { value: '' } });
    vi.advanceTimersByTime(300);
    
    expect(searchDrive).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run:
```bash
cd frontend && npm run test:run -- src/components/indexing/SearchBar.test.jsx
```
Expected: FAIL - module not found

**Step 3: Write the implementation**

Create `frontend/src/components/indexing/SearchBar.jsx`:
```js
import { useState, useCallback, useRef, useEffect } from 'react';
import { searchDrive } from '../../services/drive';
import { Spinner } from '../common';

export default function SearchBar({ accessToken, extensions, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  const doSearch = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await searchDrive(accessToken, searchQuery, extensions);
      setResults(data.files || []);
    } catch (err) {
      setError('Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, extensions]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      doSearch(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, doSearch]);

  const handleSelect = (item) => {
    onSelect(item);
    setQuery('');
    setResults([]);
    setError(null);
  };

  const showDropdown = query.trim() && (loading || error || results.length > 0 || (!loading && query.trim()));

  return (
    <div className="relative mb-3">
      <input
        type="text"
        placeholder="Search Drive..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full px-3 py-2 text-sm rounded-lg border"
        style={{
          backgroundColor: 'var(--theme-bg)',
          borderColor: 'rgba(128,128,128,0.3)',
          color: 'var(--theme-text)',
        }}
      />
      {showDropdown && (
        <div
          className="absolute z-10 w-full mt-1 rounded-lg border max-h-52 overflow-auto"
          style={{
            backgroundColor: 'var(--theme-bg)',
            borderColor: 'rgba(128,128,128,0.3)',
          }}
        >
          {loading && (
            <div className="flex items-center justify-center py-3 gap-2" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
              <Spinner size="sm" />
              <span>Searching...</span>
            </div>
          )}
          {error && (
            <div className="px-3 py-2 text-sm" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
              {error}
            </div>
          )}
          {!loading && !error && results.length === 0 && query.trim() && (
            <div className="px-3 py-2 text-sm" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
              No files found
            </div>
          )}
          {!loading && !error && results.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              className="w-full px-3 py-2 text-sm text-left hover:opacity-80"
              style={{ color: 'var(--theme-text)' }}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
cd frontend && npm run test:run -- src/components/indexing/SearchBar.test.jsx
```
Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/components/indexing/SearchBar.jsx frontend/src/components/indexing/SearchBar.test.jsx
git commit -m "feat: add SearchBar component with debounce and dropdown"
```

---

### Task 4: Integrate SearchBar into FolderBrowser

**Files:**
- Modify: `frontend/src/components/indexing/FolderBrowser.jsx`

**Step 1: Import SearchBar**

Add to imports in `frontend/src/components/indexing/FolderBrowser.jsx`:
```js
import SearchBar from './SearchBar';
```

**Step 2: Add SearchBar to render**

In the return statement, add SearchBar after the header and before the "Select all" buttons. Find the section around line 268-275 and modify:

```jsx
return (
  <div className="flex flex-col h-full">
    <div className="mb-4">
      <h3 className="text-lg font-semibold" style={{ color: 'var(--theme-text)' }}>Select folders to index</h3>
      <p className="text-sm" style={{ color: 'var(--theme-text)', opacity: 0.6 }}>Choose which folders and files to include in your search index</p>
    </div>
    
    <SearchBar
      accessToken={accessToken}
      extensions={extensions}
      onSelect={handleToggle}
    />
    
    <div className="flex gap-2 mb-3">
```

**Step 3: Run tests to verify integration**

Run:
```bash
cd frontend && npm run test:run
```
Expected: All tests PASS

**Step 4: Commit**

```bash
git add frontend/src/components/indexing/FolderBrowser.jsx
git commit -m "feat: integrate SearchBar into FolderBrowser"
```

---

### Task 5: Final verification

**Step 1: Run all tests**

Run:
```bash
cd frontend && npm run test:run
```
Expected: All tests PASS

**Step 2: Run lint**

Run:
```bash
cd frontend && npm run lint
```
Expected: No errors

**Step 3: Manual test (optional)**

Run:
```bash
cd frontend && npm run dev
```
Open the app, navigate to folder browser, test search functionality.

**Step 4: Final commit (if any fixes needed)**

```bash
git add -A && git commit -m "fix: any remaining issues"
```
