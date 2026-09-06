import React, { useState } from 'react';
import {
  Box, Typography, Link, Chip, Tooltip, Avatar, IconButton, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, Collapse, CircularProgress
} from '@mui/material';
import {
  GitPullRequest, CheckCircle2, Clock, XCircle, ExternalLink,
  ArrowRight, FileCode, Plus, Minus, RefreshCw, Edit3, ChevronDown, ChevronUp,
  GitBranch, ShieldCheck
} from 'lucide-react';
import { PullRequestSummaryDto, PullRequestState, PullRequestChecksStatus } from '@reported/contracts';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useI18n } from '../../contexts/I18nContext';
import { apiFetch } from '../../api/client';
import { CICheckRunsList } from './CICheckRunsList';

interface PullRequestPreviewProps {
  pr: PullRequestSummaryDto;
  repoFullName?: string;
  onRefresh?: () => void;
}

export const PullRequestPreview: React.FC<PullRequestPreviewProps> = ({
  pr: initialPr,
  repoFullName,
  onRefresh
}) => {
  const { tokens, resolvedMode } = useThemeContext();
  const { language } = useI18n();
  const isVi = language === 'vi';

  const [pr, setPr] = useState<PullRequestSummaryDto>(initialPr);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);
  const [showCheckRuns, setShowCheckRuns] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState(initialPr.title);
  const [editAuthor, setEditAuthor] = useState(initialPr.authorGithub);
  const [editHeadBranch, setEditHeadBranch] = useState(initialPr.headBranch);
  const [editBaseBranch, setEditBaseBranch] = useState(initialPr.baseBranch);
  const [editAdditions, setEditAdditions] = useState(String(initialPr.additions ?? ''));
  const [editDeletions, setEditDeletions] = useState(String(initialPr.deletions ?? ''));
  const [editFiles, setEditFiles] = useState(String(initialPr.changedFiles ?? ''));
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    setPr(initialPr);
    setEditTitle(initialPr.title);
    setEditAuthor(initialPr.authorGithub);
    setEditHeadBranch(initialPr.headBranch);
    setEditBaseBranch(initialPr.baseBranch);
    setEditAdditions(String(initialPr.additions ?? ''));
    setEditDeletions(String(initialPr.deletions ?? ''));
    setEditFiles(String(initialPr.changedFiles ?? ''));
  }, [initialPr]);

  const isMerged = pr.isMerged || pr.state === PullRequestState.MERGED;
  const isClosed = pr.state === PullRequestState.CLOSED && !isMerged;
  const isOpen = !isMerged && !isClosed;

  const stateColor = isMerged ? '#a371f7' : isClosed ? '#f85149' : '#3fb950';
  const stateBg = isMerged ? 'rgba(163, 113, 247, 0.15)' : isClosed ? 'rgba(248, 81, 73, 0.15)' : 'rgba(63, 185, 80, 0.15)';
  const stateLabel = isMerged
    ? (isVi ? 'Đã hợp nhất (Merged)' : 'Merged')
    : isClosed
      ? (isVi ? 'Đã đóng (Closed)' : 'Closed')
      : (isVi ? 'Đang mở (Open)' : 'Open');

  const githubProfileUrl = pr.authorGithub
    ? `https://github.com/${pr.authorGithub}`
    : undefined;

  const totalDiff = (pr.additions || 0) + (pr.deletions || 0);
  const additionsRatio = totalDiff > 0 ? Math.round(((pr.additions || 0) / totalDiff) * 100) : 50;

  const handleSyncPR = async () => {
    if (!pr.id) return;
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await apiFetch<{
        success: boolean;
        message?: string;
        error?: string;
        code?: string;
        pullRequest?: PullRequestSummaryDto;
      }>(`/github/pull-requests/${pr.id}/sync`, { method: 'POST' });

      if (res.pullRequest) {
        setPr(res.pullRequest);
      }

      if (res.success) {
        setSyncFeedback({
          type: 'success',
          message: isVi ? 'Đồng bộ dữ liệu Pull Request từ GitHub thành công!' : 'PR data successfully synced from GitHub!'
        });
        if (onRefresh) onRefresh();
      } else if (res.code === 'TOKEN_EXPIRED') {
        setSyncFeedback({
          type: 'warning',
          message: isVi
            ? 'Token GitHub của bạn đã hết hạn hoặc không có quyền truy cập repo này. Bạn có thể bấm nút sửa bên cạnh để cập nhật thông tin PR thủ công, hoặc vào Cài đặt > Tài khoản liên kết để kết nối lại.'
            : 'GitHub token expired or lacks repo access. You can edit PR details manually using the edit button or reconnect GitHub in Settings.'
        });
      } else {
        setSyncFeedback({
          type: 'warning',
          message: res.error || (isVi ? 'Không thể đồng bộ từ GitHub' : 'Failed to sync with GitHub')
        });
      }
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err.message || (isVi ? 'Lỗi kết nối khi đồng bộ PR' : 'Error syncing PR')
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!pr.id) return;
    setIsSaving(true);
    try {
      const res = await apiFetch<{
        success: boolean;
        pullRequest: PullRequestSummaryDto;
      }>(`/github/pull-requests/${pr.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: editTitle,
          authorGithub: editAuthor,
          headBranch: editHeadBranch,
          baseBranch: editBaseBranch,
          additions: editAdditions ? parseInt(editAdditions, 10) : undefined,
          deletions: editDeletions ? parseInt(editDeletions, 10) : undefined,
          changedFiles: editFiles ? parseInt(editFiles, 10) : undefined
        })
      });

      if (res.pullRequest) {
        setPr(res.pullRequest);
      }
      setIsEditOpen(false);
      setSyncFeedback({
        type: 'success',
        message: isVi ? 'Cập nhật thông tin PR thành công!' : 'PR details updated successfully!'
      });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setSyncFeedback({
        type: 'error',
        message: err.message || (isVi ? 'Không thể cập nhật PR' : 'Failed to update PR')
      });
    } finally {
      setIsSaving(false);
    }
  };

  const renderChecks = () => {
    switch (pr.checksStatus) {
      case PullRequestChecksStatus.PASSING:
        return (
          <Tooltip title={isVi ? 'Tất cả CI checks đều passed' : 'All CI checks passed'}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: '#3fb950', fontSize: '0.75rem', fontWeight: 600 }}>
              <CheckCircle2 size={14} />
              <span>{isVi ? 'Checks passed' : 'Checks passed'}</span>
            </Box>
          </Tooltip>
        );
      case PullRequestChecksStatus.PENDING:
        return (
          <Tooltip title={isVi ? 'CI checks đang thực hiện' : 'CI checks pending'}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: tokens.warning, fontSize: '0.75rem', fontWeight: 600 }}>
              <Clock size={14} />
              <span>{isVi ? 'Checks pending' : 'Checks pending'}</span>
            </Box>
          </Tooltip>
        );
      case PullRequestChecksStatus.FAILING:
        return (
          <Tooltip title={isVi ? 'Một số CI check bị lỗi' : 'Some CI checks failed'}>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: tokens.error, fontSize: '0.75rem', fontWeight: 600 }}>
              <XCircle size={14} />
              <span>{isVi ? 'Checks failing' : 'Checks failing'}</span>
            </Box>
          </Tooltip>
        );
      default:
        return null;
    }
  };

  const checkRunsCount = Array.isArray((pr.rawMetadata as any)?.check_runs)
    ? (pr.rawMetadata as any).check_runs.length
    : 0;

  return (
    <Box
      sx={{
        p: 2,
        my: 1.5,
        borderRadius: '8px',
        border: `1px solid ${tokens.border}`,
        backgroundColor: resolvedMode === 'dark' ? '#161b22' : '#ffffff',
        boxShadow: resolvedMode === 'dark' ? '0 2px 10px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        '&:hover': {
          borderColor: tokens.primary
        }
      }}
    >
      {/* Header row: State badge + Title + Action buttons */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', minWidth: 0, flex: 1 }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.6,
              px: 1,
              py: 0.35,
              borderRadius: '6px',
              backgroundColor: stateBg,
              color: stateColor,
              fontWeight: 700,
              fontSize: '0.75rem',
              border: `1px solid ${stateColor}44`,
              flexShrink: 0
            }}
          >
            <GitPullRequest size={14} />
            <span>{stateLabel}</span>
          </Box>

          <Link
            href={pr.url}
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            sx={{
              color: tokens.textPrimary,
              fontWeight: 700,
              fontSize: '0.95rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              wordBreak: 'break-word'
            }}
          >
            <span>#{pr.prNumber} {pr.title}</span>
            <ExternalLink size={14} color={tokens.textSecondary} style={{ flexShrink: 0, marginLeft: 2 }} />
          </Link>
        </Box>

        {/* Action buttons: Sync & Edit */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
          <Tooltip title={isVi ? 'Đồng bộ dữ liệu trực tiếp từ GitHub' : 'Sync fresh data directly from GitHub'}>
            <span>
              <Button
                size="small"
                variant="outlined"
                disabled={isSyncing}
                onClick={handleSyncPR}
                startIcon={isSyncing ? <CircularProgress size={12} /> : <RefreshCw size={12} className={isSyncing ? 'animate-spin' : ''} />}
                sx={{
                  fontSize: '0.75rem',
                  py: 0.4,
                  px: 1,
                  minWidth: 0,
                  height: 28,
                  borderColor: tokens.border,
                  color: tokens.textSecondary,
                  '&:hover': { color: tokens.textPrimary, borderColor: tokens.primary }
                }}
              >
                {isVi ? 'Đồng bộ GitHub' : 'Sync PR'}
              </Button>
            </span>
          </Tooltip>

          <Tooltip title={isVi ? 'Sửa thông tin PR thủ công' : 'Edit PR details manually'}>
            <IconButton
              size="small"
              onClick={() => setIsEditOpen(true)}
              sx={{
                width: 28,
                height: 28,
                border: `1px solid ${tokens.border}`,
                borderRadius: '6px',
                color: tokens.textSecondary,
                '&:hover': { color: tokens.primary, borderColor: tokens.primary }
              }}
            >
              <Edit3 size={13} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Sync feedback notification if any */}
      {syncFeedback && (
        <Box sx={{ mt: 1.5 }}>
          <Alert
            severity={syncFeedback.type}
            onClose={() => setSyncFeedback(null)}
            sx={{ py: 0.25, fontSize: '0.78rem', borderRadius: '6px' }}
          >
            {syncFeedback.message}
          </Alert>
        </Box>
      )}

      {/* Branch flow row */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, my: 1.2, flexWrap: 'wrap' }}>
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1,
            py: 0.3,
            borderRadius: '4px',
            backgroundColor: resolvedMode === 'dark' ? '#0d1117' : '#f1f5f9',
            border: `1px solid ${tokens.border}`,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.75rem',
            color: tokens.textPrimary
          }}
        >
          <GitBranch size={12} color={tokens.textSecondary} />
          <span>{pr.headBranch}</span>
        </Box>

        <ArrowRight size={13} color={tokens.textSecondary} />

        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1,
            py: 0.3,
            borderRadius: '4px',
            backgroundColor: resolvedMode === 'dark' ? '#0d1117' : '#f1f5f9',
            border: `1px solid ${tokens.border}`,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.75rem',
            color: tokens.textPrimary
          }}
        >
          <GitBranch size={12} color={tokens.textSecondary} />
          <span>{pr.baseBranch}</span>
        </Box>
      </Box>

      {/* Author attribution & repository source */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          pt: 1.2,
          borderTop: `1px solid ${tokens.divider}`,
          fontSize: '0.78rem',
          color: tokens.textSecondary,
          flexWrap: 'wrap'
        }}
      >
        {/* Author info */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography variant="caption" sx={{ color: tokens.textSecondary, fontWeight: 500 }}>
              {isVi ? 'Tác giả PR trên GitHub:' : 'PR Author on GitHub:'}
            </Typography>

            <Tooltip title={pr.authorGithub ? `@${pr.authorGithub} trên GitHub` : 'GitHub Author'}>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.5,
                  cursor: githubProfileUrl ? 'pointer' : 'default',
                  backgroundColor: resolvedMode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                  px: 0.75,
                  py: 0.2,
                  borderRadius: '4px',
                  border: `1px solid ${tokens.border}`,
                  transition: 'border-color 0.15s ease',
                  '&:hover': { borderColor: tokens.primary }
                }}
                onClick={() => githubProfileUrl && window.open(githubProfileUrl, '_blank')}
              >
                {pr.authorAvatar ? (
                  <Avatar src={pr.authorAvatar} sx={{ width: 18, height: 18 }} />
                ) : (
                  <Avatar sx={{ width: 18, height: 18, fontSize: '0.625rem', bgcolor: '#30363d', color: '#ffffff' }}>
                    {pr.authorGithub?.[0]?.toUpperCase() || '?'}
                  </Avatar>
                )}
                <Typography variant="caption" sx={{ fontWeight: 700, color: tokens.textPrimary }}>
                  @{pr.authorGithub || (isVi ? 'chưa rõ' : 'unknown')}
                </Typography>
              </Box>
            </Tooltip>
          </Box>

          {repoFullName && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" sx={{ color: tokens.textSecondary }}>{isVi ? 'tại repo' : 'in'}</Typography>
              <Chip
                label={repoFullName}
                size="small"
                variant="outlined"
                sx={{
                  height: 20,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  borderColor: tokens.border,
                  backgroundColor: resolvedMode === 'dark' ? '#0d1117' : '#f8fafc'
                }}
              />
            </Box>
          )}

          {/* Diff statistics with visual mini-bar */}
          {(pr.additions != null || pr.deletions != null || pr.changedFiles != null) && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, ml: 0.5 }}>
              {pr.changedFiles != null && (
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, color: tokens.textSecondary }}>
                  <FileCode size={13} />
                  <span>{pr.changedFiles} {isVi ? 'tệp đổi' : 'files'}</span>
                </Box>
              )}

              {pr.additions != null && (
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.2, color: '#3fb950', fontWeight: 700 }}>
                  <Plus size={12} />
                  <span>{pr.additions}</span>
                </Box>
              )}

              {pr.deletions != null && (
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.2, color: '#f85149', fontWeight: 700 }}>
                  <Minus size={12} />
                  <span>{pr.deletions}</span>
                </Box>
              )}

              {totalDiff > 0 && (
                <Box
                  sx={{
                    width: 38,
                    height: 5,
                    borderRadius: '2px',
                    backgroundColor: '#f85149',
                    overflow: 'hidden',
                    display: 'flex'
                  }}
                >
                  <Box sx={{ width: `${additionsRatio}%`, height: '100%', backgroundColor: '#3fb950' }} />
                </Box>
              )}
            </Box>
          )}

          {pr.reviewStatus && pr.reviewStatus !== 'PENDING' && (
            <Chip
              label={`Review: ${pr.reviewStatus}`}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.7rem',
                fontWeight: 600,
                backgroundColor: pr.reviewStatus === 'APPROVED' ? 'rgba(63, 185, 80, 0.15)' : 'rgba(248, 81, 73, 0.15)',
                color: pr.reviewStatus === 'APPROVED' ? '#3fb950' : '#f85149'
              }}
            />
          )}
        </Box>

        {/* Right side: CI Checks + toggle button */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {renderChecks()}

          {checkRunsCount > 0 && (
            <Button
              size="small"
              onClick={() => setShowCheckRuns(!showCheckRuns)}
              endIcon={showCheckRuns ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              sx={{
                fontSize: '0.72rem',
                py: 0.2,
                px: 0.8,
                minWidth: 0,
                color: tokens.textSecondary,
                textTransform: 'none'
              }}
            >
              {showCheckRuns ? (isVi ? 'Ẩn checks' : 'Hide checks') : `${checkRunsCount} checks`}
            </Button>
          )}
        </Box>
      </Box>

      {/* Expandable CI Check Runs Details */}
      {checkRunsCount > 0 && (
        <Collapse in={showCheckRuns}>
          <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px dashed ${tokens.border}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
              <ShieldCheck size={14} color={tokens.primary} />
              <Typography variant="caption" sx={{ fontWeight: 700, color: tokens.textPrimary }}>
                {isVi ? 'CHI TIẾT CÁC BƯỚC KIỂM TRA CI/CD' : 'CI/CD CHECK RUNS DETAILS'}
              </Typography>
            </Box>
            <CICheckRunsList
              rawMetadata={pr.rawMetadata}
              aggregateStatus={pr.checksStatus}
            />
          </Box>
        </Collapse>
      )}

      {/* Manual Edit Dialog */}
      <Dialog open={isEditOpen} onClose={() => setIsEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem', borderBottom: `1px solid ${tokens.border}` }}>
          {isVi ? 'Chỉnh sửa thông tin Pull Request liên kết' : 'Edit Linked Pull Request'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2.5 }}>
          <Alert severity="info" sx={{ fontSize: '0.8rem', borderRadius: '6px' }}>
            {isVi
              ? 'Dùng chức năng này khi bạn muốn sửa tên tác giả GitHub, tiêu đề PR hoặc các nhánh nguồn/đích nếu GitHub token chưa được kết nối.'
              : 'Use this to manually correct PR author, title, or branches if live sync is unavailable.'}
          </Alert>

          <TextField
            label={isVi ? 'Tiêu đề Pull Request' : 'PR Title'}
            size="small"
            fullWidth
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />

          <TextField
            label={isVi ? 'Tác giả PR trên GitHub (username)' : 'GitHub Author (@username)'}
            size="small"
            fullWidth
            helperText={isVi ? 'Ví dụ: hoaug-tran hoặc tên lập trình viên mở PR trên GitHub' : 'e.g. hoaug-tran or collaborator GitHub username'}
            value={editAuthor}
            onChange={(e) => setEditAuthor(e.target.value)}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label={isVi ? 'Nhánh nguồn (Head branch)' : 'Head branch'}
              size="small"
              fullWidth
              value={editHeadBranch}
              onChange={(e) => setEditHeadBranch(e.target.value)}
            />
            <TextField
              label={isVi ? 'Nhánh đích (Base branch)' : 'Base branch'}
              size="small"
              fullWidth
              value={editBaseBranch}
              onChange={(e) => setEditBaseBranch(e.target.value)}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label={isVi ? 'Số tệp thay đổi' : 'Files changed'}
              size="small"
              type="number"
              fullWidth
              value={editFiles}
              onChange={(e) => setEditFiles(e.target.value)}
            />
            <TextField
              label={isVi ? 'Số dòng thêm (+)' : 'Additions (+)'}
              size="small"
              type="number"
              fullWidth
              value={editAdditions}
              onChange={(e) => setEditAdditions(e.target.value)}
            />
            <TextField
              label={isVi ? 'Số dòng xoá (-)' : 'Deletions (-)'}
              size="small"
              type="number"
              fullWidth
              value={editDeletions}
              onChange={(e) => setEditDeletions(e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: `1px solid ${tokens.border}` }}>
          <Button onClick={() => setIsEditOpen(false)} color="inherit">
            {isVi ? 'Huỷ' : 'Cancel'}
          </Button>
          <Button
            variant="contained"
            disabled={isSaving}
            onClick={handleSaveEdit}
            startIcon={isSaving ? <CircularProgress size={14} /> : undefined}
          >
            {isVi ? 'Lưu thay đổi' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
