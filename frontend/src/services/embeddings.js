let worker = null;
let modelLoaded = false;
let modelLoading = false;
let pendingRequests = new Map();
let requestId = 0;
let modelLoadPromise = null;

function getWorker() {
  if (!worker) {
    worker = new Worker(
      new URL('../workers/embeddings.worker.js', import.meta.url),
      { type: 'module' }
    );
    worker.onmessage = handleMessage;
    worker.onerror = (err) => {
      console.error('Worker error:', err);
      pendingRequests.forEach(({ reject }) => reject(new Error('Worker crashed')));
      pendingRequests.clear();
    };
  }
  return worker;
}

function handleMessage(e) {
  const { type, requestId: rid } = e.data;

  if (type === 'model-progress' || type === 'chunk-progress') {
    const request = pendingRequests.get(rid);
    if (request?.onProgress) {
      request.onProgress(e.data);
    }
    return;
  }

  if (type === 'error') {
    const request = pendingRequests.get(rid);
    if (request) {
      request.reject(new Error(e.data.message));
      pendingRequests.delete(rid);
    }
    return;
  }

  if (type === 'model-loaded') {
    modelLoaded = true;
    modelLoading = false;
    const request = pendingRequests.get(rid);
    if (request) {
      request.resolve();
      pendingRequests.delete(rid);
    }
    modelLoadPromise = null;
    return;
  }

  if (type === 'chunks-embedded') {
    const request = pendingRequests.get(rid);
    if (request) {
      request.resolve(e.data.embeddings);
      pendingRequests.delete(rid);
    }
    return;
  }

  if (type === 'query-embedded') {
    const request = pendingRequests.get(rid);
    if (request) {
      request.resolve(e.data.embedding);
      pendingRequests.delete(rid);
    }
    return;
  }

  if (type === 'search-results') {
    const request = pendingRequests.get(rid);
    if (request) {
      request.resolve(e.data.results);
      pendingRequests.delete(rid);
    }
    return;
  }
}

export async function loadModel(onProgress) {
  if (modelLoaded) return;
  if (modelLoading && modelLoadPromise) {
    return modelLoadPromise;
  }

  modelLoading = true;
  const w = getWorker();
  const rid = ++requestId;

  modelLoadPromise = new Promise((resolve, reject) => {
    pendingRequests.set(rid, { resolve, reject, onProgress });
    w.postMessage({ type: 'load-model', requestId: rid });
  });

  return modelLoadPromise;
}

export async function embedChunks(chunks, onProgress) {
  if (!modelLoaded) {
    await loadModel();
  }

  const w = getWorker();
  const rid = ++requestId;

  return new Promise((resolve, reject) => {
    pendingRequests.set(rid, { resolve, reject, onProgress });
    w.postMessage({ type: 'embed-chunks', chunks, requestId: rid });
  });
}

export async function embedQuery(query) {
  if (!modelLoaded) {
    await loadModel();
  }

  const w = getWorker();
  const rid = ++requestId;

  return new Promise((resolve, reject) => {
    pendingRequests.set(rid, { resolve, reject });
    w.postMessage({ type: 'embed-query', query, requestId: rid });
  });
}

export async function search(queryEmbedding, chunkEmbeddings, topK) {
  const w = getWorker();
  const rid = ++requestId;

  return new Promise((resolve, reject) => {
    pendingRequests.set(rid, { resolve, reject });
    w.postMessage({ type: 'search', queryEmbedding, chunkEmbeddings, topK, requestId: rid });
  });
}

export function isModelLoaded() {
  return modelLoaded;
}
