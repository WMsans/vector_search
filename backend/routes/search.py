from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from models import db, Document, Chunk
from services.vector_search import vector_search
from services.drive import DriveService
import torch
import numpy as np

search_bp = Blueprint('search', __name__)

@search_bp.route('/status', methods=['GET'])
@login_required
def status():
    doc_count = Document.query.filter_by(user_id=current_user.id).count()
    return {'indexed': doc_count > 0, 'document_count': doc_count}

@search_bp.route('/index', methods=['POST'])
@login_required
def index_files():
    drive = DriveService(current_user.access_token, current_user.refresh_token)
    files = drive.list_docx_files()
    
    Document.query.filter_by(user_id=current_user.id).delete()
    Chunk.query.filter(Document.user_id == current_user.id).delete()
    db.session.commit()
    
    indexed_count = 0
    for file in files:
        try:
            text = drive.download_and_extract_text(file['id'])
            if not text:
                continue
            
            doc = Document(user_id=current_user.id, drive_file_id=file['id'], title=file['name'])
            db.session.add(doc)
            db.session.flush()
            
            chunks = vector_search.simple_text_chunker(text)
            embeddings = vector_search.embed_chunks(chunks)
            
            for i, chunk_text in enumerate(chunks):
                chunk = Chunk(document_id=doc.id, text=chunk_text)
                chunk.embedding = embeddings[i].cpu().numpy().tobytes()
                db.session.add(chunk)
            
            indexed_count += 1
        except Exception as e:
            print(f"Error indexing {file['name']}: {e}")
            continue
    
    db.session.commit()
    return {'indexed_documents': indexed_count}

@search_bp.route('/search', methods=['POST'])
@login_required
def search():
    data = request.get_json()
    query = data.get('query', '')
    top_k = data.get('top_k', 5)
    
    chunks = Chunk.query.join(Document).filter(Document.user_id == current_user.id).all()
    if not chunks:
        return {'results': []}
    
    chunk_embeddings = torch.stack([
        torch.from_numpy(np.frombuffer(c.embedding, dtype=np.float32)) 
        for c in chunks
    ])
    
    query_embedding = vector_search.embed_query(query)
    indices = vector_search.search(query_embedding, chunk_embeddings, top_k)
    
    results = []
    for idx in indices:
        chunk = chunks[idx]
        doc = chunk.document
        results.append({
            'title': doc.title,
            'text': chunk.text,
            'document_id': doc.id
        })
    
    return {'results': results}

@search_bp.route('/documents', methods=['GET'])
@login_required
def list_documents():
    docs = Document.query.filter_by(user_id=current_user.id).all()
    return {'documents': [{'id': d.id, 'title': d.title, 'indexed_at': d.indexed_at.isoformat()} for d in docs]}
