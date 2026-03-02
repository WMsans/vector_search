# Vector Search Webapp Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a local webapp that authenticates users with Google, indexes their Drive .docx files, and provides vector similarity search.

**Architecture:** Flask backend with SQLite for persistence, React SPA frontend. Google OAuth for authentication. sentence-transformers (e5-base-v2) for embeddings. VectorSearchSystem ported from existing notebook.

**Tech Stack:** Flask, SQLAlchemy, sentence-transformers, python-docx, React, Vite, Axios, Google OAuth 2.0

---

## Task 1: Backend Project Setup

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/app.py`
- Create: `backend/config.py`

**Step 1: Create backend directory and requirements**

```bash
mkdir -p backend
```

Create `backend/requirements.txt`:
```
flask==3.0.0
flask-sqlalchemy==3.1.1
flask-login==0.6.3
google-auth==2.25.2
google-auth-oauthlib==1.2.0
google-auth-httplib2==0.2.0
google-api-python-client==2.108.0
sentence-transformers==2.2.2
python-docx==1.1.0
torch==2.1.0
numpy==1.26.2
requests==2.31.0
```

**Step 2: Create minimal Flask app**

Create `backend/app.py`:
```python
from flask import Flask

app = Flask(__name__)

@app.route('/health')
def health():
    return {'status': 'ok'}

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

**Step 3: Create config file**

Create `backend/config.py`:
```python
import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'sqlite:///../data/vector_search.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
    GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')
```

**Step 4: Test the setup**

Run:
```bash
cd backend && python app.py
```

Expected: Flask server starts on port 5000

**Step 5: Commit**

```bash
git add backend/
git commit -m "feat: initialize Flask backend structure"
```

---

## Task 2: Database Models

**Files:**
- Create: `backend/models/__init__.py`
- Create: `backend/models/database.py`
- Modify: `backend/app.py`

**Step 1: Create models directory**

```bash
mkdir -p backend/models
```

**Step 2: Write database models**

Create `backend/models/database.py`:
```python
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    google_id = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    access_token = db.Column(db.Text)
    refresh_token = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    documents = db.relationship('Document', backref='user', lazy=True, cascade='all, delete-orphan')

class Document(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    drive_file_id = db.Column(db.String(100), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    indexed_at = db.Column(db.DateTime, default=datetime.utcnow)
    chunks = db.relationship('Chunk', backref='document', lazy=True, cascade='all, delete-orphan')

class Chunk(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('document.id'), nullable=False)
    text = db.Column(db.Text, nullable=False)
    embedding = db.Column(db.LargeBinary)
```

Create `backend/models/__init__.py`:
```python
from .database import db, User, Document, Chunk
```

**Step 3: Update app.py to use database**

Update `backend/app.py`:
```python
from flask import Flask
from config import Config
from models import db

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

with app.app_context():
    db.create_all()

@app.route('/health')
def health():
    return {'status': 'ok'}

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

**Step 4: Test database creation**

Run:
```bash
mkdir -p data
cd backend && python app.py
```

Expected: Creates `data/vector_search.db`, server starts

**Step 5: Commit**

```bash
git add backend/models/ backend/app.py data/
git commit -m "feat: add SQLAlchemy database models"
```

---

## Task 3: Google OAuth Authentication

**Files:**
- Create: `backend/routes/__init__.py`
- Create: `backend/routes/auth.py`
- Modify: `backend/app.py`

**Step 1: Create routes directory**

```bash
mkdir -p backend/routes
```

**Step 2: Write auth routes**

Create `backend/routes/auth.py`:
```python
from flask import Blueprint, redirect, request, jsonify, current_app, session
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from models import db, User
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
import os

os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

auth_bp = Blueprint('auth', __name__)
login_manager = LoginManager()

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@auth_bp.route('/google')
def google_auth():
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": current_app.config['GOOGLE_CLIENT_ID'],
                "client_secret": current_app.config['GOOGLE_CLIENT_SECRET'],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile', 'openid']
    )
    flow.redirect_uri = request.host_url.rstrip('/') + '/auth/callback'
    authorization_url, state = flow.authorization_url(access_type='offline', include_granted_scopes='true', prompt='consent')
    session['state'] = state
    return redirect(authorization_url)

@auth_bp.route('/callback')
def callback():
    state = session.get('state')
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": current_app.config['GOOGLE_CLIENT_ID'],
                "client_secret": current_app.config['GOOGLE_CLIENT_SECRET'],
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=['https://www.googleapis.com/auth/drive.readonly', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile', 'openid'],
        state=state
    )
    flow.redirect_uri = request.host_url.rstrip('/') + '/auth/callback'
    flow.fetch_token(authorization_response=request.url)
    credentials = flow.credentials
    
    oauth2_service = build('oauth2', 'v2', credentials=credentials)
    user_info = oauth2_service.userinfo().get().execute()
    
    google_id = user_info['id']
    email = user_info['email']
    
    user = User.query.filter_by(google_id=google_id).first()
    if not user:
        user = User(google_id=google_id, email=email)
        db.session.add(user)
    
    user.access_token = credentials.token
    user.refresh_token = credentials.refresh_token
    db.session.commit()
    
    login_user(user)
    return redirect('http://localhost:3000')

@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return {'status': 'logged out'}

@auth_bp.route('/me')
@login_required
def me():
    return {'email': current_user.email, 'id': current_user.id}
```

Create `backend/routes/__init__.py`:
```python
from .auth import auth_bp, login_manager
```

**Step 3: Update app.py with auth routes**

Update `backend/app.py`:
```python
from flask import Flask
from flask_login import LoginManager
from config import Config
from models import db
from routes import auth_bp, login_manager

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)
login_manager.init_app(app)
login_manager.login_view = 'auth.google_auth'

app.register_blueprint(auth_bp, url_prefix='/auth')

with app.app_context():
    db.create_all()

@app.route('/health')
def health():
    return {'status': 'ok'}

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

**Step 4: Test auth endpoint exists**

Run:
```bash
cd backend && python app.py
```

In another terminal:
```bash
curl http://localhost:5000/auth/me
```

Expected: 401 Unauthorized (not logged in)

**Step 5: Commit**

```bash
git add backend/routes/ backend/app.py
git commit -m "feat: add Google OAuth authentication"
```

---

## Task 4: Vector Search Service

**Files:**
- Create: `backend/services/__init__.py`
- Create: `backend/services/vector_search.py`

**Step 1: Create services directory**

```bash
mkdir -p backend/services
```

**Step 2: Port VectorSearchSystem from notebook**

Create `backend/services/vector_search.py`:
```python
import time
import numpy as np
import torch
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Tuple

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
    
    def search(self, query_embedding: torch.Tensor, chunk_embeddings: torch.Tensor, top_k: int = 3) -> List[int]:
        similarities = self.model.similarity(query_embedding, chunk_embeddings)[0]
        top_k_indices = similarities.argsort(descending=True)[:top_k]
        return top_k_indices.tolist()

vector_search = VectorSearchSystem()
```

Create `backend/services/__init__.py`:
```python
from .vector_search import vector_search
```

**Step 3: Test vector search service**

Run:
```bash
cd backend && python -c "from services.vector_search import VectorSearchSystem; v = VectorSearchSystem(); print('Model loaded successfully')"
```

Expected: "Model loaded successfully" (may take a moment to download model)

**Step 4: Commit**

```bash
git add backend/services/
git commit -m "feat: add vector search service ported from notebook"
```

---

## Task 5: Google Drive Service

**Files:**
- Create: `backend/services/drive.py`

**Step 1: Write drive service**

Create `backend/services/drive.py`:
```python
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from docx import Document
import io
from typing import List, Dict

class DriveService:
    def __init__(self, access_token: str, refresh_token: str = None):
        credentials = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
        )
        self.service = build('drive', 'v3', credentials=credentials)
    
    def list_docx_files(self, max_results: int = 1000) -> List[Dict]:
        query = "mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document' and trashed=false"
        results = self.service.files().list(q=query, pageSize=max_results, fields="files(id, name)").execute()
        return results.get('files', [])
    
    def download_and_extract_text(self, file_id: str) -> str:
        request = self.service.files().get_media(fileId=file_id)
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while not done:
            done = downloader.next_chunk()[1]
        
        fh.seek(0)
        doc = Document(fh)
        content = ""
        for para in doc.paragraphs:
            content += para.text + " "
        return content.strip()
```

**Step 2: Commit**

```bash
git add backend/services/drive.py
git commit -m "feat: add Google Drive service for .docx files"
```

---

## Task 6: Search API Routes

**Files:**
- Create: `backend/routes/search.py`
- Modify: `backend/app.py`

**Step 1: Write search routes**

Create `backend/routes/search.py`:
```python
from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from models import db, Document, Chunk
from services.vector_search import vector_search
from services.drive import DriveService
import torch

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
```

**Step 2: Register blueprint in app.py**

Update `backend/app.py`:
```python
from flask import Flask
from flask_login import LoginManager
from config import Config
from models import db
from routes import auth_bp, login_manager
from routes.search import search_bp

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)
login_manager.init_app(app)
login_manager.login_view = 'auth.google_auth'

app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(search_bp, url_prefix='/api')

with app.app_context():
    db.create_all()

@app.route('/health')
def health():
    return {'status': 'ok'}

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

**Step 3: Commit**

```bash
git add backend/routes/ backend/app.py
git commit -m "feat: add search API routes for indexing and querying"
```

---

## Task 7: Frontend Project Setup

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.jsx`
- Create: `frontend/src/App.jsx`
- Create: `frontend/src/index.css`

**Step 1: Initialize React project with Vite**

```bash
cd frontend
npm create vite@latest . -- --template react
```

**Step 2: Install dependencies**

```bash
npm install axios react-router-dom
```

**Step 3: Update vite.config.js for proxy**

Update `frontend/vite.config.js`:
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/auth': 'http://localhost:5000',
      '/api': 'http://localhost:5000',
    }
  }
})
```

**Step 4: Commit**

```bash
git add frontend/
git commit -m "feat: initialize React frontend with Vite"
```

---

## Task 8: Auth Context and API Service

**Files:**
- Create: `frontend/src/hooks/useAuth.jsx`
- Create: `frontend/src/services/api.js`

**Step 1: Create auth context**

Create `frontend/src/hooks/useAuth.jsx`:
```javascript
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/me')
      .then(res => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = () => {
    window.location.href = '/auth/google';
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

**Step 2: Create API service**

Create `frontend/src/services/api.js`:
```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: '',
  withCredentials: true,
});

export default api;
```

**Step 3: Commit**

```bash
git add frontend/src/hooks/ frontend/src/services/
git commit -m "feat: add auth context and API service"
```

---

## Task 9: UI Components

**Files:**
- Create: `frontend/src/components/Login.jsx`
- Create: `frontend/src/components/SearchBar.jsx`
- Create: `frontend/src/components/ResultsList.jsx`
- Create: `frontend/src/components/IndexButton.jsx`

**Step 1: Create Login component**

Create `frontend/src/components/Login.jsx`:
```javascript
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const { login } = useAuth();
  
  return (
    <div className="login-container">
      <h1>Vector Search</h1>
      <p>Search your Google Drive documents with semantic search</p>
      <button onClick={login} className="login-btn">
        Sign in with Google
      </button>
    </div>
  );
}
```

**Step 2: Create SearchBar component**

Create `frontend/src/components/SearchBar.jsx`:
```javascript
import { useState } from 'react';

export default function SearchBar({ onSearch }) {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(5);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(query, topK);
  };

  return (
    <form onSubmit={handleSubmit} className="search-form">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search your documents..."
        className="search-input"
      />
      <div className="search-controls">
        <label>
          Results: {topK}
          <input
            type="range"
            min="1"
            max="20"
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
          />
        </label>
        <button type="submit">Search</button>
      </div>
    </form>
  );
}
```

**Step 3: Create ResultsList component**

Create `frontend/src/components/ResultsList.jsx`:
```javascript
export default function ResultsList({ results }) {
  if (!results || results.length === 0) {
    return <p className="no-results">No results found</p>;
  }

  return (
    <div className="results-list">
      {results.map((result, idx) => (
        <div key={idx} className="result-item">
          <h3>{result.title}</h3>
          <p>{result.text}</p>
        </div>
      ))}
    </div>
  );
}
```

**Step 4: Create IndexButton component**

Create `frontend/src/components/IndexButton.jsx`:
```javascript
import { useState } from 'react';
import api from '../services/api';

export default function IndexButton({ onIndexed }) {
  const [indexing, setIndexing] = useState(false);

  const handleIndex = async () => {
    setIndexing(true);
    try {
      const res = await api.post('/api/index');
      onIndexed(res.data.indexed_documents);
    } catch (err) {
      console.error('Indexing failed:', err);
    } finally {
      setIndexing(false);
    }
  };

  return (
    <button onClick={handleIndex} disabled={indexing} className="index-btn">
      {indexing ? 'Indexing...' : 'Index My Drive'}
    </button>
  );
}
```

**Step 5: Commit**

```bash
git add frontend/src/components/
git commit -m "feat: add UI components for login, search, and indexing"
```

---

## Task 10: Main App Assembly

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/index.css`

**Step 1: Update App.jsx**

Update `frontend/src/App.jsx`:
```javascript
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
    api.get('/api/status').then(res => setHasIndexed(res.data.indexed));
  }, []);

  const handleSearch = async (query, topK) => {
    const res = await api.post('/api/search', { query, top_k: topK });
    setResults(res.data.results);
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
```

**Step 2: Add basic styles**

Update `frontend/src/index.css`:
```css
* { box-sizing: border-box; margin: 0; padding: 0; }

body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }

.login-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 1rem; }

.login-btn { background: #4285f4; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-size: 16px; }

.dashboard { max-width: 800px; margin: 0 auto; padding: 2rem; }

header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }

.user-info { display: flex; gap: 1rem; align-items: center; }

.search-form { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 2rem; }

.search-input { padding: 12px; font-size: 16px; border: 1px solid #ccc; border-radius: 4px; }

.search-controls { display: flex; gap: 1rem; align-items: center; }

.index-btn, .reindex-btn { background: #34a853; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; }

.results-list { display: flex; flex-direction: column; gap: 1rem; }

.result-item { border: 1px solid #eee; padding: 1rem; border-radius: 4px; }

.result-item h3 { margin-bottom: 0.5rem; color: #333; }

.no-results { color: #666; }
```

**Step 3: Commit**

```bash
git add frontend/src/App.jsx frontend/src/index.css
git commit -m "feat: assemble main app with all components"
```

---

## Task 11: Environment Setup Documentation

**Files:**
- Create: `README.md`
- Create: `.env.example`

**Step 1: Create README**

Create `README.md`:
```markdown
# Vector Search Webapp

Search your Google Drive .docx files with semantic vector search.

## Setup

### 1. Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google Drive API
4. Create OAuth 2.0 credentials (Web application)
5. Add `http://localhost:5000/auth/callback` to authorized redirect URIs
6. Copy Client ID and Client Secret

### 2. Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

export GOOGLE_CLIENT_ID="your-client-id"
export GOOGLE_CLIENT_SECRET="your-client-secret"
python app.py
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 4. Access the app

Open http://localhost:3000

## Usage

1. Sign in with Google
2. Click "Index My Drive" to index your .docx files
3. Search your documents with natural language queries
```

**Step 2: Create .env.example**

Create `.env.example`:
```
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
SECRET_KEY=your-flask-secret-key-here
```

**Step 3: Commit**

```bash
git add README.md .env.example
git commit -m "docs: add README and environment setup instructions"
```

---

## Task 12: Final Integration Test

**Step 1: Start backend**

```bash
cd backend
source venv/bin/activate
export GOOGLE_CLIENT_ID="your-client-id"
export GOOGLE_CLIENT_SECRET="your-client-secret"
python app.py
```

**Step 2: Start frontend (new terminal)**

```bash
cd frontend
npm run dev
```

**Step 3: Test full flow**

1. Open http://localhost:3000
2. Click "Sign in with Google"
3. Complete OAuth flow
4. Click "Index My Drive"
5. Wait for indexing to complete
6. Enter a search query
7. Verify results appear

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete vector search webapp implementation"
```
