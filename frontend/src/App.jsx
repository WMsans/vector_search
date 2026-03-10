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
