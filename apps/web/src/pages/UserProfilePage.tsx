import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, CircularProgress, Chip, Divider, Link as MuiLink
} from '@mui/material';
import { Mail, Calendar, GitPullRequest } from 'lucide-react';
import { useRoute, useLocation } from 'wouter';
import { useThemeContext } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { UserAvatar } from '../components/common/UserAvatar';
import { apiFetch } from '../api/client';
import { UserProfileDto } from '@reported/contracts';

export const UserProfilePage: React.FC = () => {
  const { tokens } = useThemeContext();
  const { language } = useI18n();
  const isVi = language === 'vi';
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/users/:username');

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfileDto | null>(null);

  useEffect(() => {
    if (!params?.username) return;
    setLoading(true);
    apiFetch<UserProfileDto>(`/users/${params.username}`)
      .then(setProfile)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params?.username]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h3">{isVi ? 'Không tìm thấy người dùng' : 'User not found'}</Typography>
        <Button onClick={() => setLocation('/')} sx={{ mt: 2, borderRadius: '6px' }}>
          {isVi ? 'Về trang chủ' : 'Back to Home'}
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>

      <Box
        sx={{
          p: 3,
          borderRadius: '8px',
          border: `1px solid ${tokens.border}`,
          backgroundColor: tokens.surface,
          display: 'flex',
          gap: 3,
          alignItems: 'flex-start',
          mb: 3
        }}
      >
        <UserAvatar user={profile} size={72} showTooltip={false} />

        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
            <Typography variant="h2" sx={{ fontWeight: 700, fontSize: '1.4rem' }}>
              {profile.displayName}
            </Typography>
            <Chip label={profile.role} size="small" sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 600, borderRadius: '6px' }} />
          </Box>

          <Typography variant="body2" sx={{ color: tokens.textSecondary, mb: 1.5 }}>
            @{profile.username}
          </Typography>

          {profile.bio && (
            <Typography variant="body1" sx={{ color: tokens.textPrimary, mb: 2, lineHeight: 1.5 }}>
              {profile.bio}
            </Typography>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap', color: tokens.textSecondary, fontSize: '0.8125rem' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
              <Mail size={16} />
              <span>{profile.email}</span>
            </Box>

            {profile.githubUsername && (
              <MuiLink
                href={`https://github.com/${profile.githubUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ display: 'flex', alignItems: 'center', gap: 0.6, color: tokens.textSecondary, textDecoration: 'none', '&:hover': { color: tokens.primary } }}
              >
                <GitPullRequest size={16} />
                <span>@{profile.githubUsername}</span>
              </MuiLink>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
              <Calendar size={15} />
              <span>{isVi ? 'Tham gia từ' : 'Joined'} {new Date(profile.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
        <Box sx={{ p: 2, borderRadius: '8px', border: `1px solid ${tokens.border}`, backgroundColor: tokens.surface, textAlign: 'center' }}>
          <Typography variant="h2" sx={{ fontWeight: 700, color: tokens.primary }}>
            {profile.createdIssuesCount || 0}
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.textSecondary, fontWeight: 600 }}>
            {isVi ? 'BÀI VIẾT ĐÃ TẠO' : 'ISSUES OPENED'}
          </Typography>
        </Box>

        <Box sx={{ p: 2, borderRadius: '8px', border: `1px solid ${tokens.border}`, backgroundColor: tokens.surface, textAlign: 'center' }}>
          <Typography variant="h2" sx={{ fontWeight: 700, color: tokens.warning }}>
            {profile.assignedIssuesCount || 0}
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.textSecondary, fontWeight: 600 }}>
            {isVi ? 'BÀI VIẾT ĐƯỢC GIAO' : 'ASSIGNED ISSUES'}
          </Typography>
        </Box>

        <Box sx={{ p: 2, borderRadius: '8px', border: `1px solid ${tokens.border}`, backgroundColor: tokens.surface, textAlign: 'center' }}>
          <Typography variant="h2" sx={{ fontWeight: 700, color: '#a371f7' }}>
            {profile.pendingReviewsCount || 0}
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.textSecondary, fontWeight: 600 }}>
            {isVi ? 'REVIEW ĐÃ THAM GIA' : 'REVIEWS INVOLVED'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

