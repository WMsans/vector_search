import { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from './hooks/useAuth';
import useAppState, { APP_STATES } from './hooks/useAppState';
import { ToastProvider, useToast } from './components/common';
import { Layout, TopBar } from './components/layout';
import Login from './components/Login';
import { ResultsList, ResultModal } from './components/search';
import { OnboardingPrompt, IndexProgress } from './components/indexing';
import { listDocxFiles, downloadFile } from './services/drive';
import { getIndexStatus, deleteAllDocuments, saveDocument, saveChunks, getChunks, getDocuments } from './services/storage';
import { loadModel, embedChunks, embedQuery, search, isModelLoaded } from './services/embeddings';
import mammoth from 'mammoth';

function chunkText(text, chunkSize = 50, overlap = 5) {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const chunks = [];
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words.slice(i, i + chunkSize).join(' ');
    if (chunk.length > 0) chunks.push(chunk);
    if (i + chunkSize >= words.length) break;
  }
  return chunks.length > 0 ? chunks : [text];
}

function Dashboard() {
  const { appState, indexingStatus, startIndexing, updateIndexingStatus, finishIndexing, goToReady, goToOnboarding, startSearching, finishSearching } = useAppState();
  const { user, accessToken } = useAuth();
  const { addToast } = useToast();
  const [documentCount, setDocumentCount] = useState(0);
  const [lastIndexed, setLastIndexed] = useState(null);
  const [results, setResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);

  useEffect(() => {
    if (!user?.googleId) return;
    getIndexStatus(user.googleId)
      .then(status => {
        setDocumentCount(status.documentCount);
        setLastIndexed(status.lastIndexedAt);
        if (status.indexed) {
          goToReady();
        } else {
          goToOnboarding();
        }
      })
      .catch(err => {
        console.error('Failed to check indexing status:', err);
        addToast('Failed to check indexing status', 'error');
      });
  }, [user?.googleId]);

  const handleIndex = async () => {
    startIndexing();

    try {
      // Phase 1: Load model if needed
      if (!isModelLoaded()) {
        updateIndexingStatus({ phase: 'loading', message: 'Loading AI model...', progress: 0 });
        await loadModel((progress) => {
          if (progress.type === 'model-progress') {
            updateIndexingStatus({ progress: Math.round(progress.progress * 0.3), message: `Loading AI model... ${progress.progress}%` });
          }
        });
      }

      // Phase 2: Scan Drive
      updateIndexingStatus({ phase: 'scanning', message: 'Scanning Google Drive...', progress: 30 });
      const files = await listDocxFiles(accessToken);

      if (files.length === 0) {
        updateIndexingStatus({ phase: 'complete', message: 'No .docx files found', progress: 100, documentCount: 0 });
        setDocumentCount(0);
        return;
      }

      // Phase 3: Delete existing data
      await deleteAllDocuments(user.googleId);

      // Phase 4: Process each file
      let skipped = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const progressBase = 30 + (i / files.length) * 65;
        updateIndexingStatus({
          phase: 'processing',
          message: `Processing: ${file.name}`,
          progress: Math.round(progressBase),
          current: i + 1,
          total: files.length,
        });

        try {
          // Download .docx
          const arrayBuffer = await downloadFile(accessToken, file.id);

          // Parse with mammoth
          const { value: text } = await mammoth.extractRawText({ arrayBuffer });
          if (!text || text.trim().length === 0) {
            skipped++;
            continue;
          }

          // Chunk text
          const chunks = chunkText(text);

          // Embed chunks
          const embeddings = await embedChunks(chunks);

          // Save to IndexedDB
          const docId = await saveDocument({
            googleId: user.googleId,
            driveFileId: file.id,
            title: file.name,
            indexedAt: new Date(),
          });

          const chunkRecords = chunks.map((chunkText, idx) => ({
            documentId: docId,
            googleId: user.googleId,
            text: chunkText,
            embedding: embeddings[idx].buffer,
          }));
          await saveChunks(chunkRecords);
        } catch (err) {
          console.error(`Failed to process ${file.name}:`, err);
          if (err.status === 401) {
            addToast('Session expired. Please sign in again.', 'error');
            return;
          }
          skipped++;
        }
      }

      // Phase 5: Complete
      const indexedCount = files.length - skipped;
      setDocumentCount(indexedCount);
      setLastIndexed(new Date().toISOString());
      updateIndexingStatus({
        phase: 'complete',
        message: 'Indexing complete!',
        progress: 100,
        documentCount: indexedCount,
      });

      if (skipped > 0) {
        addToast(`Skipped ${skipped} file(s) that could not be processed.`, 'warning');
      }
    } catch (err) {
      console.error('Indexing failed:', err);
      if (err.status === 401) {
        addToast('Session expired. Please sign in again.', 'error');
      } else {
        addToast('Failed to index documents. Please try again.', 'error');
      }
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
      // Load model if not loaded
      if (!isModelLoaded()) {
        await loadModel();
      }

      // Get all chunks from IndexedDB
      const allChunks = await getChunks(user.googleId);
      if (allChunks.length === 0) {
        setResults([]);
        return;
      }

      // Embed query
      const queryEmb = await embedQuery(query);

      // Reconstruct embeddings from stored ArrayBuffers
      const chunkEmbeddings = allChunks.map(c => new Float32Array(c.embedding));

      // Search
      const searchResults = await search(queryEmb, chunkEmbeddings, topK);

      // Build result objects (need document info)
      const docs = await getDocuments(user.googleId);
      const docMap = Object.fromEntries(docs.map(d => [d.id, d]));

      const formattedResults = searchResults.map(r => {
        const chunk = allChunks[r.index];
        const doc = docMap[chunk.documentId];
        return {
          title: doc?.title || 'Unknown',
          text: chunk.text,
          score: Math.round(r.score * 100),
          drive_file_id: doc?.driveFileId || null,
        };
      });

      setResults(formattedResults);
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

        {(appState === APP_STATES.READY || appState === APP_STATES.SEARCHING) && (
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
