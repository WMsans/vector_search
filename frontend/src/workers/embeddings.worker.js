import { pipeline, env } from '@xenova/transformers';

env.allowLocalModels = false;

let extractor = null;

async function loadModel(requestId) {
  extractor = await pipeline('feature-extraction', 'Xenova/e5-base-v2', {
    progress_callback: (progress) => {
      if (progress.status === 'progress') {
        self.postMessage({
          type: 'model-progress',
          progress: Math.round(progress.progress),
          requestId,
        });
      }
    },
  });
  self.postMessage({ type: 'model-loaded', requestId });
}

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

self.onmessage = async (e) => {
  const { type, requestId } = e.data;

  if (type === 'load-model') {
    try {
      await loadModel(requestId);
    } catch (err) {
      self.postMessage({ type: 'error', message: `Failed to load model: ${err.message}`, requestId });
    }
    return;
  }

  if (type === 'embed-chunks') {
    const { chunks } = e.data;
    try {
      const embeddings = [];
      for (let i = 0; i < chunks.length; i++) {
        const input = `passage: ${chunks[i]}`;
        const output = await extractor(input, { pooling: 'mean', normalize: true });
        embeddings.push(new Float32Array(output.data));
        self.postMessage({ type: 'chunk-progress', current: i + 1, total: chunks.length, requestId });
      }
      self.postMessage({ type: 'chunks-embedded', embeddings, requestId });
    } catch (err) {
      self.postMessage({ type: 'error', message: `Embedding failed: ${err.message}`, requestId });
    }
    return;
  }

  if (type === 'embed-query') {
    const { query } = e.data;
    try {
      const input = `query: ${query}`;
      const output = await extractor(input, { pooling: 'mean', normalize: true });
      self.postMessage({ type: 'query-embedded', embedding: new Float32Array(output.data), requestId });
    } catch (err) {
      self.postMessage({ type: 'error', message: `Query embedding failed: ${err.message}`, requestId });
    }
    return;
  }

  if (type === 'search') {
    const { queryEmbedding, chunkEmbeddings, topK } = e.data;
    const scores = chunkEmbeddings.map((emb, index) => ({
      index,
      score: cosineSimilarity(queryEmbedding, emb),
    }));
    scores.sort((a, b) => b.score - a.score);
    self.postMessage({ type: 'search-results', results: scores.slice(0, topK), requestId });
    return;
  }
};
