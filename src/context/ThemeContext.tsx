/**
 * @file ThemeContext.tsx
 * @description Global theme management for the ATLAS Crypto Terminal.
 *
 * Provides a React Context that tracks the current color mode (`"dark"` | `"light"`)
 * and persists the user's preference to `localStorage` under the key `atlas-theme`.
 *
 * On mount, the provider reads from localStorage and applies the corresponding
 * CSS class to `<html>`, which toggles the CSS custom-property palette defined
 * in `index.css`. Defaults to dark mode for the premium neon aesthetic.
 *
 * @example
 *   const { theme, toggleTheme } = useTheme();
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  /** The currently active color mode. */
  theme: Theme;
  /** Toggles between `"light"` and `"dark"`. */
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * ThemeProvider — wraps the application and provides `theme` + `toggleTheme`.
 * Persists the selected theme to `localStorage` so the preference survives
 * page reloads.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('atlas-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    // Default to dark mode for the premium neon aesthetic
    return 'dark';
  });

  useEffect(() => {
    localStorage.setItem('atlas-theme', theme);
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * useTheme — convenience hook to consume ThemeContext.
 * @throws {Error} If called outside of a `<ThemeProvider>`.
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
