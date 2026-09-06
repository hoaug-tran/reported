export type ThemeMode = 'light' | 'dark' | 'system';

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
  background: '#0d1117',
  surface: '#161b22',
  surfaceSecondary: '#21262d',
  surfaceHover: '#30363d',
  textPrimary: '#e6edf3',
  textSecondary: '#848d97',
  textMuted: '#6e7681',
  border: '#30363d',
  borderSubtle: '#21262d',
  divider: '#30363d',
  hover: 'rgba(110, 118, 129, 0.12)',
  selected: 'rgba(56, 139, 253, 0.15)',
  primary: '#2f81f7',
  primaryHover: '#388bfd',
  primaryGlow: 'transparent',
  accent: '#a371f7',
  success: '#238636',
  successGlow: 'rgba(35, 134, 54, 0.15)',
  warning: '#d29922',
  warningGlow: 'rgba(210, 153, 34, 0.15)',
  error: '#f85149',
  errorGlow: 'rgba(248, 81, 73, 0.15)',
  info: '#2f81f7',
  codeBackground: '#161b22',
  codeBorder: '#30363d'
};

export const lightTokens: SemanticColors = {
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceSecondary: '#f1f5f9',
  surfaceHover: '#e2e8f0',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  borderSubtle: '#f1f5f9',
  divider: '#e2e8f0',
  hover: 'rgba(15, 23, 42, 0.04)',
  selected: 'rgba(99, 102, 241, 0.1)',
  primary: '#4f46e5',
  primaryHover: '#4338ca',
  primaryGlow: 'rgba(79, 70, 229, 0.15)',
  accent: '#9333ea',
  success: '#059669',
  successGlow: 'rgba(5, 150, 105, 0.15)',
  warning: '#d97706',
  warningGlow: 'rgba(217, 119, 6, 0.15)',
  error: '#e11d48',
  errorGlow: 'rgba(225, 29, 72, 0.15)',
  info: '#0284c7',
  codeBackground: '#f1f5f9',
  codeBorder: '#e2e8f0'
};

