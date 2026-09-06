import React from 'react';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';
import { SxProps, Theme } from '@mui/material/styles';
import { useThemeContext } from '../../contexts/ThemeContext';
import { ui } from '../../theme/ui';

type PageProps = {
  children: React.ReactNode;
  variant?: 'default' | 'form' | 'wide';
  sx?: SxProps<Theme>;
};

export function Page({ children, variant = 'default', sx }: PageProps) {
  const maxWidth = variant === 'wide' || variant === 'default' || variant === 'form' ? 'none' : ui.pageMaxWidth;
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth,
        mx: 0,
        px: 0,
        py: 0,
        boxSizing: 'border-box',
        ...sx
      }}
    >
      {children}
    </Box>
  );
}

type PageHeaderProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
};

export function PageHeader({ title, subtitle, action, icon }: PageHeaderProps) {
  const { tokens } = useThemeContext();
  return (
    <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2, mb: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.025em', color: tokens.textPrimary, display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          {icon}{title}
        </Typography>
        {subtitle && <Typography variant="body2" sx={{ color: tokens.textSecondary, maxWidth: 760 }}>{subtitle}</Typography>}
      </Box>
      {action && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>{action}</Box>}
    </Box>
  );
}

type SectionCardProps = {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
  dashed?: boolean;
};

export function SectionCard({ children, sx, dashed }: SectionCardProps) {
  const { tokens } = useThemeContext();
  return (
    <Paper elevation={0} sx={{ borderRadius: ui.cardRadius, border: `1px ${dashed ? 'dashed' : 'solid'} ${tokens.border}`, backgroundColor: tokens.surface, overflow: 'hidden', ...sx }}>
      {children}
    </Paper>
  );
}

export function Toolbar({ children, sx }: { children: React.ReactNode; sx?: SxProps<Theme> }) {
  const { tokens } = useThemeContext();
  return <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', p: 1.5, mb: 2, borderRadius: ui.cardRadius, border: `1px solid ${tokens.border}`, backgroundColor: tokens.surface, ...sx }}>{children}</Box>;
}

export function EmptyState({ icon, title, description, action, loading }: { icon?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; action?: React.ReactNode; loading?: boolean }) {
  const { tokens } = useThemeContext();
  return (
    <SectionCard dashed sx={{ p: 5, textAlign: 'center' }}>
      {loading ? <CircularProgress size={28} /> : icon}
      <Typography variant="h4" sx={{ fontWeight: 800, color: tokens.textPrimary, mt: 2, mb: 1 }}>{title}</Typography>
      {description && <Typography variant="body2" sx={{ color: tokens.textSecondary, maxWidth: 520, mx: 'auto', mb: action ? 3 : 0 }}>{description}</Typography>}
      {action}
    </SectionCard>
  );
}
