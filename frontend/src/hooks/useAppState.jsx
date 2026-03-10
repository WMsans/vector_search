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
