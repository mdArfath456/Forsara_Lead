import { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../lib/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [status, setStatus] = useState('checking'); // 'checking' | 'authenticated' | 'unauthenticated'

  useEffect(() => {
    apiClient
      .get('/auth/me')
      .then((res) => setStatus(res.data.authenticated ? 'authenticated' : 'unauthenticated'))
      .catch(() => setStatus('unauthenticated'));
  }, []);

  async function login(username, password) {
    await apiClient.post('/auth/login', { username, password });
    const res = await apiClient.get('/auth/me');
    if (!res.data.authenticated) {
      setStatus('unauthenticated');
      throw new Error('SESSION_NOT_ESTABLISHED');
    }
    setStatus('authenticated');
  }

  async function logout() {
    await apiClient.post('/auth/logout');
    setStatus('unauthenticated');
  }

  return <AuthContext.Provider value={{ status, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
