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
