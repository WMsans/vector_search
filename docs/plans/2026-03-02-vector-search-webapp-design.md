# Vector Search Webapp Design

## Overview

Convert the `vectorSearch.ipynb` Colab notebook into a local webapp that allows users to authenticate with their Google account, connect to their Google Drive, and perform vector similarity search on their .docx documents.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    React SPA                             ││
│  │  - Google OAuth login                                    ││
│  │  - Search UI                                             ││
│  │  - Results display                                       ││
│  └──────────────────────┬──────────────────────────────────┘│
└─────────────────────────┼───────────────────────────────────┘
                          │ HTTP/REST
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Flask Backend                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Auth Routes │  │API Routes   │  │ VectorSearchSystem  │  │
│  │ /auth/*     │  │ /api/*      │  │ (from notebook)     │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                    │              │
│         └────────────────┼────────────────────┘              │
│                          ▼                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                     SQLite                              │  │
│  │  - users (google_id, tokens)                           │  │
│  │  - embeddings (user_id, embedding_blob, metadata)      │  │
│  │  - documents (user_id, doc_id, title, text)            │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   Google Drive API    │
              │   (via OAuth token)   │
              └───────────────────────┘
```

## Tech Stack

- **Backend:** Flask, SQLAlchemy, sentence-transformers (e5-base-v2), python-docx
- **Frontend:** React, Vite, Axios, React Router
- **Database:** SQLite (local file)
- **Auth:** Google OAuth 2.0 with Flask sessions
- **Embedding Model:** intfloat/e5-base-v2

## Backend Design

### Project Structure

```
vector_search/
├── backend/
│   ├── app.py              # Flask entry point
│   ├── config.py           # Config (secret key, OAuth client ID)
│   ├── models/
│   │   ├── __init__.py
│   │   └── database.py     # SQLAlchemy models
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── auth.py         # OAuth endpoints
│   │   └── search.py       # Search API endpoints
│   ├── services/
│   │   ├── __init__.py
│   │   ├── drive.py        # Google Drive file loading
│   │   └── vector_search.py # VectorSearchSystem class
│   └── requirements.txt
├── frontend/               # React app
└── data/
    └── vector_search.db    # SQLite database
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/google` | GET | Initiate Google OAuth |
| `/auth/callback` | GET | OAuth callback |
| `/auth/logout` | POST | Clear session |
| `/api/status` | GET | Check if user has indexed files |
| `/api/index` | POST | Fetch & index files from Drive |
| `/api/search` | POST | Search indexed documents |
| `/api/documents` | GET | List indexed documents |

### Database Schema

```sql
users: id, google_id, email, access_token, refresh_token, created_at
documents: id, user_id, drive_file_id, title, indexed_at
chunks: id, document_id, text, embedding (BLOB)
```

## Frontend Design

### Project Structure

```
frontend/
├── src/
│   ├── App.jsx              # Main app with routing
│   ├── main.jsx             # Entry point
│   ├── components/
│   │   ├── Login.jsx        # Google login button
│   │   ├── SearchBar.jsx    # Query input + top_k slider
│   │   ├── ResultsList.jsx  # Display search results
│   │   └── IndexButton.jsx  # Trigger re-indexing
│   ├── hooks/
│   │   └── useAuth.js       # Auth state management
│   ├── services/
│   │   └── api.js           # Axios calls to backend
│   └── index.css
├── package.json
└── vite.config.js
```

### State Management

- React Context for auth state (user, isAuthenticated)
- Local state for search results
- No Redux needed (simple app)

## Data Flows

### OAuth Flow

1. User clicks "Sign in with Google"
2. Frontend redirects to /auth/google
3. Backend redirects to Google OAuth consent screen
4. User grants Drive readonly permission
5. Google redirects to /auth/callback with code
6. Backend exchanges code for tokens, stores in SQLite
7. Backend creates session cookie, redirects to frontend

### Indexing Flow

1. User clicks "Index My Drive"
2. POST /api/index → backend fetches user's tokens from DB
3. Backend queries Drive API for .docx files
4. For each file:
   - Download .docx content
   - Extract text with python-docx
   - Chunk text (simple_text_chunker from notebook)
   - Generate embeddings with e5-base-v2
5. Store chunks + embeddings in SQLite (chunks table)
6. Return indexed document count

### Search Flow

1. User submits query in SearchBar
2. POST /api/search {query: "...", top_k: 5}
3. Backend:
   - Embed query with e5-base-v2
   - Load user's chunk embeddings from SQLite
   - Compute cosine similarity
   - Return top_k results with metadata
4. Frontend displays ResultsList

## Key Features

- Google OAuth login with Drive readonly scope
- Index .docx files from user's Google Drive
- Chunk documents (50 words, 5 word overlap - from notebook)
- Persist embeddings per-user in SQLite
- Vector similarity search with cosine distance
- Display results with document title + text chunk

## Out of Scope

- User registration (Google-only auth)
- Multiple file formats beyond .docx
- Sharing/collaboration features
- Cloud deployment configuration
- Pagination (load all results at once)

## Development Steps

1. Set up Flask backend with SQLite models
2. Implement Google OAuth flow
3. Port VectorSearchSystem from notebook
4. Implement Drive file loading
5. Create React frontend with auth
6. Wire up search UI to backend API
7. Test end-to-end locally
