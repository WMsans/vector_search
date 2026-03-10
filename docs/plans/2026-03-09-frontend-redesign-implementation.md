# Frontend Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the utilitarian vector search frontend into a polished dashboard with clear feedback, obvious app state, and professional results presentation.

**Architecture:** Reorganize React components into logical directories (layout/, search/, indexing/, common/), implement persistent sidebar + main content layout, add comprehensive loading states and feedback systems, and style everything with Tailwind CSS.

**Tech Stack:** React, Vite, Tailwind CSS, Heroicons

---

## Task 1: Install Tailwind CSS and Dependencies

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/postcss.config.js`
- Modify: `frontend/src/index.css`

**Step 1: Install Tailwind and dependencies**

Run:
```bash
cd frontend && npm install -D tailwindcss postcss autoprefixer && npm install @heroicons/react
```

Expected: Packages installed successfully

**Step 2: Initialize Tailwind**

Run:
```bash
cd frontend && npx tailwindcss init -p
```

Expected: `tailwind.config.js` and `postcss.config.js` created

**Step 3: Configure Tailwind**

Replace `frontend/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

**Step 4: Update index.css**

Replace `frontend/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
```

**Step 5: Test Tailwind is working**

Run:
```bash
cd frontend && npm run dev
```

Expected: Dev server starts, no errors

**Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/tailwind.config.js frontend/postcss.config.js frontend/src/index.css
git commit -m "chore: add Tailwind CSS configuration"
```

---

## Task 2: Create Common Components - Badge

**Files:**
- Create: `frontend/src/components/common/Badge.jsx`

**Step 1: Create Badge component**

Create `frontend/src/components/common/Badge.jsx`:

```jsx
export default function Badge({ children, variant = 'default', className = '' }) {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    primary: 'bg-blue-100 text-blue-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-amber-100 text-amber-800',
    error: 'bg-red-100 text-red-800',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/common/Badge.jsx
git commit -m "feat: add Badge component"
```

---

## Task 3: Create Common Components - Spinner

**Files:**
- Create: `frontend/src/components/common/Spinner.jsx`

**Step 1: Create Spinner component**

Create `frontend/src/components/common/Spinner.jsx`:

```jsx
export default function Spinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  return (
    <svg
      className={`animate-spin ${sizes[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/common/Spinner.jsx
git commit -m "feat: add Spinner component"
```

---

## Task 4: Create Common Components - Skeleton

**Files:**
- Create: `frontend/src/components/common/Skeleton.jsx`

**Step 1: Create Skeleton component**

Create `frontend/src/components/common/Skeleton.jsx`:

```jsx
export default function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

export function ResultCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex justify-between items-start mb-3">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-6 w-16" />
      </div>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6 mb-2" />
      <Skeleton className="h-4 w-4/6 mb-3" />
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/common/Skeleton.jsx
git commit -m "feat: add Skeleton component"
```

---

## Task 5: Create Common Components - Toast

**Files:**
- Create: `frontend/src/components/common/Toast.jsx`
- Create: `frontend/src/contexts/ToastContext.jsx`

**Step 1: Create ToastContext**

Create `frontend/src/contexts/ToastContext.jsx`:

```jsx
import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'error', duration = 5000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

function ToastContainer({ toasts, removeToast }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map(toast => (
        <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function Toast({ message, type, onClose }) {
  const types = {
    error: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div className={`px-4 py-3 rounded-lg border shadow-lg ${types[type]} flex items-center gap-3 min-w-80`}>
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button onClick={onClose} className="text-current opacity-50 hover:opacity-100">
        ✕
      </button>
    </div>
  );
}
```

**Step 2: Create index file for common components**

Create `frontend/src/components/common/index.js`:

```javascript
export { default as Badge } from './Badge';
export { default as Spinner } from './Spinner';
export { default as Skeleton, ResultCardSkeleton } from './Skeleton';
export { ToastProvider, useToast } from '../../contexts/ToastContext';
```

**Step 3: Commit**

```bash
git add frontend/src/components/common/ frontend/src/contexts/ToastContext.jsx
git commit -m "feat: add Toast notification system"
```

---

## Task 6: Create useAppState Hook

**Files:**
- Create: `frontend/src/hooks/useAppState.jsx`

**Step 1: Create useAppState hook**

Create `frontend/src/hooks/useAppState.jsx`:

```jsx
import { useState, useCallback } from 'react';

export const APP_STATES = {
  LOGIN: 'login',
  ONBOARDING: 'onboarding',
  READY: 'ready',
  INDEXING: 'indexing',
  SEARCHING: 'searching',
};

export default function useAppState() {
  const [appState, setAppState] = useState(APP_STATES.LOGIN);
  const [indexingStatus, setIndexingStatus] = useState(null);

  const startIndexing = useCallback(() => {
    setAppState(APP_STATES.INDEXING);
    setIndexingStatus({
      phase: 'scanning',
      message: 'Scanning Google Drive...',
      progress: 0,
      current: 0,
      total: 0,
    });
  }, []);

  const updateIndexingStatus = useCallback((status) => {
    setIndexingStatus(prev => ({ ...prev, ...status }));
  }, []);

  const finishIndexing = useCallback((documentCount) => {
    setIndexingStatus({
      phase: 'complete',
      message: 'Indexing complete!',
      progress: 100,
      documentCount,
    });
  }, []);

  const goToReady = useCallback(() => {
    setAppState(APP_STATES.READY);
    setIndexingStatus(null);
  }, []);

  const goToOnboarding = useCallback(() => {
    setAppState(APP_STATES.ONBOARDING);
  }, []);

  const startSearching = useCallback(() => {
    setAppState(APP_STATES.SEARCHING);
  }, []);

  const finishSearching = useCallback(() => {
    setAppState(APP_STATES.READY);
  }, []);

  return {
    appState,
    setAppState,
    indexingStatus,
    startIndexing,
    updateIndexingStatus,
    finishIndexing,
    goToReady,
    goToOnboarding,
    startSearching,
    finishSearching,
  };
}
```

**Step 2: Commit**

```bash
git add frontend/src/hooks/useAppState.jsx
git commit -m "feat: add useAppState hook for app state management"
```

---

## Task 7: Create Layout Components - Sidebar

**Files:**
- Create: `frontend/src/components/layout/Sidebar.jsx`

**Step 1: Create Sidebar component**

Create `frontend/src/components/layout/Sidebar.jsx`:

```jsx
import { useAuth } from '../../hooks/useAuth';
import { Badge } from '../common';
import { DocumentTextIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function Sidebar({ appState, documentCount, lastIndexed, onReindex }) {
  const { user, logout } = useAuth();

  const getStatusBadge = () => {
    if (appState === 'indexing') {
      return <Badge variant="warning">Indexing...</Badge>;
    }
    if (documentCount > 0) {
      return <Badge variant="success">Indexed ({documentCount} docs)</Badge>;
    }
    return <Badge variant="default">Not indexed</Badge>;
  };

  const formatLastIndexed = (timestamp) => {
    if (!timestamp) return 'Never';
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <DocumentTextIcon className="h-8 w-8 text-blue-600" />
          <h1 className="text-xl font-bold text-gray-900">Vector Search</h1>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1">
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Status
          </h3>
          {getStatusBadge()}
          {lastIndexed && (
            <p className="text-xs text-gray-500 mt-2">
              Last indexed: {formatLastIndexed(lastIndexed)}
            </p>
          )}
        </div>

        {documentCount > 0 && appState !== 'indexing' && (
          <div>
            <button
              onClick={onReindex}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Re-index Drive
            </button>
          </div>
        )}
      </div>

      <div className="p-6 border-t border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-sm font-medium text-blue-600">
              {user?.email?.[0]?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full text-sm text-gray-600 hover:text-gray-900 transition-colors text-left"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/layout/Sidebar.jsx
git commit -m "feat: add Sidebar component"
```

---

## Task 8: Create Layout Components - TopBar

**Files:**
- Create: `frontend/src/components/layout/TopBar.jsx`

**Step 1: Create TopBar component**

Create `frontend/src/components/layout/TopBar.jsx`:

```jsx
import { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Spinner } from '../common';

export default function TopBar({ onSearch, isSearching = false, disabled = false }) {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(5);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && !isSearching && !disabled) {
      onSearch(query.trim(), topK);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your documents..."
              disabled={disabled || isSearching}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Spinner size="sm" className="text-blue-600" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">
              Results:
            </label>
            <input
              type="range"
              min="1"
              max="20"
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              disabled={disabled || isSearching}
              className="w-24 disabled:opacity-50"
            />
            <span className="text-sm font-medium text-gray-900 w-6">{topK}</span>
          </div>
          <button
            type="submit"
            disabled={!query.trim() || isSearching || disabled}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Search
          </button>
        </div>
      </form>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/layout/TopBar.jsx
git commit -m "feat: add TopBar component with search"
```

---

## Task 9: Create Layout Components - Layout

**Files:**
- Create: `frontend/src/components/layout/Layout.jsx`

**Step 1: Create Layout component**

Create `frontend/src/components/layout/Layout.jsx`:

```jsx
import Sidebar from './Sidebar';

export default function Layout({ children, appState, documentCount, lastIndexed, onReindex }) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        appState={appState}
        documentCount={documentCount}
        lastIndexed={lastIndexed}
        onReindex={onReindex}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
```

**Step 2: Create index file**

Create `frontend/src/components/layout/index.js`:

```javascript
export { default as Layout } from './Layout';
export { default as Sidebar } from './Sidebar';
export { default as TopBar } from './TopBar';
```

**Step 3: Commit**

```bash
git add frontend/src/components/layout/
git commit -m "feat: add Layout wrapper component"
```

---

## Task 10: Create Login Component (Redesigned)

**Files:**
- Modify: `frontend/src/components/Login.jsx`

**Step 1: Update Login component**

Replace `frontend/src/components/Login.jsx`:

```jsx
import { useAuth } from '../hooks/useAuth';
import { DocumentTextIcon } from '@heroicons/react/24/outline';

export default function Login() {
  const { login } = useAuth();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <DocumentTextIcon className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Vector Search
          </h1>
          <p className="text-gray-600">
            Search your Google Drive documents with semantic search
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="text-gray-700 font-medium">Sign in with Google</span>
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center mt-6">
          Your documents stay private. We only read .docx files you choose to index.
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/Login.jsx
git commit -m "feat: redesign Login component with Tailwind"
```

---

## Task 11: Create Indexing Components - OnboardingPrompt

**Files:**
- Create: `frontend/src/components/indexing/OnboardingPrompt.jsx`

**Step 1: Create OnboardingPrompt component**

Create `frontend/src/components/indexing/OnboardingPrompt.jsx`:

```jsx
import { CloudArrowUpIcon, DocumentTextIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function OnboardingPrompt({ onIndex }) {
  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="max-w-lg text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
          <CloudArrowUpIcon className="h-10 w-10 text-blue-600" />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Welcome to Vector Search
        </h2>
        
        <p className="text-gray-600 mb-8">
          Get started by indexing your Google Drive documents. This will allow you to search through your .docx files using natural language.
        </p>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="p-4 bg-gray-50 rounded-lg">
            <DocumentTextIcon className="h-6 w-6 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">We scan your .docx files</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <CloudArrowUpIcon className="h-6 w-6 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Create semantic embeddings</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <MagnifyingGlassIcon className="h-6 w-6 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Enable smart search</p>
          </div>
        </div>

        <button
          onClick={onIndex}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Index My Drive
        </button>

        <p className="text-xs text-gray-500 mt-4">
          This may take a few minutes depending on the number of documents
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/indexing/OnboardingPrompt.jsx
git commit -m "feat: add OnboardingPrompt component"
```

---

## Task 12: Create Indexing Components - IndexProgress

**Files:**
- Create: `frontend/src/components/indexing/IndexProgress.jsx`

**Step 1: Create IndexProgress component**

Create `frontend/src/components/indexing/IndexProgress.jsx`:

```jsx
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { Spinner } from '../common';

export default function IndexProgress({ status, onComplete }) {
  const isComplete = status?.phase === 'complete';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        {isComplete ? (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Indexing Complete!
            </h3>
            <p className="text-gray-600 mb-6">
              Successfully indexed {status.documentCount} documents
            </p>
            <button
              onClick={onComplete}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Start Searching
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Indexing Your Drive
              </h3>
              <Spinner size="sm" className="text-blue-600" />
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>{status?.message || 'Preparing...'}</span>
                <span>{status?.progress || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${status?.progress || 0}%` }}
                />
              </div>
            </div>

            {status?.total > 0 && (
              <p className="text-sm text-gray-500 text-center">
                Processing file {status.current} of {status.total}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Create index file**

Create `frontend/src/components/indexing/index.js`:

```javascript
export { default as OnboardingPrompt } from './OnboardingPrompt';
export { default as IndexProgress } from './IndexProgress';
```

**Step 3: Commit**

```bash
git add frontend/src/components/indexing/
git commit -m "feat: add IndexProgress modal component"
```

---

## Task 13: Create Search Components - ResultCard

**Files:**
- Create: `frontend/src/components/search/ResultCard.jsx`

**Step 1: Create ResultCard component**

Create `frontend/src/components/search/ResultCard.jsx`:

```jsx
import { DocumentTextIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

export default function ResultCard({ result, rank, onClick }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = result.text.split(/\s+/).length;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
            {rank}
          </span>
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {result.title}
          </h3>
        </div>
        <span className="flex-shrink-0 ml-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
          95%
        </span>
      </div>

      <p className="text-gray-700 mb-4 line-clamp-3">
        {result.text}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <DocumentTextIcon className="h-4 w-4" />
            <span>Document chunk</span>
          </div>
          <span>•</span>
          <span>{wordCount} words</span>
        </div>
        
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ClipboardDocumentIcon className="h-4 w-4" />
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/search/ResultCard.jsx
git commit -m "feat: add ResultCard component"
```

---

## Task 14: Create Search Components - ResultModal

**Files:**
- Create: `frontend/src/components/search/ResultModal.jsx`

**Step 1: Create ResultModal component**

Create `frontend/src/components/search/ResultModal.jsx`:

```jsx
import { XMarkIcon, DocumentTextIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';

export default function ResultModal({ result, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!result) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = result.text.split(/\s+/).length;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 pr-8">
            {result.title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <DocumentTextIcon className="h-4 w-4" />
              <span>Document chunk</span>
            </div>
            <span>•</span>
            <span>{wordCount} words</span>
          </div>

          <div className="prose prose-gray max-w-none">
            <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
              {result.text}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ClipboardDocumentIcon className="h-4 w-4" />
            {copied ? 'Copied!' : 'Copy Text'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/search/ResultModal.jsx
git commit -m "feat: add ResultModal for expanded result view"
```

---

## Task 15: Create Search Components - ResultsList

**Files:**
- Modify: `frontend/src/components/ResultsList.jsx`

**Step 1: Update ResultsList component**

Replace `frontend/src/components/ResultsList.jsx`:

```jsx
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import ResultCard from './ResultCard';
import { ResultCardSkeleton } from '../common/Skeleton';

export default function ResultsList({ results, isLoading, onResultClick }) {
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
          Found {results.length} result{results.length !== 1 ? 's' : ''}
        </p>
        <p className="text-xs text-gray-500">Sorted by relevance</p>
      </div>
      <div className="space-y-4">
        {results.map((result, idx) => (
          <ResultCard
            key={idx}
            result={result}
            rank={idx + 1}
            onClick={() => onResultClick(result)}
          />
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Create index file**

Create `frontend/src/components/search/index.js`:

```javascript
export { default as ResultCard } from './ResultCard';
export { default as ResultModal } from './ResultModal';
export { default as ResultsList } from './ResultsList';
```

**Step 3: Commit**

```bash
git add frontend/src/components/search/
git commit -m "feat: redesign ResultsList with ResultCard components"
```

---

## Task 16: Update App.jsx with New Layout

**Files:**
- Modify: `frontend/src/App.jsx`

**Step 1: Update App.jsx**

Replace `frontend/src/App.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from './hooks/useAuth';
import useAppState, { APP_STATES } from './hooks/useAppState';
import { ToastProvider, useToast } from './components/common';
import { Layout, TopBar } from './components/layout';
import Login from './components/Login';
import { ResultsList, ResultModal } from './components/search';
import { OnboardingPrompt, IndexProgress } from './components/indexing';
import api from './services/api';

function Dashboard() {
  const { appState, indexingStatus, startIndexing, updateIndexingStatus, finishIndexing, goToReady, goToOnboarding, startSearching, finishSearching } = useAppState();
  const { addToast } = useToast();
  const [documentCount, setDocumentCount] = useState(0);
  const [lastIndexed, setLastIndexed] = useState(null);
  const [results, setResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);

  useEffect(() => {
    api.get('/api/status')
      .then(res => {
        setDocumentCount(res.data.document_count);
        if (res.data.indexed) {
          goToReady();
        } else {
          goToOnboarding();
        }
      })
      .catch(err => {
        console.error('Failed to check indexing status:', err);
        addToast('Failed to check indexing status', 'error');
      });
  }, []);

  const handleIndex = async () => {
    startIndexing();
    
    try {
      updateIndexingStatus({ phase: 'scanning', message: 'Scanning Google Drive...', progress: 10 });
      
      const res = await api.post('/api/index');
      
      finishIndexing(res.data.indexed_documents);
      setDocumentCount(res.data.indexed_documents);
      setLastIndexed(new Date().toISOString());
    } catch (err) {
      console.error('Indexing failed:', err);
      addToast('Failed to index documents. Please try again.', 'error');
      goToOnboarding();
    }
  };

  const handleReindex = () => {
    setResults(null);
    handleIndex();
  };

  const handleIndexingComplete = () => {
    goToReady();
  };

  const handleSearch = async (query, topK) => {
    setIsSearching(true);
    startSearching();
    setResults(null);

    try {
      const res = await api.post('/api/search', { query, top_k: topK });
      setResults(res.data.results);
    } catch (err) {
      console.error('Search failed:', err);
      addToast('Search failed. Please try again.', 'error');
      setResults([]);
    } finally {
      setIsSearching(false);
      finishSearching();
    }
  };

  return (
    <>
      <Layout
        appState={appState}
        documentCount={documentCount}
        lastIndexed={lastIndexed}
        onReindex={handleReindex}
      >
        {appState === APP_STATES.ONBOARDING && (
          <OnboardingPrompt onIndex={handleIndex} />
        )}

        {appState === APP_STATES.READY && (
          <>
            <TopBar
              onSearch={handleSearch}
              isSearching={isSearching}
              disabled={false}
            />
            <ResultsList
              results={results}
              isLoading={isSearching}
              onResultClick={setSelectedResult}
            />
          </>
        )}

        {appState === APP_STATES.SEARCHING && (
          <>
            <TopBar
              onSearch={handleSearch}
              isSearching={isSearching}
              disabled={false}
            />
            <ResultsList
              results={results}
              isLoading={isSearching}
              onResultClick={setSelectedResult}
            />
          </>
        )}
      </Layout>

      {appState === APP_STATES.INDEXING && (
        <IndexProgress
          status={indexingStatus}
          onComplete={handleIndexingComplete}
        />
      )}

      {selectedResult && (
        <ResultModal
          result={selectedResult}
          onClose={() => setSelectedResult(null)}
        />
      )}
    </>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return user ? <Dashboard /> : <Login />;
}

export default function AppWithProvider() {
  return (
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/App.jsx
git commit -m "feat: integrate new layout and components in App.jsx"
```

---

## Task 17: Clean Up Old Components

**Files:**
- Delete: `frontend/src/components/SearchBar.jsx`
- Delete: `frontend/src/components/IndexButton.jsx`
- Delete: `frontend/src/App.css`

**Step 1: Remove old components**

Run:
```bash
rm frontend/src/components/SearchBar.jsx frontend/src/components/IndexButton.jsx frontend/src/App.css
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove old component files"
```

---

## Task 18: Test the Application

**Step 1: Start the development server**

Run:
```bash
cd frontend && npm run dev
```

Expected: Server starts without errors at http://localhost:3000

**Step 2: Test login flow**
- Navigate to http://localhost:3000
- Verify login page displays correctly
- Click "Sign in with Google"
- Complete OAuth flow

**Step 3: Test onboarding flow**
- Verify onboarding prompt appears for new users
- Click "Index My Drive"
- Verify progress modal shows with updates
- Verify success state on completion

**Step 4: Test search flow**
- Verify search bar is visible
- Enter a search query
- Verify loading states appear
- Verify results display in cards
- Click a result to open modal
- Test copy functionality

**Step 5: Test sidebar**
- Verify user info displays
- Verify status badge updates
- Test re-index button
- Test logout

**Step 6: Test responsive design**
- Resize browser to mobile width
- Verify layout adjusts appropriately

---

## Success Criteria Checklist

After completing all tasks, verify:

- [ ] Tailwind CSS is configured and working
- [ ] All common components render correctly (Badge, Spinner, Skeleton, Toast)
- [ ] Layout displays with sidebar and main content area
- [ ] Login page is redesigned and functional
- [ ] Onboarding prompt shows for new users
- [ ] Indexing progress modal displays with live updates
- [ ] Search bar is always accessible in top bar
- [ ] Results display as professional cards with metadata
- [ ] Result modal opens on click with full text
- [ ] Copy functionality works on results
- [ ] Toast notifications appear for errors
- [ ] Sidebar shows app status and user info
- [ ] Re-index button works correctly
- [ ] All transitions and animations are smooth
- [ ] No console errors
- [ ] Application is responsive

---

## Implementation Notes

### Indexing Progress Simulation

The backend doesn't provide real-time progress updates. The current implementation shows a basic progress state. To get true progress updates, you would need to:

1. Use WebSockets or Server-Sent Events
2. Modify the backend to stream progress updates
3. Update the frontend to handle streaming responses

For now, the progress modal shows indeterminate progress during indexing.

### Relevance Scores

The backend returns results but doesn't include similarity scores. The current implementation shows a placeholder "95%" score. To show real scores:

1. Modify `backend/routes/search.py` to return similarity scores
2. Update `ResultCard.jsx` to display the actual score

### Google Drive Links

To add "Open in Google Drive" functionality:

1. Add `drive_file_id` to the search API response (backend/routes/search.py:78)
2. Add a button to ResultCard/ResultModal that opens the Google Docs URL

Both of these can be added later without major refactoring.

---

## Timeline

- Tasks 1-5 (Setup & Common Components): ~2 hours
- Tasks 6-9 (Hooks & Layout): ~2 hours
- Task 10-12 (Auth & Indexing): ~2 hours
- Task 13-15 (Search Components): ~2 hours
- Task 16-17 (Integration & Cleanup): ~1 hour
- Task 18 (Testing): ~1 hour

**Total: ~10 hours**
