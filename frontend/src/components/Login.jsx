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
