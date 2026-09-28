export type ThemeMode = "light" | "dark" | "system";

export interface SemanticColors {
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceHover: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderSubtle: string;
  divider: string;
  hover: string;
  selected: string;
  primary: string;
  primaryHover: string;
  primaryGlow: string;
  accent: string;
  success: string;
  successGlow: string;
  warning: string;
  warningGlow: string;
  error: string;
  errorGlow: string;
  info: string;
  codeBackground: string;
  codeBorder: string;
}

export const darkTokens: SemanticColors = {
  background: "#131417",
  surface: "#1a1b1f",
  surfaceSecondary: "#22242a",
  surfaceHover: "#2a2d34",
  textPrimary: "#f1f2f4",
  textSecondary: "#9ea3ab",
  textMuted: "#6b7280",
  border: "#2c2f36",
  borderSubtle: "#202227",
  divider: "#26282e",
  hover: "rgba(255, 255, 255, 0.05)",
  selected: "rgba(56, 139, 253, 0.16)",
  primary: "#388bfd",
  primaryHover: "#58a6ff",
  primaryGlow: "rgba(56, 139, 253, 0.25)",
  accent: "#a855f7",
  success: "#3fb950",
  successGlow: "rgba(63, 185, 80, 0.18)",
  warning: "#f59e0b",
  warningGlow: "rgba(245, 158, 11, 0.18)",
  error: "#f85149",
  errorGlow: "rgba(248, 81, 73, 0.18)",
  info: "#388bfd",
  codeBackground: "#16171b",
  codeBorder: "#2c2f36",
};

export const lightTokens: SemanticColors = {
  background: "#f8fafc",
  surface: "#ffffff",
  surfaceSecondary: "#f1f5f9",
  surfaceHover: "#e2e8f0",
  textPrimary: "#0f172a",
  textSecondary: "#475569",
  textMuted: "#94a3b8",
  border: "#e2e8f0",
  borderSubtle: "#f1f5f9",
  divider: "#e2e8f0",
  hover: "rgba(15, 23, 42, 0.04)",
  selected: "rgba(99, 102, 241, 0.1)",
  primary: "#4f46e5",
  primaryHover: "#4338ca",
  primaryGlow: "rgba(79, 70, 229, 0.15)",
  accent: "#9333ea",
  success: "#059669",
  successGlow: "rgba(5, 150, 105, 0.15)",
  warning: "#d97706",
  warningGlow: "rgba(217, 119, 6, 0.15)",
  error: "#e11d48",
  errorGlow: "rgba(225, 29, 72, 0.15)",
  info: "#0284c7",
  codeBackground: "#f1f5f9",
  codeBorder: "#e2e8f0",
};
