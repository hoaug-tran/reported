import { SxProps, Theme } from '@mui/material/styles';
import { SemanticColors } from './tokens';

export const ui = {
  pageMaxWidth: 1280,
  formMaxWidth: 1080,
  pagePaddingX: { xs: 2, md: 3 },
  pagePaddingY: { xs: 2, md: 3 },
  cardRadius: '8px',
  controlRadius: '6px',
  buttonHeight: 36
};

export const buttonSx = (tokens: SemanticColors): SxProps<Theme> => ({
  minHeight: ui.buttonHeight,
  borderRadius: ui.controlRadius,
  textTransform: 'none',
  fontWeight: 700,
  boxShadow: 'none',
  '&:hover': { boxShadow: 'none' },
  '&.MuiButton-contained, &.MuiButton-containedPrimary': {
    backgroundColor: tokens.primary,
    color: '#ffffff !important',
    '& .MuiButton-startIcon, & .MuiButton-endIcon, & svg, & svg *': {
      color: '#ffffff !important',
      stroke: '#ffffff !important'
    },
    '&:hover': { backgroundColor: tokens.primaryHover }
  },
  '&.MuiButton-outlined': {
    borderColor: tokens.border,
    color: tokens.textPrimary,
    '&:hover': { borderColor: tokens.primary, backgroundColor: tokens.hover }
  }
});

export const inputSx = (tokens: SemanticColors): SxProps<Theme> => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: ui.controlRadius,
    backgroundColor: tokens.surface
  },
  '& .MuiInputBase-input': {
    lineHeight: 1.45,
    color: tokens.textPrimary,
    '&::placeholder': { color: tokens.textMuted, opacity: 1 }
  },
  '& .MuiInputLabel-root': { color: tokens.textSecondary },
  '& .MuiFormHelperText-root': { marginLeft: 0, color: tokens.textSecondary }
});

export const selectedSx = (tokens: SemanticColors, selected: boolean): SxProps<Theme> => ({
  p: 1.8,
  borderRadius: ui.cardRadius,
  border: `1.5px solid ${selected ? tokens.primary : tokens.border}`,
  backgroundColor: selected ? tokens.primary : tokens.surfaceSecondary,
  color: selected ? '#ffffff !important' : tokens.textPrimary,
  transition: 'all 0.15s ease',
  '& *': {
    color: selected ? '#ffffff !important' : undefined,
    stroke: selected ? '#ffffff !important' : undefined
  },
  '& svg, & svg *': {
    color: selected ? '#ffffff !important' : undefined,
    stroke: selected ? '#ffffff !important' : undefined
  },
  '&:hover': {
    borderColor: tokens.primary,
    backgroundColor: selected ? tokens.primaryHover : tokens.hover
  }
});

