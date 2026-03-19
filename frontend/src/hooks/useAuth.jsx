import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUserInfo } from '../services/drive';

const AuthContext = createContext(null);

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile openid';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tokenClient, setTokenClient] = useState(null);

  useEffect(() => {
    const initGIS = () => {
      if (!window.google?.accounts?.oauth2) {
        setTimeout(initGIS, 100);
        return;
      }

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: async (response) => {
          if (response.error) {
            console.error('OAuth error:', response.error);
            setLoading(false);
            return;
          }
          const token = response.access_token;
          setAccessToken(token);
          sessionStorage.setItem('access_token', token);
          try {
            const userInfo = await getUserInfo(token);
            setUser({ email: userInfo.email, googleId: userInfo.id });
          } catch (err) {
            console.error('Failed to get user info:', err);
          }
          setLoading(false);
        },
      });
      setTokenClient(client);
    };

    initGIS();
  }, []);

  useEffect(() => {
    const storedToken = sessionStorage.getItem('access_token');
    if (storedToken) {
      getUserInfo(storedToken)
        .then((userInfo) => {
          setAccessToken(storedToken);
          setUser({ email: userInfo.email, googleId: userInfo.id });
        })
        .catch(() => {
          sessionStorage.removeItem('access_token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(() => {
    if (tokenClient) {
      tokenClient.requestAccessToken();
    }
  }, [tokenClient]);

  const logout = useCallback(() => {
    if (accessToken) {
      window.google.accounts.oauth2.revoke(accessToken);
    }
    setUser(null);
    setAccessToken(null);
    sessionStorage.removeItem('access_token');
  }, [accessToken]);

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
