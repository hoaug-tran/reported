import React from 'react';
import { Box, Typography, Paper, Button, Chip, Tooltip, IconButton } from '@mui/material';
import {
  FolderGit2,
  ExternalLink,
  Plus,
  Clock,
  Eye,
  Keyboard,
  Command,
  GitBranch,
  ShieldCheck
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useThemeContext } from '../../contexts/ThemeContext';
import { UserAvatar } from '../common/UserAvatar';
import { ReviewDetailDto, RepositoryDto } from '@reported/contracts';

interface DashboardSidebarWidgetsProps {
  isVi: boolean;
  repositoriesList: RepositoryDto[];
  waitingReviews: ReviewDetailDto[];
}

function formatRelativeTime(dateStr: string, isVi: boolean): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return isVi ? `${diffMin}p trước` : `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return isVi ? `${diffHour}h trước` : `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return isVi ? `${diffDay} ngày trước` : `${diffDay}d ago`;
}

export const DashboardSidebarWidgets: React.FC<DashboardSidebarWidgetsProps> = ({
  isVi,
  repositoriesList,
  waitingReviews
}) => {
  const { tokens } = useThemeContext();
  const [, setLocation] = useLocation();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* ━━ WIDGET 1: CONNECTED REPOSITORIES ━━ */}
      <Paper
        elevation={0}
        sx={{
          p: 2.2,
          borderRadius: '10px',
          backgroundColor: tokens.surface,
          border: `1px solid ${tokens.border}`
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.8 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FolderGit2 size={16} color={tokens.primary} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tokens.textPrimary, fontSize: '0.875rem' }}>
              {isVi ? 'Kho lưu trữ' : 'Repositories'}
            </Typography>
            <Chip
              label={repositoriesList.length}
              size="small"
              sx={{ height: 18, fontSize: '0.625rem', fontWeight: 700 }}
            />
          </Box>

          <Button
            size="small"
            variant="text"
            startIcon={<Plus size={14} />}
            onClick={() => setLocation('/repositories')}
            sx={{
              fontSize: '0.72rem',
              p: 0,
              minWidth: 'auto',
              textTransform: 'none',
              fontWeight: 600,
              color: tokens.primary
            }}
          >
            {isVi ? 'Quản lý' : 'Manage'}
          </Button>
        </Box>

        {repositoriesList.length === 0 ? (
          <Box sx={{ py: 2, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: tokens.textSecondary, display: 'block', mb: 1 }}>
              {isVi ? 'Chưa liên kết kho mã nguồn nào.' : 'No repositories linked yet.'}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setLocation('/repositories')}
              sx={{ fontSize: '0.75rem', textTransform: 'none' }}
            >
              {isVi ? 'Liên kết GitHub' : 'Link GitHub'}
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {repositoriesList.slice(0, 4).map((repo) => (
              <Box
                key={repo.id}
                onClick={() => setLocation(`/repositories`)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1,
                  px: 1.2,
                  borderRadius: '6px',
                  backgroundColor: tokens.surfaceSecondary,
                  cursor: 'pointer',
                  transition: 'background-color 0.12s ease',
                  '&:hover': {
                    backgroundColor: tokens.hover
                  }
                }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: tokens.textPrimary,
                      fontSize: '0.8125rem'
                    }}
                    noWrap
                  >
                    {repo.name}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.2 }}>
                    <GitBranch size={11} color={tokens.textSecondary} />
                    <Typography variant="caption" sx={{ color: tokens.textSecondary, fontSize: '0.6875rem' }}>
                      {repo.defaultBranch || 'main'}
                    </Typography>
                  </Box>
                </Box>

                <Tooltip title={repo.webUrl ? (isVi ? 'Mở trên web' : 'Open web') : ''}>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (repo.webUrl) window.open(repo.webUrl, '_blank');
                    }}
                    sx={{ color: tokens.textSecondary, p: 0.5 }}
                  >
                    <ExternalLink size={13} />
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {/* ━━ WIDGET 2: WAITING ON COLLEAGUES ━━ */}
      {waitingReviews.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 2.2,
            borderRadius: '10px',
            backgroundColor: tokens.surface,
            border: `1px solid ${tokens.border}`
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Clock size={16} color="#f59e0b" />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tokens.textPrimary, fontSize: '0.875rem' }}>
                {isVi ? 'Đang chờ duyệt' : 'Waiting on Review'}
              </Typography>
              <Chip
                label={waitingReviews.length}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  color: '#f59e0b'
                }}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {waitingReviews.slice(0, 4).map((rev) => {
              const pendingReviewers = (rev.reviewers || []).filter((r) => r.status === 'PENDING');
              return (
                <Box
                  key={rev.id}
                  onClick={() => setLocation(`/reviews/${rev.number}`)}
                  sx={{
                    p: 1.2,
                    borderRadius: '6px',
                    backgroundColor: tokens.surfaceSecondary,
                    cursor: 'pointer',
                    transition: 'all 0.12s ease',
                    '&:hover': {
                      backgroundColor: tokens.hover
                    }
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: tokens.textPrimary,
                      fontSize: '0.8125rem',
                      lineHeight: 1.3
                    }}
                    noWrap
                  >
                    #{rev.number} {rev.title}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 0.8 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="caption" sx={{ color: tokens.textSecondary, fontSize: '0.6875rem' }}>
                        {isVi ? 'Người duyệt:' : 'Reviewer:'}
                      </Typography>
                      {pendingReviewers.map((r) => (
                        <Tooltip key={r.user.id} title={`@${r.user.username}`}>
                          <span>
                            <UserAvatar user={r.user} size={18} showTooltip={false} />
                          </span>
                        </Tooltip>
                      ))}
                    </Box>

                    <Typography variant="caption" sx={{ color: tokens.textSecondary, fontSize: '0.6875rem' }}>
                      {formatRelativeTime(rev.createdAt, isVi)}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Paper>
      )}

      {/* ━━ WIDGET 3: DEV PRODUCTIVITY CHEATSHEET ━━ */}
      <Paper
        elevation={0}
        sx={{
          p: 2.2,
          borderRadius: '10px',
          backgroundColor: tokens.surface,
          border: `1px solid ${tokens.border}`
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <Keyboard size={16} color={tokens.textSecondary} />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tokens.textPrimary, fontSize: '0.875rem' }}>
            {isVi ? 'Phím tắt Developer' : 'Pro Shortcuts'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
            <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
              {isVi ? 'Mở tìm kiếm nhanh' : 'Command palette'}
            </Typography>
            <Chip label="Ctrl + K" size="small" sx={{ height: 18, fontSize: '0.625rem', fontFamily: 'monospace', fontWeight: 700 }} />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
            <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
              {isVi ? 'Tạo bài thảo luận' : 'New post modal'}
            </Typography>
            <Chip label="Ctrl + N" size="small" sx={{ height: 18, fontSize: '0.625rem', fontFamily: 'monospace', fontWeight: 700 }} />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
            <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
              {isVi ? 'Xem các Issues' : 'Go to Issues'}
            </Typography>
            <Chip label="/issues" size="small" sx={{ height: 18, fontSize: '0.625rem', fontFamily: 'monospace', fontWeight: 700 }} />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem' }}>
            <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
              {isVi ? 'Xem Code Reviews' : 'Go to Reviews'}
            </Typography>
            <Chip label="/reviews" size="small" sx={{ height: 18, fontSize: '0.625rem', fontFamily: 'monospace', fontWeight: 700 }} />
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
