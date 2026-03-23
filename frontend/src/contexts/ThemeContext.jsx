/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import { DEFAULT_THEME } from '../themes/presets';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'vector-search-theme';

function applyThemeToDom(theme) {
  const root = document.documentElement;
  root.style.setProperty('--theme-bg-1', theme.bg1);
  root.style.setProperty('--theme-bg-2', theme.bg2);
  root.style.setProperty('--theme-text', theme.text);
  root.style.setProperty('--theme-accent', theme.accent);
}

function loadThemeFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.bg1 && parsed.bg2 && parsed.text && parsed.accent) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load theme from storage:', e);
  }
  return DEFAULT_THEME;
}

function saveThemeToStorage(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
  } catch (e) {
    console.warn('Failed to save theme to storage:', e);
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(loadThemeFromStorage);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    saveThemeToStorage(newTheme);
    applyThemeToDom(newTheme);
  };

  useEffect(() => {
    applyThemeToDom(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
