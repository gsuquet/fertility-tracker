import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Theme } from '../types/crms';
import { readStorage, writeStorage } from '../utils/storage';
import { STORAGE_THEME_KEY as THEME_STORAGE_KEY } from '../utils/storageKeys';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

/** Browser theme color of each theme: the --bg-primary token of tokens.css */
export const THEME_COLORS: Record<Theme, string> = { light: '#f8f6f1', dark: '#13171d' };

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = readStorage(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    if (typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    // index.html has one theme-color per system color scheme. The choice in the app wins over both.
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      meta.setAttribute('content', THEME_COLORS[theme]);
    }
    writeStorage(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
