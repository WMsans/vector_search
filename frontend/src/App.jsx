import { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from './hooks/useAuth';
import useAppState, { APP_STATES } from './hooks/useAppState';
import { ToastProvider, useToast } from './components/common';
import { Layout, TopBar } from './components/layout';
import Login from './components/Login';
import { ResultsList, ResultModal } from './components/search';
import { OnboardingPrompt, IndexProgress } from './components/indexing';
import { listFiles, downloadFile } from './services/drive';
import { extractText } from './services/fileExtractors';
import { getIndexStatus, deleteAllDocuments, saveDocument, saveChunks, getChunks, getDocuments, getIndexedFileIds, getPendingDocuments, getModifiedFiles, updateDocumentStatus, deleteDocument, saveFolderSelection, getFolderSelection } from './services/storage';
import { loadModel, embedChunks, embedQuery, search, isModelLoaded } from './services/embeddings';

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

async function determineIndexingPlan(googleId, driveFiles) {
  const indexedFileIds = await getIndexedFileIds(googleId);
  const pendingDocs = await getPendingDocuments(googleId);
  const modifiedFiles = await getModifiedFiles(googleId, driveFiles);
  
  const newFiles = driveFiles.filter(f => !indexedFileIds.has(f.id));
  
  const resumeFiles = pendingDocs.map(d => ({
    id: d.driveFileId,
    name: d.title,
    resume: true,
    docId: d.id,
    modifiedTime: d.driveModifiedTime,
  }));
  
  return {
    newFiles,
    modifiedFiles,
    resumeFiles,
    alreadyIndexed: driveFiles.filter(f => 
      indexedFileIds.has(f.id) && 
      !pendingDocs.some(p => p.driveFileId === f.id) &&
      !modifiedFiles.some(m => m.id === f.id)
    ),
  };
}

function Dashboard() {
  const { appState, indexingStatus, startIndexing, updateIndexingStatus, goToReady, goToOnboarding, startSearching, finishSearching } = useAppState();
  const { user, accessToken } = useAuth();
  const { addToast } = useToast();
  const [documentCount, setDocumentCount] = useState(0);
  const [lastIndexed, setLastIndexed] = useState(null);
  const [results, setResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [selectedTypes, setSelectedTypes] = useState(['docx', 'pdf', 'pptx', 'txt']);

  useEffect(() => {
    if (!user?.googleId) return;
    let mounted = true;

    getIndexStatus(user.googleId)
      .then(status => {
        if (!mounted) return;
        setDocumentCount(status.documentCount);
        setLastIndexed(status.lastIndexedAt);
        if (status.indexed) {
          goToReady();
        } else {
          goToOnboarding();
        }
      })
      .catch(err => {
        if (!mounted) return;
        console.error('Failed to check indexing status:', err);
        addToast('Failed to check indexing status', 'error');
      });

    return () => { mounted = false; };
  }, [user?.googleId, goToReady, goToOnboarding, addToast]);

  const handleIndex = async (selectedTypes = ['docx'], folderSelection = null, mode = 'full') => {
    startIndexing();
    setSelectedTypes(selectedTypes);

    try {
      if (!isModelLoaded()) {
        updateIndexingStatus({ phase: 'loading', message: 'Loading AI model...', progress: 0 });
        await loadModel((progress) => {
          if (progress.type === 'model-progress') {
            updateIndexingStatus({ progress: Math.round(progress.progress * 0.3), message: `Loading AI model... ${progress.progress}%` });
          }
        });
      }

      updateIndexingStatus({ phase: 'scanning', message: 'Scanning Google Drive...', progress: 30 });
      
      const folderIds = folderSelection?.selectedFolderIds?.length > 0 
        ? folderSelection.selectedFolderIds 
        : null;
      
      const files = await listFiles(accessToken, selectedTypes, folderIds);

      if (files.length === 0) {
        updateIndexingStatus({ phase: 'complete', message: 'No files found', progress: 100, documentCount: 0 });
        setDocumentCount(0);
        return;
      }

      if (folderSelection) {
        await saveFolderSelection(user.googleId, folderSelection);
      }

      const plan = await determineIndexingPlan(user.googleId, files);

      if (mode === 'prompt' && (plan.resumeFiles.length > 0 || plan.newFiles.length > 0 || plan.modifiedFiles.length > 0)) {
        updateIndexingStatus({
          phase: 'prompt',
          message: 'Choose indexing mode',
          progress: 35,
          plan,
        });
        return;
      }

      await executeIndexing(files, plan, mode);
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

  const executeIndexing = async (files, plan, mode) => {
    let workQueue = [];
    
    if (mode === 'resume') {
      workQueue = [...plan.resumeFiles, ...plan.newFiles, ...plan.modifiedFiles];
    } else {
      await deleteAllDocuments(user.googleId);
      workQueue = files;
    }

    if (workQueue.length === 0) {
      updateIndexingStatus({
        phase: 'complete',
        message: 'All files already indexed',
        progress: 100,
        documentCount: plan.alreadyIndexed.length,
      });
      return;
    }

    let skipped = 0;
    for (let i = 0; i < workQueue.length; i++) {
      const file = workQueue[i];
      const progressBase = 30 + (i / workQueue.length) * 65;
      updateIndexingStatus({
        phase: 'processing',
        message: `Processing: ${file.name}`,
        progress: Math.round(progressBase),
        current: i + 1,
        total: workQueue.length,
      });

      try {
        let docId = file.docId;
        
        if (!docId) {
          docId = await saveDocument({
            googleId: user.googleId,
            driveFileId: file.id,
            title: file.name,
            fileType: file.name.split('.').pop()?.toLowerCase() || 'unknown',
            indexedAt: new Date(),
            driveModifiedTime: file.modifiedTime,
            status: 'pending',
          });
        }

        const arrayBuffer = await downloadFile(accessToken, file.id);
        const text = await extractText(arrayBuffer, file.name);
        
        if (!text || text.trim().length === 0) {
          await deleteDocument(docId);
          skipped++;
          continue;
        }

        const textChunks = chunkText(text);
        const embeddings = await embedChunks(textChunks);

        const chunkRecords = textChunks.map((chunkText, idx) => ({
          documentId: docId,
          googleId: user.googleId,
          text: chunkText,
          embedding: embeddings[idx].buffer,
        }));
        await saveChunks(chunkRecords);

        await updateDocumentStatus(docId, 'completed', file.modifiedTime);
      } catch (err) {
        console.error(`Failed to process ${file.name}:`, err);
        if (err.status === 401) {
          addToast('Session expired. Please sign in again.', 'error');
          goToOnboarding();
          return;
        }
        skipped++;
      }
    }

    const indexedCount = workQueue.length - skipped;
    const totalCount = mode === 'resume' 
      ? plan.alreadyIndexed.length + indexedCount 
      : indexedCount;
    
    setDocumentCount(totalCount);
    setLastIndexed(new Date().toISOString());
    updateIndexingStatus({
      phase: 'complete',
      message: 'Indexing complete!',
      progress: 100,
      documentCount: totalCount,
    });

    if (skipped > 0) {
      addToast(`Skipped ${skipped} file(s) that could not be processed.`, 'warning');
    }
  };

  const handleReindex = async () => {
    setResults(null);
    try {
      const savedSelection = await getFolderSelection(user.googleId);
      handleIndex(['docx', 'pdf', 'pptx', 'txt'], savedSelection, 'prompt');
    } catch {
      handleIndex(['docx', 'pdf', 'pptx', 'txt'], null, 'prompt');
    }
  };

  const handleIndexingComplete = () => {
    goToReady();
  };

  const handleSearch = async (query, topK) => {
    setIsSearching(true);
    startSearching();
    setResults(null);
    setSelectedResult(null);

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
        onEditFolders={goToOnboarding}
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
          onIndex={handleIndex}
          selectedTypes={selectedTypes}
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
