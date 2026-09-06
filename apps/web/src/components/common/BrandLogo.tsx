import React from 'react';
import { Box, Typography } from '@mui/material';
import { useThemeContext } from '../../contexts/ThemeContext';

interface BrandLogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 'medium', showText = true }) => {
  const { tokens } = useThemeContext();

  const iconSizes = {
    small: 24,
    medium: 30,
    large: 38
  };

  const fontSizes = {
    small: '0.9375rem',
    medium: '1.0625rem',
    large: '1.3125rem'
  };

  const s = iconSizes[size];

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, userSelect: 'none' }}>
      <Box
        component="svg"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        sx={{
          width: s,
          height: s,
          flexShrink: 0,
          filter: `drop-shadow(0 2px 8px ${tokens.primaryGlow})`
        }}
      >
        <defs>
          <linearGradient id="reportedGradient" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366f1" />
            <stop offset="0.5" stopColor="#818cf8" />
            <stop offset="1" stopColor="#c084fc" />
          </linearGradient>
          <linearGradient id="pulseGlow" x1="16" y1="6" x2="16" y2="26" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="1" stopColor="#6366f1" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <polygon
          points="16,3 28,9.5 28,22.5 16,29 4,22.5 4,9.5"
          stroke="url(#reportedGradient)"
          strokeWidth="2"
          strokeLinejoin="round"
          fill="rgba(99, 102, 241, 0.08)"
        />
        <path
          d="M16 8V16L23 20"
          stroke="url(#reportedGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16 16L9 20"
          stroke="url(#reportedGradient)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="16" cy="16" r="3.5" fill="url(#reportedGradient)" />
        <circle cx="16" cy="16" r="1.5" fill="#ffffff" />
        <circle cx="23" cy="20" r="2" fill="#818cf8" />
        <circle cx="9" cy="20" r="2" fill="#c084fc" />
      </Box>

      {showText && (
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: fontSizes[size],
            letterSpacing: '-0.02em',
            lineHeight: 1,
            color: tokens.textPrimary,
            fontFamily: '"Inter", sans-serif'
          }}
        >
          REPORTED
        </Typography>
      )}
    </Box>
  );
};

