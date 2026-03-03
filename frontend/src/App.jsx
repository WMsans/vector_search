import { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from './hooks/useAuth';
import Login from './components/Login';
import SearchBar from './components/SearchBar';
import ResultsList from './components/ResultsList';
import IndexButton from './components/IndexButton';
import api from './services/api';

function Dashboard() {
  const { user, logout } = useAuth();
  const [hasIndexed, setHasIndexed] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    api.get('/api/status')
      .then(res => setHasIndexed(res.data.indexed))
      .catch(err => {
        console.error('Failed to check indexing status:', err);
      });
  }, []);

  const handleSearch = async (query, topK) => {
    try {
      const res = await api.post('/api/search', { query, top_k: topK });
      setResults(res.data.results);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    }
  };

  const handleIndexed = (count) => {
    setHasIndexed(true);
    alert(`Indexed ${count} documents`);
  };

  return (
    <div className="dashboard">
      <header>
        <h1>Vector Search</h1>
        <div className="user-info">
          <span>{user.email}</span>
          <button onClick={logout}>Logout</button>
        </div>
      </header>
      
      <main>
        {!hasIndexed && <IndexButton onIndexed={handleIndexed} />}
        {hasIndexed && (
          <>
            <SearchBar onSearch={handleSearch} />
            <button onClick={() => setHasIndexed(false)} className="reindex-btn">
              Re-index Drive
            </button>
            {results && <ResultsList results={results} />}
          </>
        )}
      </main>
    </div>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  return user ? <Dashboard /> : <Login />;
}

export default function AppWithProvider() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}
