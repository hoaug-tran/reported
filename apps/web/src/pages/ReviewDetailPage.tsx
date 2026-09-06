import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Chip, Divider, CircularProgress, Breadcrumbs,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert,
  Select, MenuItem
} from '@mui/material';
import {
  CheckSquare, CheckCircle2, AlertCircle, Clock, Edit3, Trash2,
  AlertTriangle, Check, Plus, FolderGit2, GitBranch, GitPullRequest
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
import { ReviewDecisionDialog } from '../components/reviews/ReviewDecisionDialog';
import { AcknowledgementBadge } from '../components/reviews/AcknowledgementBadge';
import { CICheckRunsList } from '../components/github/CICheckRunsList';
import { apiFetch, ApiError } from '../api/client';
import {
  TargetType, ReviewDetailDto, ReviewerAssignmentDto, CommentDto,
  ReviewerDecision, ReviewType, ReviewStatus, UserSummaryDto, RepositoryDto,
  IssueLabelDto
} from '@reported/contracts';
import { NotFoundPage } from './NotFoundPage';
import { AccessDeniedPage } from './AccessDeniedPage';

const PRESET_LABELS = [
  'review', 'pr', 'architecture', 'security', 'frontend', 'backend',
  'performance', 'refactor', 'urgent', 'blocked'
];

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

  const fetchReviewData = async () => {
    if (!params?.number) return;
    try {
      const data = await apiFetch<ReviewDetailDto>(`/reviews/${params.number}`);
      setReview(data);
      setErrorStatus(null);

      const commData = await apiFetch<CommentDto[]>(`/comments?targetType=REVIEW&targetId=${data.id}`);
      setComments(commData);
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
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={28} />
      </Box>
    );
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

  const canEdit = user && (user.id === review?.author.id || user.role === 'ADMIN');
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

      {/* Deleted Audit Banner */}
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


      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 340px' }, gap: 3.5 }}>

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
              <Chip label={review.reviewType} size="small" sx={{ fontWeight: 600, height: 20 }} />
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

          <AcknowledgementBadge
            reviewId={review.id}
            reviewers={review.reviewers || []}
            onUpdated={fetchReviewData}
          />

          <CommentThread
            targetType={TargetType.REVIEW}
            targetId={review.id}
            comments={comments}
            onRefresh={fetchReviewData}
          />
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

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

          {/* Project */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
              {isVi ? 'DỰ ÁN' : 'PROJECT'}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8125rem', color: currentProject ? tokens.textPrimary : tokens.textSecondary }}>
              {currentProject ? currentProject.name : (isVi ? '(Chưa phân loại dự án)' : '(No project assigned)')}
            </Typography>
          </Box>

          {/* Reviewers */}
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

                        {isApproved && (
                          <Chip
                            icon={<CheckCircle2 size={13} />}
                            label="Approved"
                            size="small"
                            sx={{ height: 20, fontSize: '0.6875rem', backgroundColor: 'rgba(63, 185, 80, 0.15)', color: tokens.success }}
                          />
                        )}
                        {isChangesReq && (
                          <Chip
                            icon={<AlertCircle size={13} />}
                            label="Changes"
                            size="small"
                            sx={{ height: 20, fontSize: '0.6875rem', backgroundColor: 'rgba(248, 81, 73, 0.15)', color: tokens.error }}
                          />
                        )}
                        {isPending && (
                          <Chip
                            icon={<Clock size={13} />}
                            label="Pending"
                            size="small"
                            sx={{ height: 20, fontSize: '0.6875rem', backgroundColor: 'rgba(210, 153, 34, 0.15)', color: tokens.warning }}
                          />
                        )}
                      </Box>

                      {r.acknowledgementStatus && (
                        <Box sx={{ mt: 0.8, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <Chip
                            size="small"
                            label={`Status: ${r.acknowledgementStatus}`}
                            sx={{
                              height: 18,
                              fontSize: '0.625rem',
                              fontWeight: 700,
                              backgroundColor: 'rgba(99, 102, 241, 0.1)',
                              color: '#6366f1'
                            }}
                          />
                        </Box>
                      )}

                      {r.decisionNote && (
                        <Typography variant="caption" sx={{ display: 'block', color: tokens.textSecondary, fontStyle: 'italic', mt: 0.5 }}>
                          "{r.decisionNote}"
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>

          {/* Labels */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.8 }}>
              {isVi ? 'NHÃN' : 'LABELS'}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
              {!review.labels || review.labels.length === 0 ? (
                <Typography variant="body2" sx={{ color: tokens.textSecondary, fontSize: '0.8125rem', fontStyle: 'italic' }}>
                  {isVi ? '(Không có nhãn)' : '(No labels)'}
                </Typography>
              ) : (
                review.labels.map((lbl: IssueLabelDto) => (
                  <Chip
                    key={lbl.id}
                    label={lbl.name}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.6875rem',
                      backgroundColor: `${lbl.color}15`,
                      color: lbl.color,
                      border: `1px solid ${lbl.color}33`
                    }}
                  />
                ))
              )}
            </Box>
          </Box>

          {/* Repository & Branch */}
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

          {/* CI / Build Checks */}
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
        </Box>
      </Box>


      <ReviewDecisionDialog
        open={decisionModalOpen}
        reviewId={review.id}
        onClose={() => setDecisionModalOpen(false)}
        onSuccess={fetchReviewData}
      />

      {/* Delete Confirmation Dialog */}
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

      {/* Full Edit Review Dialog (100% Parity with CreateReviewPage) */}
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

          {/* Title */}
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

          {/* Review Type, Status, Deadline */}
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
                <MenuItem value={ReviewType.CODE}>Code Implementation</MenuItem>
                <MenuItem value={ReviewType.PR}>Pull Request Review</MenuItem>
                <MenuItem value={ReviewType.ARCHITECTURE}>Architecture & Design</MenuItem>
                <MenuItem value={ReviewType.SECURITY}>Security Review</MenuItem>
                <MenuItem value={ReviewType.API}>API & Integration</MenuItem>
                <MenuItem value={ReviewType.DATABASE}>Database & Schema</MenuItem>
                <MenuItem value={ReviewType.UI}>UI & Frontend</MenuItem>
                <MenuItem value={ReviewType.DOCUMENTATION}>Documentation</MenuItem>
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
                <MenuItem value={ReviewStatus.PENDING_REVIEW}>Pending Review</MenuItem>
                <MenuItem value={ReviewStatus.IN_REVIEW}>In Review</MenuItem>
                <MenuItem value={ReviewStatus.CHANGES_REQUESTED}>Changes Requested</MenuItem>
                <MenuItem value={ReviewStatus.APPROVED}>Approved</MenuItem>
                <MenuItem value={ReviewStatus.CLOSED}>Closed</MenuItem>
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

          {/* Project & Repository */}
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

          {/* Branch, Commit, PR Link */}
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

          {/* Reviewers */}
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
                    const u = usersList.find((usr) => usr.id === val);
                    return <Chip key={val} size="small" label={u?.displayName || val} sx={{ height: 22 }} />;
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

          {/* Labels */}
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

          {/* Description */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
              {isVi ? 'MÔ TẢ CHI TIẾT' : 'DESCRIPTION'}
            </Typography>
            <MarkdownEditor
              value={editDescription}
              onChange={setEditDescription}
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

