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
