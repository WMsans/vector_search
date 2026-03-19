let worker = null;
let modelLoaded = false;
let pendingCallbacks = {};
let callbackId = 0;

function getWorker() {
  if (!worker) {
    worker = new Worker(
      new URL('../workers/embeddings.worker.js', import.meta.url),
      { type: 'module' }
    );
    worker.onmessage = handleMessage;
    worker.onerror = (err) => {
      console.error('Worker error:', err);
      Object.values(pendingCallbacks).forEach(({ reject }) =>
        reject(new Error('Worker crashed'))
      );
      pendingCallbacks = {};
    };
  }
  return worker;
}

function handleMessage(e) {
  const { type } = e.data;

  if (type === 'model-progress' || type === 'chunk-progress') {
    if (pendingCallbacks._progressListener) {
      pendingCallbacks._progressListener(e.data);
    }
    return;
  }

  if (type === 'error') {
    const keys = Object.keys(pendingCallbacks).filter(k => !k.startsWith('_'));
    if (keys.length > 0) {
      const key = keys[0];
      pendingCallbacks[key].reject(new Error(e.data.message));
      delete pendingCallbacks[key];
    }
    return;
  }

  if (type === 'model-loaded') {
    modelLoaded = true;
    if (pendingCallbacks._loadModel) {
      pendingCallbacks._loadModel.resolve();
      delete pendingCallbacks._loadModel;
    }
    return;
  }

  if (type === 'chunks-embedded') {
    if (pendingCallbacks._embedChunks) {
      pendingCallbacks._embedChunks.resolve(e.data.embeddings);
      delete pendingCallbacks._embedChunks;
    }
    return;
  }

  if (type === 'query-embedded') {
    if (pendingCallbacks._embedQuery) {
      pendingCallbacks._embedQuery.resolve(e.data.embedding);
      delete pendingCallbacks._embedQuery;
    }
    return;
  }

  if (type === 'search-results') {
    if (pendingCallbacks._search) {
      pendingCallbacks._search.resolve(e.data.results);
      delete pendingCallbacks._search;
    }
    return;
  }
}

export async function loadModel(onProgress) {
  if (modelLoaded) return;
  const w = getWorker();
  if (onProgress) {
    pendingCallbacks._progressListener = onProgress;
  }
  return new Promise((resolve, reject) => {
    pendingCallbacks._loadModel = { resolve, reject };
    w.postMessage({ type: 'load-model' });
  });
}

export async function embedChunks(chunks, onProgress) {
  const w = getWorker();
  if (onProgress) {
    pendingCallbacks._progressListener = onProgress;
  }
  return new Promise((resolve, reject) => {
    pendingCallbacks._embedChunks = { resolve, reject };
    w.postMessage({ type: 'embed-chunks', chunks });
  });
}

export async function embedQuery(query) {
  const w = getWorker();
  return new Promise((resolve, reject) => {
    pendingCallbacks._embedQuery = { resolve, reject };
    w.postMessage({ type: 'embed-query', query });
  });
}

export async function search(queryEmbedding, chunkEmbeddings, topK) {
  const w = getWorker();
  return new Promise((resolve, reject) => {
    pendingCallbacks._search = { resolve, reject };
    w.postMessage({ type: 'search', queryEmbedding, chunkEmbeddings, topK });
  });
}

export function isModelLoaded() {
  return modelLoaded;
}
