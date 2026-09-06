import { createTheme, ThemeOptions } from '@mui/material/styles';
import { darkTokens, lightTokens } from './tokens';

export function createAppTheme(mode: 'light' | 'dark') {
  const tokens = mode === 'dark' ? darkTokens : lightTokens;

  const themeOptions: ThemeOptions = {
    palette: {
      mode,
      primary: {
        main: tokens.primary,
        contrastText: '#ffffff'
      },
      secondary: {
        main: tokens.textSecondary
      },
      background: {
        default: tokens.background,
        paper: tokens.surface
      },
      text: {
        primary: tokens.textPrimary,
        secondary: tokens.textSecondary
      },
      divider: tokens.divider,
      success: {
        main: tokens.success
      },
      warning: {
        main: tokens.warning
      },
      error: {
        main: tokens.error
      },
      info: {
        main: tokens.info
      }
    },
    typography: {
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 13,
      h1: {
        fontSize: '1.75rem',
        fontWeight: 600,
        letterSpacing: '-0.02em',
        lineHeight: 1.3
      },
      h2: {
        fontSize: '1.35rem',
        fontWeight: 600,
        letterSpacing: '-0.015em',
        lineHeight: 1.35
      },
      h3: {
        fontSize: '1.1rem',
        fontWeight: 600,
        letterSpacing: '-0.01em',
        lineHeight: 1.4
      },
      h4: {
        fontSize: '0.95rem',
        fontWeight: 600,
        lineHeight: 1.4
      },
      body1: {
        fontSize: '0.875rem',
        lineHeight: 1.55,
        letterSpacing: '-0.005em'
      },
      body2: {
        fontSize: '0.8125rem',
        lineHeight: 1.5,
        color: tokens.textSecondary
      },
      button: {
        textTransform: 'none',
        fontWeight: 500,
        fontSize: '0.8125rem'
      }
    },
    shape: {
      borderRadius: 8
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: tokens.background,
            color: tokens.textPrimary,
            scrollbarColor: `${tokens.border} transparent`,
            '&::-webkit-scrollbar': {
              width: 8,
              height: 8
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: tokens.border,
              borderRadius: 4
            }
          },
          'code, pre, kbd': {
            fontFamily: '"JetBrains Mono", monospace'
          },
          'input, textarea, .MuiInputBase-input': {
            letterSpacing: 'normal !important',
            fontVariantLigatures: 'none'
          }
        }
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true
        },
        styleOverrides: {
          root: {
            borderRadius: 6,
            padding: '6px 14px',
            lineHeight: 1.5,
            transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
            '&.MuiButton-contained, &.MuiButton-containedPrimary': {
              backgroundColor: tokens.primary,
              color: '#ffffff !important',
              fontWeight: 600,
              boxShadow: 'none',
              border: mode === 'dark' ? '1px solid rgba(240, 246, 252, 0.1)' : 'none',
              '& .MuiButton-startIcon, & .MuiButton-endIcon, & svg, & svg *': {
                color: '#ffffff !important',
                stroke: '#ffffff !important'
              },
              '&:hover': {
                backgroundColor: tokens.primaryHover,
                boxShadow: 'none'
              }
            }
          },
          containedPrimary: {
            backgroundColor: tokens.primary,
            color: '#ffffff !important',
            fontWeight: 600,
            boxShadow: 'none',
            border: mode === 'dark' ? '1px solid rgba(240, 246, 252, 0.1)' : 'none',
            '& .MuiButton-startIcon, & .MuiButton-endIcon, & svg, & svg *': {
              color: '#ffffff !important',
              stroke: '#ffffff !important'
            },
            '&:hover': {
              backgroundColor: tokens.primaryHover,
              boxShadow: 'none'
            }
          },
          outlined: {
            borderColor: tokens.border,
            color: tokens.textPrimary,
            backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
            '&:hover': {
              backgroundColor: tokens.hover,
              borderColor: tokens.primary
            }
          }
        }
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            color: tokens.textSecondary,
            transition: 'all 0.12s ease',
            '&:hover': {
              color: tokens.textPrimary,
              backgroundColor: tokens.hover
            },
            '&:active, &.Mui-selected, &[aria-expanded="true"]': {
              color: tokens.primary,
              backgroundColor: tokens.selected
            }
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            height: 24,
            fontSize: '0.75rem',
            fontWeight: 500,
            '& .MuiChip-icon': {
              color: 'inherit !important',
              '& svg, & svg *': {
                color: 'inherit !important',
                stroke: 'currentColor !important'
              }
            },
            '&.MuiChip-filledPrimary, &.Mui-selected': {
              backgroundColor: tokens.primary,
              color: '#ffffff !important',
              '& .MuiChip-icon, & svg, & svg *': {
                color: '#ffffff !important',
                stroke: '#ffffff !important'
              }
            }
          },
          outlined: {
            borderColor: tokens.border
          },
          icon: {
            color: 'inherit'
          }
        }
      },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            borderColor: tokens.border,
            color: tokens.textSecondary,
            textTransform: 'none',
            '& svg, & svg *': {
              color: 'inherit',
              stroke: 'currentColor'
            },
            '&.Mui-selected': {
              backgroundColor: `${tokens.primary} !important`,
              color: '#ffffff !important',
              borderColor: tokens.primary,
              '& svg, & svg *': {
                color: '#ffffff !important',
                stroke: '#ffffff !important'
              },
              '&:hover': {
                backgroundColor: `${tokens.primaryHover} !important`
              }
            }
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            backgroundImage: 'none',
            borderColor: tokens.border,
            boxShadow: mode === 'dark' ? '0 4px 20px -2px rgba(0, 0, 0, 0.4)' : '0 1px 3px rgba(0, 0, 0, 0.05)'
          }
        }
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 8
          }
        }
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: 8
          }
        }
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: 8
          }
        }
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: tokens.divider
          }
        }
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: 6,
            fontSize: '0.875rem',
            backgroundColor: mode === 'dark' ? tokens.surface : '#ffffff',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: tokens.border
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: tokens.textSecondary
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: tokens.primary,
              borderWidth: 1.5
            }
          },
          input: {
            padding: '8px 12px',
            letterSpacing: 'normal !important'
          }
        }
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: mode === 'dark' ? '#21262d' : '#24292f',
            color: '#f0f6fc',
            fontSize: '0.75rem',
            borderRadius: 6,
            padding: '4px 8px'
          }
        }
      }
    }
  };

  return createTheme(themeOptions);
}

