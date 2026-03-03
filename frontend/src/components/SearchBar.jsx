import { useState } from 'react';

export default function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(5);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query, topK);
  };

  return (
    <form onSubmit={handleSubmit} className="search-form">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search your documents..."
        className="search-input"
      />
      <div className="search-controls">
        <label>
          Results: {topK}
          <input
            type="range"
            min="1"
            max="20"
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
          />
        </label>
        <button type="submit">Search</button>
      </div>
    </form>
  );
}
