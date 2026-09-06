import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, CssBaseline } from '@mui/material';
import { createAppTheme } from '../theme/theme';
import { ThemeMode, darkTokens, lightTokens, SemanticColors } from '../theme/tokens';

interface ThemeContextType {
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
  tokens: SemanticColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('reported_theme_mode') as ThemeMode) || 'light';
  });

  const [systemDark, setSystemDark] = useState(() => {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  const resolvedMode: 'light' | 'dark' = useMemo(() => {
    if (mode === 'system') {
      return systemDark ? 'dark' : 'light';
    }
    return mode;
  }, [mode, systemDark]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem('reported_theme_mode', newMode);
  };

  const tokens = useMemo(() => {
    return resolvedMode === 'dark' ? darkTokens : lightTokens;
  }, [resolvedMode]);

  const muiTheme = useMemo(() => createAppTheme(resolvedMode), [resolvedMode]);

  return (
    <ThemeContext.Provider value={{ mode, resolvedMode, setMode, tokens }}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within ThemeProvider');
  }
  return context;
}

