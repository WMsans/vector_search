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
    <div className="px-6 py-4 border-b" style={{ backgroundColor: 'var(--theme-bg-2)', borderColor: 'rgba(128,128,128,0.2)' }}>
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
        <div className="flex gap-4 items-center">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5" style={{ color: 'var(--theme-text)', opacity: 0.4 }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your documents..."
              disabled={disabled || isSearching}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--theme-bg-1)',
                borderColor: 'rgba(128,128,128,0.3)',
                color: 'var(--theme-text)',
              }}
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Spinner size="sm" style={{ color: 'var(--theme-accent)' }} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm" style={{ color: 'var(--theme-text)', opacity: 0.7 }}>
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
              style={{ accentColor: 'var(--theme-accent)' }}
            />
            <span className="text-sm font-medium w-6" style={{ color: 'var(--theme-text)' }}>{topK}</span>
          </div>
          <button
            type="submit"
            disabled={!query.trim() || isSearching || disabled}
            className="px-4 py-2 text-white rounded-lg font-medium disabled:cursor-not-allowed transition-colors"
            style={{
              backgroundColor: 'var(--theme-accent)',
              opacity: (!query.trim() || isSearching || disabled) ? 0.5 : 1,
            }}
          >
            Search
          </button>
        </div>
      </form>
    </div>
  );
}
