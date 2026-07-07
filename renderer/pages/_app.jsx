import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { buildTheme, ThemeModeContext } from '../theme';
import { toggleDarkMode } from '../services/wallet';

const MODE_KEY = 'theme-mode';

export default function App({ Component, pageProps }) {
  const [mode, setMode] = useState('light');

  useEffect(() => {
    const saved = window.localStorage.getItem(MODE_KEY);
    if (saved === 'dark' || saved === 'light') {
      setMode(saved);
    }
  }, []);

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      window.localStorage.setItem(MODE_KEY, next);
      return next;
    });
    // Keep the native window chrome in sync with the app theme.
    toggleDarkMode();
  }, []);

  const theme = useMemo(() => buildTheme(mode), [mode]);
  const ctx = useMemo(() => ({ mode, toggleMode }), [mode, toggleMode]);

  return (
    <ThemeModeContext.Provider value={ctx}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Component {...pageProps} />
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
