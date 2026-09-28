import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import { ThemeProvider as MuiThemeProvider, CssBaseline } from "@mui/material";
import { createAppTheme } from "../theme/theme";
import {
  ThemeMode,
  darkTokens,
  lightTokens,
  SemanticColors,
} from "../theme/tokens";
import { STORAGE_KEYS } from "../constants/index";

interface ThemeContextType {
  mode: ThemeMode;
  resolvedMode: "light" | "dark";
  setMode: (mode: ThemeMode) => void;
  tokens: SemanticColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    return (
      (localStorage.getItem(STORAGE_KEYS.themeMode) as ThemeMode) || "light"
    );
  });

  const [systemDark, setSystemDark] = useState(() => {
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  });

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const resolvedMode: "light" | "dark" = useMemo(() => {
    if (mode === "system") {
      return systemDark ? "dark" : "light";
    }
    return mode;
  }, [mode, systemDark]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEYS.themeMode, newMode);
  };

  const tokens = useMemo(() => {
    return resolvedMode === "dark" ? darkTokens : lightTokens;
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
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within ThemeProvider");
  }
  return context;
};
