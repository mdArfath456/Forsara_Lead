import { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../lib/apiClient';
import { useAuth } from './authStore';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { status } = useAuth();

  // Default to dark while we fetch the saved value. The source of truth lives
  // in the Settings collection, not localStorage.
  const [theme, setTheme] = useState('dark');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  useEffect(() => {
    if (status === 'checking') return;

    if (status === 'unauthenticated') {
      setLoaded(true);
      return;
    }

    let ignore = false;
    setLoaded(false);

    apiClient
      .get('/settings')
      .then((res) => {
        if (!ignore) setTheme(res.data.settings.theme || 'dark');
      })
      .catch(() => {
        // Keep the default if settings cannot load.
      })
      .finally(() => {
        if (!ignore) setLoaded(true);
      });

    return () => {
      ignore = true;
    };
  }, [status]);

  async function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);

    try {
      await apiClient.patch('/settings', { theme: next });
    } catch {
      setTheme(theme);
    }
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme, loaded }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
