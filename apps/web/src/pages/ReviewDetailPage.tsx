import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Chip, Divider, CircularProgress, Breadcrumbs,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert,
  Select, MenuItem, IconButton, Tooltip
} from '@mui/material';
import {
  CheckSquare, CheckCircle2, AlertCircle, Clock, Edit3, Trash2,
  AlertTriangle, Check, Plus, FolderGit2, GitBranch, GitPullRequest,
  Eye, ListChecks, Code2, X
} from 'lucide-react';
import { useRoute, useLocation, Link } from 'wouter';
import { useThemeContext } from '../contexts/ThemeContext';
import { useAuthContext } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useI18n } from '../contexts/I18nContext';
import { StatusBadge } from '../components/issues/StatusBadge';
import { UserAvatar } from '../components/common/UserAvatar';
import { MarkdownRenderer } from '../components/markdown/MarkdownRenderer';
import { MarkdownEditor } from '../components/editor/MarkdownEditor';
import { PullRequestPreview } from '../components/github/PullRequestPreview';
import { CommentThread } from '../components/discussion/CommentThread';
import { DetailSkeleton } from '../components/common/Skeletons';
import { useSmoothLoading } from '../hooks/useSmoothLoading';
import { MediaFilesLinksSidebar } from '../components/common/MediaFilesLinksSidebar';
import { ReviewDecisionDialog } from '../components/reviews/ReviewDecisionDialog';
import { AcknowledgementBadge } from '../components/reviews/AcknowledgementBadge';
import { CICheckRunsList } from '../components/github/CICheckRunsList';
import { toast } from '../contexts/ToastContext';
import { apiFetch, ApiError } from '../api/client';
import {
  TargetType, ReviewDetailDto, ReviewerAssignmentDto, CommentDto,
  ReviewerDecision, ReviewType, ReviewStatus, UserSummaryDto, RepositoryDto,
  IssueLabelDto, ActivityTimelineDto
} from '@reported/contracts';
import { NotFoundPage } from './NotFoundPage';
import { AccessDeniedPage } from './AccessDeniedPage';

const PRESET_LABELS = [
  'review', 'pr', 'architecture', 'security', 'frontend', 'backend',
  'performance', 'refactor', 'urgent', 'blocked'
];

const ackStatusConfig: Record<string, { labelVi: string; labelEn: string; icon: React.ReactNode; color: string; bg: string }> = {
  SEEN: {
    labelVi: 'Đã xem',
    labelEn: 'Seen',
    icon: <Eye size={13} />,
    color: '#64748b',
    bg: 'rgba(100, 116, 139, 0.12)'
  },
  CHECKING: {
    labelVi: 'Sẽ xem',
    labelEn: "I'll check",
    icon: <ListChecks size={13} />,
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.12)'
  },
  REVIEWING: {
    labelVi: 'Đang review',
    labelEn: 'Reviewing',
    icon: <Code2 size={13} />,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)'
  },
  DONE: {
    labelVi: 'Đã xong',
    labelEn: 'Done',
    icon: <CheckCircle2 size={13} />,
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)'
  }
};

export const ReviewDetailPage: React.FC = () => {
  const { tokens } = useThemeContext();
  const { user } = useAuthContext();
  const { activeWorkspace, projects } = useWorkspace();
  const { language } = useI18n();
  const isVi = language === 'vi';
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/reviews/:number');

  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState<ReviewDetailDto | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [activities, setActivities] = useState<ActivityTimelineDto[]>([]);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);

  const [usersList, setUsersList] = useState<UserSummaryDto[]>([]);
  const [repositoriesList, setRepositoriesList] = useState<RepositoryDto[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editReviewType, setEditReviewType] = useState<ReviewType>(ReviewType.CODE);
  const [editStatus, setEditStatus] = useState<ReviewStatus>(ReviewStatus.PENDING_REVIEW);
  const [editDeadline, setEditDeadline] = useState('');
  const [editProjectId, setEditProjectId] = useState<string>('');
  const [editRepositoryId, setEditRepositoryId] = useState<string>('');
  const [editBranch, setEditBranch] = useState('');
  const [editCommitHash, setEditCommitHash] = useState('');
  const [editPrUrl, setEditPrUrl] = useState('');
  const [editReviewerIds, setEditReviewerIds] = useState<string[]>([]);
  const [editLabels, setEditLabels] = useState<string[]>([]);
  const [newLabelInput, setNewLabelInput] = useState('');

  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchReviewData = async (skipPrSync = false) => {
    if (!params?.number) return;
    try {
      const data = await apiFetch<ReviewDetailDto>(`/reviews/${params.number}`, { skipCache: true });
      setReview(data);
      setErrorStatus(null);

      const [commData, actData] = await Promise.all([
        apiFetch<CommentDto[]>(`/comments?targetType=REVIEW&targetId=${data.id}`),
        apiFetch<ActivityTimelineDto[]>(`/activity?targetType=REVIEW&targetId=${data.id}`).catch(() => [])
      ]);
      setComments(commData);
      setActivities(actData || []);

      if (data.pullRequest?.id && !skipPrSync) {
        apiFetch<{ success: boolean; hasChanges?: boolean }>(`/github/pull-requests/${data.pullRequest.id}/sync`, { method: 'POST' })
          .then((res) => {
            if (res?.hasChanges) {
              toast.info(isVi ? 'Pull Request có cập nhật mới. Đã chuyển trạng thái sang Chờ review.' : 'Pull Request synced with new changes. Status updated to Pending.');
              fetchReviewData(true);
            }
          })
          .catch(() => {});
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setErrorStatus(err.status);
      } else {
        setErrorStatus(404);
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviewData();
  }, [params?.number]);

  useEffect(() => {
    const loadResources = async () => {
      if (!activeWorkspace) return;
      try {
        const [membersRes, reposRes] = await Promise.all([
          apiFetch<Array<{ userId: string; username: string; displayName: string; avatarUrl?: string | null; role: string }>>(
            `/workspaces/${activeWorkspace.id}/members`
          ),
          apiFetch<RepositoryDto[]>('/github/repositories')
        ]);
        const mappedUsers: UserSummaryDto[] = (membersRes || []).map((m) => ({
          id: m.userId,
          username: m.username,
          displayName: m.displayName,
          avatarUrl: m.avatarUrl,
          email: '',
          role: m.role as any
        }));
        setUsersList(mappedUsers);
        setRepositoriesList(reposRes || []);
      } catch {
      }
    };
    loadResources();
  }, [activeWorkspace?.id]);

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!review) {
    if (errorStatus === 403) {
      return <AccessDeniedPage isDeleted={true} />;
    }
    return <NotFoundPage message={isVi ? 'Không tìm thấy yêu cầu review' : 'Review request not found'} />;
  }

  const handleOpenEdit = () => {
    if (!review) return;
    setEditTitle(review.title);
    setEditDescription(review.description || '');
    setEditReviewType(review.reviewType || ReviewType.CODE);
    setEditStatus(review.status || ReviewStatus.PENDING_REVIEW);
    setEditDeadline(review.deadline ? review.deadline.slice(0, 10) : '');
    setEditProjectId(review.projectId || '');
    setEditRepositoryId(review.repository?.id || '');
    setEditBranch(review.branch || '');
    setEditCommitHash(review.commitHash || '');
    setEditPrUrl(review.pullRequest?.url || '');
    setEditReviewerIds(review.reviewers ? review.reviewers.map((r) => r.user.id) : []);
    setEditLabels(review.labels ? review.labels.map((l) => l.name) : []);
    setNewLabelInput('');
    setEditError(null);
    setEditOpen(true);
  };

  const handleToggleLabel = (labelName: string) => {
    setEditLabels((prev) =>
      prev.includes(labelName) ? prev.filter((l) => l !== labelName) : [...prev, labelName]
    );
  };

  const handleAddCustomLabel = () => {
    const trimmed = newLabelInput.trim().toLowerCase();
    if (trimmed && !editLabels.includes(trimmed)) {
      setEditLabels((prev) => [...prev, trimmed]);
      setNewLabelInput('');
    }
  };

  const handleSaveEdit = async () => {
    if (!review) return;
    if (!editTitle.trim()) {
      setEditError(isVi ? 'Tiêu đề không được để trống' : 'Title cannot be empty');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const payload: Record<string, unknown> = {
        title: editTitle.trim(),
        description: editDescription.trim(),
        reviewType: editReviewType,
        status: editStatus,
        deadline: editDeadline ? new Date(editDeadline).toISOString() : null,
        projectId: editProjectId ? editProjectId : null,
        repositoryId: editRepositoryId ? editRepositoryId : null,
        branch: editBranch.trim() ? editBranch.trim() : null,
        commitHash: editCommitHash.trim() ? editCommitHash.trim() : null,
        prUrl: editPrUrl.trim() ? editPrUrl.trim() : null,
        reviewerIds: editReviewerIds,
        labels: editLabels
      };

      await apiFetch(`/reviews/${review.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });

      setEditOpen(false);
      await fetchReviewData();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update review');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!review) return;
    setDeleting(true);
    try {
      await apiFetch(`/reviews/${review.id}`, { method: 'DELETE' });
      setDeleteDialogOpen(false);
      await fetchReviewData();
    } catch (err) {
      console.error('Failed to delete review:', err);
    } finally {
      setDeleting(false);
    }
  };

  const isLeader = activeWorkspace?.ownerId === user?.id || activeWorkspace?.role === 'OWNER' || activeWorkspace?.role === 'ADMIN' || user?.role === 'ADMIN';
  const isAuthor = Boolean(user && review?.author?.id && user.id === review.author.id);
  const isReviewer = Boolean(user && review?.reviewers?.some((r) => r.user.id === user.id));
  const isMember = Boolean(user && activeWorkspace);

  const canEdit = isAuthor || isLeader || isMember;
  const canChangeStatus = isAuthor || isLeader || isReviewer || isMember;

  const handleStatusChange = async (newStatus: ReviewStatus) => {
    if (!review || !canChangeStatus) return;
    try {
      await apiFetch(`/reviews/${review.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      await fetchReviewData(true);
    } catch (err) {
      console.error('Failed to change status:', err);
    }
  };

  const handleRemoveReviewer = async (reviewerUserId: string) => {
    if (!review || !canEdit) return;
    const nextIds = (review.reviewers || []).filter((r) => r.user.id !== reviewerUserId).map((r) => r.user.id);
    try {
      await apiFetch(`/reviews/${review.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ reviewerIds: nextIds })
      });
      toast.success(isVi ? 'Đã xoá reviewer khỏi bài review' : 'Reviewer removed');
      fetchReviewData(true);
    } catch (err) {
      toast.error(isVi ? 'Không thể xoá reviewer' : 'Failed to remove reviewer');
    }
  };
  const currentProject = projects.find((p) => p.id === review.projectId);

  return (
    <Box sx={{ width: '100%' }}>

      <Breadcrumbs sx={{ mb: 1.5, fontSize: '0.8125rem' }}>
        <Link href="/reviews">
          <Typography variant="caption" sx={{ color: tokens.textSecondary, cursor: 'pointer', '&:hover': { color: tokens.primary } }}>
            Reviews
          </Typography>
        </Link>
        <Typography variant="caption" sx={{ color: tokens.textPrimary, fontWeight: 600 }}>
          #{review.number}
        </Typography>
      </Breadcrumbs>

      {review.isDeleted && (
        <Alert
          severity="warning"
          icon={<AlertTriangle size={18} />}
          sx={{
            mb: 2.5,
            borderRadius: '6px',
            backgroundColor: 'rgba(210, 153, 34, 0.10)',
            border: '1px solid rgba(210, 153, 34, 0.30)',
            '& .MuiAlert-message': { width: '100%' }
          }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, color: '#d2991e' }}>
              {isVi ? 'Yêu cầu review này đã bị xoá' : 'This review request has been deleted'}
            </Typography>
            {(review as any).deletedBy && (
              <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
                {isVi ? 'Người xoá' : 'Deleted by'}{': '}
                <strong>@{(review as any).deletedBy.username}</strong>
                {(review as any).deletedAt && (
                  <> {isVi ? 'lúc' : 'at'} {new Date((review as any).deletedAt).toLocaleString()}</>
                )}
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
              {isVi
                ? 'Nội dung, quyết định đánh giá và lịch sử vẫn được lưu trữ. Chỉ tác giả hoặc quản trị viên mới thấy được.'
                : 'Content, reviewer decisions, and history are preserved. Only the author or admins can view this.'}
            </Typography>
          </Box>
        </Alert>
      )}


      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 340px' }, gap: 3.5, alignItems: 'start' }}>

        <Box sx={{ minWidth: 0 }}>

          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
              <Typography variant="h1" sx={{ fontWeight: 700, mb: 1, letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                {review.title}
              </Typography>
              {canEdit && !review.isDeleted && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Edit3 size={15} />}
                    onClick={handleOpenEdit}
                    sx={{
                      borderRadius: '6px',
                      borderColor: tokens.border,
                      color: tokens.textPrimary,
                      textTransform: 'none',
                      fontSize: '0.8125rem',
                      fontWeight: 600
                    }}
                  >
                    {isVi ? 'Sửa yêu cầu' : 'Edit'}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<Trash2 size={15} />}
                    onClick={() => setDeleteDialogOpen(true)}
                    sx={{
                      borderRadius: '6px',
                      borderColor: 'rgba(248, 81, 73, 0.4)',
                      color: tokens.error,
                      textTransform: 'none',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      '&:hover': {
                        borderColor: tokens.error,
                        backgroundColor: 'rgba(248, 81, 73, 0.1)'
                      }
                    }}
                  >
                    {isVi ? 'Xóa yêu cầu' : 'Delete'}
                  </Button>
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', color: tokens.textSecondary, fontSize: '0.8125rem' }}>
              <StatusBadge status={review.status} size="medium" />
              <Chip
                label={review.reviewType === ReviewType.PR ? 'Pull Request (PR)' : review.reviewType === ReviewType.CODE ? 'Code Review' : review.reviewType}
                sx={{
                  fontWeight: 600,
                  height: 24,
                  fontSize: '0.78rem',
                  borderRadius: '6px',
                  backgroundColor: tokens.surfaceSecondary,
                  border: `1px solid ${tokens.border}`,
                  color: tokens.textPrimary
                }}
              />
              <span>
                {isVi ? 'Yêu cầu bởi' : 'Requested by'} <strong>@{review.author.username}</strong> • {new Date(review.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span>
                • {isVi ? 'Hạn chót' : 'Deadline'}: {review.deadline ? new Date(review.deadline).toLocaleDateString() : (isVi ? '(Không có hạn chót)' : '(No deadline)')}
              </span>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mb: 3 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 1 }}>
              {isVi ? 'MÔ TẢ CHI TIẾT' : 'DESCRIPTION'}
            </Typography>
            <MarkdownRenderer content={review.description || (isVi ? '(Không có mô tả bổ sung)' : '(No description provided)')} />
          </Box>

          {review.pullRequest && (
            <Box sx={{ my: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, textTransform: 'uppercase' }}>
                ASSOCIATED PULL REQUEST
              </Typography>
              <PullRequestPreview
                pr={review.pullRequest}
                repoFullName={review.repository?.fullName}
                onRefresh={fetchReviewData}
              />
            </Box>
          )}

          <CommentThread
            targetType={TargetType.REVIEW}
            targetId={review.id}
            comments={comments}
            activities={activities}
            onRefresh={fetchReviewData}
            childrenBeforeEditor={
              <Box sx={{ mb: 2 }}>
                <AcknowledgementBadge
                  reviewId={review.id}
                  reviewers={review.reviewers || []}
                  onUpdated={fetchReviewData}
                />
              </Box>
            }
          />
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2.5,
            p: { xs: 2, sm: 2.5 },
            borderRadius: '8px',
            border: `1px solid ${tokens.border}`,
            backgroundColor: tokens.surface,
            position: { xs: 'static', lg: 'sticky' },
            top: 16,
            maxHeight: { lg: 'calc(100vh - 100px)' },
            overflowY: { lg: 'auto' },
            overscrollBehavior: 'auto',
            '&::-webkit-scrollbar': { width: 6 },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: tokens.border,
              borderRadius: 3,
              '&:hover': { backgroundColor: tokens.textSecondary }
            }
          }}
        >

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
              {isVi ? 'TRẠNG THÁI' : 'STATUS'}
            </Typography>
            <Select
              size="small"
              fullWidth
              value={(review.status as string) === 'PENDING' ? ReviewStatus.PENDING_REVIEW : review.status}
              disabled={review.isDeleted || !canChangeStatus}
              onChange={(e) => handleStatusChange(e.target.value as ReviewStatus)}
              sx={{ fontSize: '0.8125rem' }}
            >
              <MenuItem value={ReviewStatus.PENDING_REVIEW}>{isVi ? 'Chờ review' : 'Pending Review'}</MenuItem>
              <MenuItem value={ReviewStatus.IN_REVIEW}>{isVi ? 'Đang review' : 'In Review'}</MenuItem>
              <MenuItem value={ReviewStatus.CHANGES_REQUESTED}>{isVi ? 'Yêu cầu chỉnh sửa' : 'Changes Requested'}</MenuItem>
              <MenuItem value={ReviewStatus.APPROVED}>{isVi ? 'Đã duyệt' : 'Approved'}</MenuItem>
              <MenuItem value={ReviewStatus.CLOSED}>{isVi ? 'Đã đóng' : 'Closed'}</MenuItem>
            </Select>
          </Box>

          <Box>
            <Button
              fullWidth
              variant="contained"
              disabled={review.isDeleted}
              startIcon={<CheckSquare size={16} />}
              onClick={() => setDecisionModalOpen(true)}
              sx={{ py: 1, textTransform: 'none' }}
            >
              {isVi ? 'Gửi quyết định review' : 'Submit Review Decision'}
            </Button>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
              {isVi ? 'DỰ ÁN' : 'PROJECT'}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8125rem', color: currentProject ? tokens.textPrimary : tokens.textSecondary }}>
              {currentProject ? currentProject.name : (isVi ? '(Chưa phân loại dự án)' : '(No project assigned)')}
            </Typography>
          </Box>

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 1 }}>
              {isVi ? 'DANH SÁCH REVIEWER' : 'REVIEWERS'} ({review.reviewers?.length || 0})
            </Typography>

            {!review.reviewers || review.reviewers.length === 0 ? (
              <Typography variant="body2" sx={{ color: tokens.textSecondary, fontSize: '0.8125rem', fontStyle: 'italic' }}>
                {isVi ? '(Chưa chỉ định người review)' : '(No reviewers assigned)'}
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                {review.reviewers.map((r: ReviewerAssignmentDto) => {
                  const isApproved = r.status === ReviewerDecision.APPROVED;
                  const isChangesReq = r.status === ReviewerDecision.CHANGES_REQUESTED;
                  const isPending = r.status === ReviewerDecision.PENDING;

                  return (
                    <Box
                      key={r.user.id}
                      sx={{
                        p: 1.2,
                        borderRadius: '6px',
                        border: `1px solid ${tokens.border}`,
                        backgroundColor: tokens.surface
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <UserAvatar user={r.user} size={22} />
                          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                            {r.user.displayName}
                          </Typography>
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          {isApproved && (
                            <Chip
                              icon={<CheckCircle2 size={14} />}
                              label={isVi ? 'Đã duyệt' : 'Approved'}
                              sx={{
                                height: 24,
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                borderRadius: '6px',
                                backgroundColor: 'rgba(63, 185, 80, 0.15)',
                                color: tokens.success,
                                border: '1px solid rgba(63, 185, 80, 0.25)'
                              }}
                            />
                          )}
                          {isChangesReq && (
                            <Chip
                              icon={<AlertCircle size={14} />}
                              label={isVi ? 'Yêu cầu sửa' : 'Changes'}
                              sx={{
                                height: 24,
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                borderRadius: '6px',
                                backgroundColor: 'rgba(248, 81, 73, 0.15)',
                                color: tokens.error,
                                border: '1px solid rgba(248, 81, 73, 0.25)'
                              }}
                            />
                          )}
                          {isPending && (
                            <Chip
                              icon={<Clock size={14} />}
                              label={isVi ? 'Chờ review' : 'Pending'}
                              sx={{
                                height: 24,
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                borderRadius: '6px',
                                backgroundColor: 'rgba(210, 153, 34, 0.15)',
                                color: tokens.warning,
                                border: '1px solid rgba(210, 153, 34, 0.25)'
                              }}
                            />
                          )}

                          {canEdit && (
                            <Tooltip title={isVi ? 'Xoá reviewer' : 'Remove reviewer'}>
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveReviewer(r.user.id)}
                                sx={{
                                  p: 0.3,
                                  color: tokens.textSecondary,
                                  '&:hover': { color: tokens.error, backgroundColor: 'rgba(248, 81, 73, 0.1)' }
                                }}
                              >
                                <X size={14} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </Box>

                      {r.acknowledgementStatus && ackStatusConfig[r.acknowledgementStatus] && (() => {
                        const ack = ackStatusConfig[r.acknowledgementStatus];
                        return (
                          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                            <Chip
                              icon={ack.icon as React.ReactElement}
                              label={`${isVi ? 'Xác nhận' : 'Status'}: ${isVi ? ack.labelVi : ack.labelEn}`}
                              sx={{
                                height: 24,
                                fontSize: '0.76rem',
                                fontWeight: 600,
                                borderRadius: '6px',
                                backgroundColor: ack.bg,
                                color: ack.color,
                                border: `1px solid ${ack.color}40`,
                                '& .MuiChip-icon': {
                                  color: 'inherit'
                                }
                              }}
                            />
                          </Box>
                        );
                      })()}

                      {r.decisionNote && (
                        <Typography variant="caption" sx={{ display: 'block', color: tokens.textSecondary, fontStyle: 'italic', mt: 0.8 }}>
                          "{r.decisionNote}"
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.8 }}>
              {isVi ? 'NHÃN' : 'LABELS'}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
              {!review.labels || review.labels.length === 0 ? (
                <Typography variant="body2" sx={{ color: tokens.textSecondary, fontSize: '0.8125rem', fontStyle: 'italic' }}>
                  {isVi ? '(Không có nhãn)' : '(No labels)'}
                </Typography>
              ) : (
                review.labels.map((lbl: IssueLabelDto) => (
                  <Chip
                    key={lbl.id}
                    label={lbl.name}
                    sx={{
                      height: 24,
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      backgroundColor: `${lbl.color}15`,
                      color: lbl.color,
                      border: `1px solid ${lbl.color}35`
                    }}
                  />
                ))
              )}
            </Box>
          </Box>

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
              {isVi ? 'KHO LƯU TRỮ' : 'REPOSITORY'}
            </Typography>
            {review.repository ? (
              <>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                  {review.repository.fullName}
                </Typography>
                {review.branch && (
                  <Box component="code" sx={{ display: 'block', mt: 0.5, fontSize: '0.75rem', color: tokens.textSecondary }}>
                    {review.branch}
                  </Box>
                )}
              </>
            ) : (
              <Typography variant="body2" sx={{ color: tokens.textSecondary, fontSize: '0.8125rem', fontStyle: 'italic' }}>
                {isVi ? '(Chưa liên kết kho lưu trữ)' : '(No repository linked)'}
              </Typography>
            )}
          </Box>

          {review.pullRequest && (
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.8 }}>
                {isVi ? 'CI / KIỂM TRA' : 'CI / BUILD CHECKS'}
              </Typography>
              <CICheckRunsList
                rawMetadata={(review.pullRequest as any).rawMetadata}
                aggregateStatus={review.pullRequest.checksStatus}
              />
            </Box>
          )}

          <Divider sx={{ borderColor: tokens.border, my: 1 }} />

          <MediaFilesLinksSidebar
            targetType="REVIEW"
            targetId={review.id}
            content={review.description}
            comments={comments}
            prUrl={review.pullRequest?.url}
            isVi={isVi}
          />
        </Box>
      </Box>


      <ReviewDecisionDialog
        open={decisionModalOpen}
        reviewId={review.id}
        onClose={() => setDecisionModalOpen(false)}
        onSuccess={fetchReviewData}
      />

      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: '8px',
            backgroundColor: tokens.surface,
            border: `1px solid ${tokens.border}`,
            backgroundImage: 'none',
            maxWidth: 440
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AlertTriangle size={20} color={tokens.error} />
          {isVi ? `Xóa yêu cầu review #${review.number}?` : `Delete review #${review.number}?`}
        </DialogTitle>
        <DialogContent sx={{ py: 1.5 }}>
          <Typography variant="body2" sx={{ color: tokens.textSecondary, lineHeight: 1.6 }}>
            {isVi
              ? 'Yêu cầu review này sẽ được chuyển sang trạng thái đã xóa và ghi nhận trong nhật ký đối soát (audit trail). Toàn bộ ý kiến đánh giá và lịch sử trao đổi vẫn được bảo lưu.'
              : 'This review will be marked as deleted and recorded in the audit trail. All comments and decisions are preserved.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderColor: tokens.border }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
            sx={{ borderRadius: '6px', color: tokens.textSecondary, textTransform: 'none' }}
          >
            {isVi ? 'Hủy' : 'Cancel'}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteReview}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <Trash2 size={16} />}
            sx={{ borderRadius: '6px', textTransform: 'none' }}
          >
            {deleting ? (isVi ? 'Đang xóa...' : 'Deleting...') : (isVi ? 'Xác nhận xóa' : 'Confirm Delete')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editOpen}
        onClose={() => !editSaving && setEditOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '8px',
            backgroundColor: tokens.surface,
            border: `1px solid ${tokens.border}`,
            backgroundImage: 'none'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          {isVi ? 'Chỉnh sửa yêu cầu review' : 'Edit Review Request'}
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: tokens.border, display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
          {editError && (
            <Alert severity="error" sx={{ borderRadius: '6px' }}>{editError}</Alert>
          )}

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
              {isVi ? 'TIÊU ĐỀ *' : 'TITLE *'}
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder={isVi ? 'Nhập tiêu đề review...' : 'Enter review title...'}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
            />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
                {isVi ? 'LOẠI REVIEW' : 'REVIEW TYPE'}
              </Typography>
              <Select
                fullWidth
                size="small"
                value={editReviewType}
                onChange={(e) => setEditReviewType(e.target.value as ReviewType)}
                sx={{ borderRadius: '6px' }}
              >
                <MenuItem value={ReviewType.CODE}>{isVi ? 'Triển khai Code' : 'Code Implementation'}</MenuItem>
                <MenuItem value={ReviewType.PR}>{isVi ? 'Review Pull Request' : 'Pull Request Review'}</MenuItem>
                <MenuItem value={ReviewType.ARCHITECTURE}>{isVi ? 'Kiến trúc & Thiết kế' : 'Architecture & Design'}</MenuItem>
                <MenuItem value={ReviewType.SECURITY}>{isVi ? 'Bảo mật' : 'Security Review'}</MenuItem>
                <MenuItem value={ReviewType.API}>{isVi ? 'API & Tích hợp' : 'API & Integration'}</MenuItem>
                <MenuItem value={ReviewType.DATABASE}>{isVi ? 'Cơ sở dữ liệu' : 'Database & Schema'}</MenuItem>
                <MenuItem value={ReviewType.UI}>{isVi ? 'Giao diện & Frontend' : 'UI & Frontend'}</MenuItem>
                <MenuItem value={ReviewType.DOCUMENTATION}>{isVi ? 'Tài liệu' : 'Documentation'}</MenuItem>
              </Select>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
                {isVi ? 'TRẠNG THÁI' : 'STATUS'}
              </Typography>
              <Select
                fullWidth
                size="small"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as ReviewStatus)}
                sx={{ borderRadius: '6px' }}
              >
                <MenuItem value={ReviewStatus.PENDING_REVIEW}>{isVi ? 'Chờ review' : 'Pending Review'}</MenuItem>
                <MenuItem value={ReviewStatus.IN_REVIEW}>{isVi ? 'Đang review' : 'In Review'}</MenuItem>
                <MenuItem value={ReviewStatus.CHANGES_REQUESTED}>{isVi ? 'Yêu cầu chỉnh sửa' : 'Changes Requested'}</MenuItem>
                <MenuItem value={ReviewStatus.APPROVED}>{isVi ? 'Đã duyệt' : 'Approved'}</MenuItem>
                <MenuItem value={ReviewStatus.CLOSED}>{isVi ? 'Đã đóng' : 'Closed'}</MenuItem>
              </Select>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
                {isVi ? 'HẠN CHÓT' : 'DEADLINE'}
              </Typography>
              <TextField
                fullWidth
                size="small"
                type="date"
                value={editDeadline}
                onChange={(e) => setEditDeadline(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
              />
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
                {isVi ? 'DỰ ÁN' : 'PROJECT'}
              </Typography>
              <Select
                fullWidth
                size="small"
                value={editProjectId}
                onChange={(e) => setEditProjectId(e.target.value)}
                sx={{ borderRadius: '6px' }}
              >
                <MenuItem value="">{isVi ? '(Không gán dự án)' : '(None)'}</MenuItem>
                {projects.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.name} ({p.key})</MenuItem>
                ))}
              </Select>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
                {isVi ? 'KHO MÃ NGUỒN' : 'REPOSITORY'}
              </Typography>
              <Select
                fullWidth
                size="small"
                value={editRepositoryId}
                onChange={(e) => setEditRepositoryId(e.target.value)}
                sx={{ borderRadius: '6px' }}
              >
                <MenuItem value="">{isVi ? '(Không liên kết kho)' : '(None)'}</MenuItem>
                {repositoriesList.map((r) => (
                  <MenuItem key={r.id} value={r.id}>{r.fullName}</MenuItem>
                ))}
              </Select>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
                {isVi ? 'NHÁNH (BRANCH)' : 'BRANCH'}
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={editBranch}
                onChange={(e) => setEditBranch(e.target.value)}
                placeholder="main, feature/pr..."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
              />
            </Box>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
                {isVi ? 'COMMIT HASH' : 'COMMIT HASH'}
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={editCommitHash}
                onChange={(e) => setEditCommitHash(e.target.value)}
                placeholder="a1b2c3d..."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
              />
            </Box>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
                {isVi ? 'LINK PULL REQUEST' : 'PR URL'}
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={editPrUrl}
                onChange={(e) => setEditPrUrl(e.target.value)}
                placeholder="https://github.com/..."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
              />
            </Box>
          </Box>

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
              {isVi ? 'NGƯỜI REVIEW' : 'REVIEWERS'}
            </Typography>
            <Select
              multiple
              fullWidth
              size="small"
              value={editReviewerIds}
              onChange={(e) => setEditReviewerIds(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((val) => {
                    const u = usersList.find((usr) => usr.id === val)
                      || review?.reviewers?.find((r) => r.user.id === val)?.user;
                    const isFormer = !usersList.some((usr) => usr.id === val);
                    return (
                      <Chip
                        key={val}
                        size="small"
                        label={
                          isFormer
                            ? `${u?.displayName || val} (${isVi ? 'Đã rời WS' : 'Former'})`
                            : (u?.displayName || val)
                        }
                        color={isFormer ? 'warning' : 'default'}
                        onDelete={(e) => {
                          e.stopPropagation();
                          setEditReviewerIds((prev) => prev.filter((id) => id !== val));
                        }}
                        sx={{ height: 24, fontSize: '0.75rem' }}
                      />
                    );
                  })}
                </Box>
              )}
              sx={{ borderRadius: '6px' }}
            >
              {usersList.map((usr) => (
                <MenuItem key={usr.id} value={usr.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <UserAvatar user={usr} size={20} />
                    <Typography variant="body2">{usr.displayName} (@{usr.username})</Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </Box>

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
              {isVi ? 'NHÃN (LABELS)' : 'LABELS'}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8, mb: 1.2 }}>
              {PRESET_LABELS.map((lbl) => {
                const active = editLabels.includes(lbl);
                return (
                  <Chip
                    key={lbl}
                    label={lbl}
                    size="small"
                    onClick={() => handleToggleLabel(lbl)}
                    icon={active ? <Check size={12} /> : undefined}
                    sx={{
                      height: 24,
                      cursor: 'pointer',
                      borderRadius: '6px',
                      backgroundColor: active ? 'rgba(56, 139, 253, 0.2)' : 'rgba(110, 118, 129, 0.1)',
                      color: active ? tokens.primary : tokens.textSecondary,
                      border: `1px solid ${active ? tokens.primary : tokens.border}`
                    }}
                  />
                );
              })}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                placeholder={isVi ? 'Thêm nhãn tùy chỉnh...' : 'Add custom label...'}
                value={newLabelInput}
                onChange={(e) => setNewLabelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomLabel();
                  }
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' }, maxWidth: 260 }}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<Plus size={14} />}
                onClick={handleAddCustomLabel}
                sx={{ borderRadius: '6px', textTransform: 'none' }}
              >
                {isVi ? 'Thêm' : 'Add'}
              </Button>
            </Box>
          </Box>

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
              {isVi ? 'MÔ TẢ CHI TIẾT' : 'DESCRIPTION'}
            </Typography>
            <MarkdownEditor
              value={editDescription}
              onChange={setEditDescription}
              targetType="REVIEW"
              targetId={review.id}
              placeholder={isVi ? 'Mô tả chi tiết những gì cần review...' : 'Detailed description for reviewers...'}
              minRows={5}
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, borderColor: tokens.border }}>
          <Button
            onClick={() => setEditOpen(false)}
            disabled={editSaving}
            sx={{ borderRadius: '6px', color: tokens.textSecondary, textTransform: 'none' }}
          >
            {isVi ? 'Hủy' : 'Cancel'}
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveEdit}
            disabled={editSaving}
            sx={{ borderRadius: '6px', minWidth: 100, textTransform: 'none' }}
          >
            {editSaving ? (isVi ? 'Đang lưu...' : 'Saving...') : (isVi ? 'Lưu thay đổi' : 'Save Changes')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

