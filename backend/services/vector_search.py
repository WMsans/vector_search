import torch
from sentence_transformers import SentenceTransformer
from typing import List

class VectorSearchSystem:
    def __init__(self, model_name: str = 'intfloat/e5-base-v2'):
        self.model = SentenceTransformer(model_name)
    
    def simple_text_chunker(self, text: str, chunk_size: int = 50, overlap: int = 5) -> List[str]:
        words = text.split()
        chunks = []
        for i in range(0, len(words), chunk_size - overlap):
            chunk = " ".join(words[i:i + chunk_size])
            chunks.append(chunk)
        return chunks
    
    def embed_chunks(self, chunks: List[str]) -> torch.Tensor:
        return self.model.encode(chunks, convert_to_tensor=True, show_progress_bar=False)
    
    def embed_query(self, query: str) -> torch.Tensor:
        return self.model.encode([query], prompt_name="query", convert_to_tensor=True, show_progress_bar=False)
    
    def search(self, query_embedding: torch.Tensor, chunk_embeddings: torch.Tensor, top_k: int = 3) -> tuple:
        similarities = self.model.similarity(query_embedding, chunk_embeddings)[0]
        top_k_indices = similarities.argsort(descending=True)[:top_k]
        top_k_scores = [similarities[i].item() for i in top_k_indices]
        return top_k_indices.tolist(), top_k_scores

vector_search = VectorSearchSystem()
