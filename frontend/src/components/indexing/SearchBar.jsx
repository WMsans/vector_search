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
