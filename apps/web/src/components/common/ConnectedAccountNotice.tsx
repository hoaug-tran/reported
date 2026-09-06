import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, IconButton, Paper, Tooltip } from '@mui/material';
import { X, FolderGit2 } from 'lucide-react';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useAuthContext } from '../../contexts/AuthContext';
import { apiFetch } from '../../api/client';

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function GitLabIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="m23.6 9.59-1.26-3.87a.78.78 0 0 0-1.48 0L19.6 9.59H4.4L3.14 5.72a.78.78 0 0 0-1.48 0L.4 9.59a.78.78 0 0 0 .28.87l11.07 8.05a.78.78 0 0 0 .9 0l11.07-8.05a.78.78 0 0 0 .28-.87z" fill="#E24329"/>
      <path d="M12 18.51 18.72 9.6H5.28L12 18.51z" fill="#FC6D26"/>
      <path d="M12 18.51 5.28 9.6H.4l11.6 8.91z" fill="#FCA326"/>
      <path d="M12 18.51 18.72 9.6h4.88l-11.6 8.91z" fill="#FCA326"/>
    </svg>
  );
}

export const DashboardCodeHostingBanner: React.FC = () => {
  const { tokens } = useThemeContext();
  const { hasCodeHostingConnected, user } = useAuthContext();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!user) return;
    const isDismissed = localStorage.getItem(`reported_code_hosting_banner_dismissed_${user.id}`);
    setDismissed(Boolean(isDismissed));
  }, [user?.id]);

  if (hasCodeHostingConnected || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    if (user) {
      localStorage.setItem(`reported_code_hosting_banner_dismissed_${user.id}`, 'true');
    }
    setDismissed(true);
  };

  const handleConnect = async (provider: 'github' | 'gitlab') => {
    try {
      const extraScopes = provider === 'github' ? 'repo,read:org' : 'read_api';
      const res = await apiFetch<{ url: string }>(
        `/auth/oauth/${provider}/authorize?intent=link&returnTo=/&scopes=${extraScopes}`
      );
      window.location.href = res.url;
    } catch (err) {
      console.error('Failed to initiate connect:', err);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 3,
        p: 2,
        borderRadius: '8px',
        backgroundColor: tokens.surfaceSecondary,
        border: `1px solid ${tokens.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 2
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '6px',
            backgroundColor: `${tokens.primary}20`,
            color: tokens.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <FolderGit2 size={20} />
        </Box>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Liên kết tài khoản GitHub hoặc GitLab
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
            Kết nối mã nguồn để chọn Repository, Pull Request/Merge Request, Branch và Commit trực tiếp trong thảo luận.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<GitHubIcon />}
          onClick={() => handleConnect('github')}
          sx={{ fontSize: '0.75rem', py: 0.4 }}
        >
          Kết nối GitHub
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<GitLabIcon />}
          onClick={() => handleConnect('gitlab')}
          sx={{ fontSize: '0.75rem', py: 0.4 }}
        >
          Kết nối GitLab
        </Button>
        <Tooltip title="Đóng lời nhắc">
          <IconButton size="small" onClick={handleDismiss} sx={{ color: tokens.textSecondary, p: 0.5 }}>
            <X size={16} />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
};

export const ContextualCodeHostingNotice: React.FC<{
  onPreserveDraft?: () => void;
  returnPath?: string;
}> = ({ onPreserveDraft, returnPath = '/' }) => {
  const { tokens } = useThemeContext();

  const handleConnect = async (provider: 'github' | 'gitlab') => {
    if (onPreserveDraft) {
      onPreserveDraft();
    }
    try {
      const extraScopes = provider === 'github' ? 'repo,read:org' : 'read_api';
      const res = await apiFetch<{ url: string }>(
        `/auth/oauth/${provider}/authorize?intent=link&returnTo=${encodeURIComponent(returnPath)}&scopes=${extraScopes}`
      );
      window.location.href = res.url;
    } catch (err) {
      console.error('Failed to initiate contextual connect:', err);
    }
  };

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: '6px',
        backgroundColor: `${tokens.primary}10`,
        border: `1px solid ${tokens.primary}30`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1.5,
        my: 1.5
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FolderGit2 size={18} color={tokens.primary} />
        <Typography variant="body2" sx={{ fontSize: '0.8125rem', color: tokens.textPrimary }}>
          <strong>Chưa kết nối mã nguồn:</strong> Liên kết GitHub hoặc GitLab để tự động chọn Repository, PR/MR, Branch và Commit.
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          size="small"
          variant="contained"
          startIcon={<GitHubIcon />}
          onClick={() => handleConnect('github')}
          sx={{ fontSize: '0.72rem', py: 0.3, px: 1 }}
        >
          Liên kết GitHub
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<GitLabIcon />}
          onClick={() => handleConnect('gitlab')}
          sx={{ fontSize: '0.72rem', py: 0.3, px: 1 }}
        >
          Liên kết GitLab
        </Button>
      </Box>
    </Box>
  );
};

