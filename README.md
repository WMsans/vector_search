# Vector Search

Search your Google Drive .docx files with semantic vector search. Runs entirely in your browser -- no server required.

## Setup

### 1. Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing)
3. Enable Google Drive API
4. Create OAuth 2.0 credentials (Web application)
5. Add your domain (e.g., `https://yourusername.github.io`) to authorized JavaScript origins
6. For local development, also add `http://localhost:3000`
7. Copy the Client ID

### 2. Local Development

```bash
cd frontend
npm install
VITE_GOOGLE_CLIENT_ID="your-client-id" npm run dev
```

### 3. Deploy to GitHub Pages

Set the `VITE_GOOGLE_CLIENT_ID` secret in your GitHub repo settings, then push to trigger the GitHub Actions deploy workflow.

## How It Works

1. Sign in with Google (client-side OAuth)
2. Click "Index My Drive" to scan and embed your .docx files
3. Search your documents with natural language queries

All processing (embedding, search) happens in your browser using a Web Worker with the e5-base-v2 ONNX model. Documents and embeddings are stored in IndexedDB.
