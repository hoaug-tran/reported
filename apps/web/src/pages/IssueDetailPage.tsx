import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Chip, Divider, Select, MenuItem, FormControl,
  InputLabel, CircularProgress, Alert, Tooltip, Breadcrumbs, Link as MuiLink,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, OutlinedInput
} from '@mui/material';
import {
  Eye, EyeOff, Edit3, Trash2, AlertTriangle, GitPullRequest, GitBranch,
  FolderGit2, Tag, Check, Plus
} from 'lucide-react';
import { useRoute, useLocation, Link } from 'wouter';
import { useThemeContext } from '../contexts/ThemeContext';
import { useAuthContext } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useI18n } from '../contexts/I18nContext';
import { StatusBadge } from '../components/issues/StatusBadge';
import { PriorityBadge, SeverityBadge } from '../components/issues/PriorityBadge';
import { UserAvatar } from '../components/common/UserAvatar';
import { MarkdownRenderer } from '../components/markdown/MarkdownRenderer';
import { MarkdownEditor } from '../components/editor/MarkdownEditor';
import { PullRequestPreview } from '../components/github/PullRequestPreview';
import { ActivityTimeline } from '../components/timeline/ActivityTimeline';
import { CommentThread } from '../components/discussion/CommentThread';
import { apiFetch, ApiError } from '../api/client';
import {
  TargetType, IssueDto, CommentDto, ActivityTimelineDto, UserSummaryDto,
  IssueLabelDto, IssueStatus, IssuePriority, IssueSeverity, BugFrequency,
  IssueType, RepositoryDto
} from '@reported/contracts';
import { NotFoundPage } from './NotFoundPage';
import { AccessDeniedPage } from './AccessDeniedPage';

const PRESET_LABELS = [
  'bug', 'frontend', 'backend', 'enhancement', 'documentation',
  'urgent', 'blocker', 'question', 'discussion', 'proposal'
];

export const IssueDetailPage: React.FC = () => {
  const { tokens } = useThemeContext();
  const { user } = useAuthContext();
  const { activeWorkspace, projects } = useWorkspace();
  const { language } = useI18n();
  const isVi = language === 'vi';
  const [, setLocation] = useLocation();
  const [, params] = useRoute('/issues/:number');

  const [loading, setLoading] = useState(true);
  const [issue, setIssue] = useState<IssueDto | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [activities, setActivities] = useState<ActivityTimelineDto[]>([]);
  const [isWatching, setIsWatching] = useState(false);

  const [usersList, setUsersList] = useState<UserSummaryDto[]>([]);
  const [repositoriesList, setRepositoriesList] = useState<RepositoryDto[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editType, setEditType] = useState<IssueType>(IssueType.BUG);
  const [editPriority, setEditPriority] = useState<IssuePriority>(IssuePriority.P2);
  const [editSeverity, setEditSeverity] = useState<IssueSeverity>(IssueSeverity.MAJOR);
  const [editProjectId, setEditProjectId] = useState<string>('');
  const [editRepositoryId, setEditRepositoryId] = useState<string>('');
  const [editBranch, setEditBranch] = useState('');
  const [editCommitHash, setEditCommitHash] = useState('');
  const [editPrUrl, setEditPrUrl] = useState('');
  const [editAssigneeIds, setEditAssigneeIds] = useState<string[]>([]);
  const [editLabels, setEditLabels] = useState<string[]>([]);
  const [newLabelInput, setNewLabelInput] = useState('');

  const [editEnvironment, setEditEnvironment] = useState('');
  const [editPrecondition, setEditPrecondition] = useState('');
  const [editSteps, setEditSteps] = useState('');
  const [editActual, setEditActual] = useState('');
  const [editExpected, setEditExpected] = useState('');
  const [editFrequency, setEditFrequency] = useState<BugFrequency>(BugFrequency.ALWAYS);
  const [editEvidence, setEditEvidence] = useState('');

  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchIssueData = async () => {
    if (!params?.number) return;
    try {
      const data = await apiFetch<IssueDto>(`/issues/${params.number}`);
      setIssue(data);
      setIsWatching(!!data.isWatching);
      setErrorStatus(null);

      const [commData, actData] = await Promise.all([
        apiFetch<CommentDto[]>(`/comments?targetType=ISSUE&targetId=${data.id}`),
        apiFetch<ActivityTimelineDto[]>(`/activity?targetType=ISSUE&targetId=${data.id}`)
      ]);

      setComments(commData);
      setActivities(actData);
    } catch (err) {
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
    fetchIssueData();
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

  const handleOpenEdit = () => {
    if (!issue) return;
    setEditTitle(issue.title);
    setEditDescription(issue.description || '');
    setEditType(issue.type || IssueType.BUG);
    setEditPriority(issue.priority || IssuePriority.P2);
    setEditSeverity(issue.severity || IssueSeverity.MAJOR);
    setEditProjectId(issue.projectId || '');
    setEditRepositoryId(issue.repository?.id || '');
    setEditBranch(issue.branch || '');
    setEditCommitHash(issue.commitHash || '');
    setEditPrUrl(issue.pullRequest?.url || '');
    setEditAssigneeIds(issue.assignees ? issue.assignees.map((a) => a.id) : []);
    setEditLabels(issue.labels ? issue.labels.map((l) => l.name) : []);
    setNewLabelInput('');

    if (issue.bugDetails) {
      setEditEnvironment(issue.bugDetails.environment || '');
      setEditPrecondition(issue.bugDetails.precondition || '');
      setEditSteps(issue.bugDetails.stepsToReproduce || '');
      setEditActual(issue.bugDetails.actualResult || '');
      setEditExpected(issue.bugDetails.expectedResult || '');
      setEditFrequency(issue.bugDetails.frequency || BugFrequency.ALWAYS);
      setEditEvidence(issue.bugDetails.evidenceJsonOrLogs || '');
    } else {
      setEditEnvironment('');
      setEditPrecondition('');
      setEditSteps('');
      setEditActual('');
      setEditExpected('');
      setEditFrequency(BugFrequency.ALWAYS);
      setEditEvidence('');
    }

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
    if (!issue) return;
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
        type: editType,
        priority: editPriority,
        severity: editSeverity,
        projectId: editProjectId ? editProjectId : null,
        repositoryId: editRepositoryId ? editRepositoryId : null,
        branch: editBranch.trim() ? editBranch.trim() : null,
        commitHash: editCommitHash.trim() ? editCommitHash.trim() : null,
        prUrl: editPrUrl.trim() ? editPrUrl.trim() : null,
        assigneeIds: editAssigneeIds,
        labels: editLabels
      };

      if (
        editType === IssueType.BUG ||
        editSteps.trim() ||
        editEnvironment.trim() ||
        editActual.trim() ||
        editExpected.trim() ||
        editEvidence.trim()
      ) {
        payload.bugDetails = {
          environment: editEnvironment.trim() || 'Default Environment',
          precondition: editPrecondition.trim(),
          stepsToReproduce: editSteps.trim(),
          actualResult: editActual.trim(),
          expectedResult: editExpected.trim(),
          frequency: editFrequency,
          evidenceJsonOrLogs: editEvidence.trim()
        };
      }

      await apiFetch(`/issues/${issue.id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      });

      setEditOpen(false);
      await fetchIssueData();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update issue');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteIssue = async () => {
    if (!issue) return;
    setDeleting(true);
    try {
      await apiFetch(`/issues/${issue.id}`, { method: 'DELETE' });
      setDeleteDialogOpen(false);
      await fetchIssueData();
    } catch (err) {
      console.error('Failed to delete issue:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (newStatus: IssueStatus) => {
    if (!issue) return;
    try {
      await apiFetch(`/issues/${issue.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      fetchIssueData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleWatch = async () => {
    if (!issue || !user) return;
    try {
      const res = await apiFetch<{ watching: boolean }>(`/issues/${issue.id}/watch`, { method: 'POST' });
      setIsWatching(res.watching);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (!issue) {
    if (errorStatus === 403) {
      return <AccessDeniedPage isDeleted={true} />;
    }
    return <NotFoundPage message={isVi ? 'Không tìm thấy vấn đề' : 'Issue not found'} />;
  }

  const canEdit = user && (user.id === issue.author.id || user.role === 'ADMIN');
  const currentProject = projects.find((p) => p.id === issue.projectId);

  return (
    <Box sx={{ width: '100%' }}>

      <Breadcrumbs sx={{ mb: 1.5, fontSize: '0.8125rem' }}>
        <Link href="/issues">
          <Typography variant="caption" sx={{ color: tokens.textSecondary, cursor: 'pointer', '&:hover': { color: tokens.primary } }}>
            Issues
          </Typography>
        </Link>
        <Typography variant="caption" sx={{ color: tokens.textPrimary, fontWeight: 600 }}>
          #{issue.number}
        </Typography>
      </Breadcrumbs>

      {/* Deleted Audit Banner */}
      {issue.isDeleted && (
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
              {isVi ? 'Vấn đề này đã bị xoá' : 'This issue has been deleted'}
            </Typography>
            {(issue as any).deletedBy && (
              <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
                {isVi ? 'Người xoá' : 'Deleted by'}{': '}
                <strong>@{(issue as any).deletedBy.username}</strong>
                {(issue as any).deletedAt && (
                  <> {isVi ? 'lúc' : 'at'} {new Date((issue as any).deletedAt).toLocaleString()}</>
                )}
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
              {isVi
                ? 'Nội dung, phân công và lịch sử vẫn được lưu trữ. Chỉ tác giả hoặc quản trị viên mới thấy được bài này.'
                : 'Content, assignments, and history are preserved. Only the author or admins can view this.'}
            </Typography>
          </Box>
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 340px' }, gap: 3.5 }}>

        <Box sx={{ minWidth: 0 }}>

          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
              <Typography variant="h1" sx={{ fontWeight: 700, mb: 1, letterSpacing: '-0.02em', lineHeight: 1.3 }}>
                {issue.title}
              </Typography>
              {canEdit && !issue.isDeleted && (
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
                    {isVi ? 'Sửa bài viết' : 'Edit'}
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
                    {isVi ? 'Xóa bài viết' : 'Delete'}
                  </Button>
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', color: tokens.textSecondary, fontSize: '0.8125rem' }}>
              <StatusBadge status={issue.status} size="medium" />
              <Chip
                label={issue.type}
                size="small"
                sx={{
                  height: 22,
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  backgroundColor: 'rgba(110, 118, 129, 0.14)',
                  color: tokens.textPrimary
                }}
              />
              <PriorityBadge priority={issue.priority} />
              <SeverityBadge severity={issue.severity} />
              <span>
                {isVi ? 'Tạo bởi' : 'Opened by'} <strong>@{issue.author.username}</strong> • {new Date(issue.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span>• {comments.length} {isVi ? 'bình luận' : 'comments'}</span>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Structured Bug & Testing Details Box - ALWAYS rendered with explicit fallbacks */}
          <Box
            sx={{
              mb: 3,
              p: 2.5,
              borderRadius: '8px',
              border: `1px solid ${tokens.border}`,
              backgroundColor: tokens.surface
            }}
          >
            <Typography variant="h4" sx={{ fontSize: '0.9rem', fontWeight: 600, mb: 2 }}>
              {isVi ? 'Chi tiết tái hiện & Kiểm thử lỗi' : 'Bug Reproduction & Testing Details'}
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary }}>
                  {isVi ? 'MÔI TRƯỜNG' : 'ENVIRONMENT'}
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8125rem', mt: 0.3 }}>
                  {issue.bugDetails?.environment || (isVi ? '(Không có thông tin môi trường)' : '(None)')}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary }}>
                  {isVi ? 'TẦN SUẤT' : 'FREQUENCY'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.3 }}>
                  {issue.bugDetails?.frequency || 'ALWAYS'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary }}>
                {isVi ? 'TIỀN ĐIỀU KIỆN' : 'PRECONDITION'}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.3 }}>
                {issue.bugDetails?.precondition || (isVi ? '(Không có)' : '(None)')}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary }}>
                {isVi ? 'CÁC BƯỚC TÁI HIỆN' : 'STEPS TO REPRODUCE'}
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.3 }}>
                {issue.bugDetails?.stepsToReproduce || (isVi ? '(Không có mô tả chi tiết các bước)' : '(No steps specified)')}
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.error }}>
                  {isVi ? 'KẾT QUẢ THỰC TẾ' : 'ACTUAL RESULT'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.3 }}>
                  {issue.bugDetails?.actualResult || (isVi ? '(Không có)' : '(None)')}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.success }}>
                  {isVi ? 'KẾT QUẢ MONG ĐỢI' : 'EXPECTED RESULT'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.3 }}>
                  {issue.bugDetails?.expectedResult || (isVi ? '(Không có)' : '(None)')}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ pt: 1.5, borderTop: `1px dashed ${tokens.border}` }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
                {isVi ? 'BẰNG CHỨNG / LOG KIỂM THỬ' : 'EVIDENCE / TEST LOGS'}
              </Typography>
              {issue.bugDetails?.evidenceJsonOrLogs ? (
                <MarkdownRenderer content={issue.bugDetails.evidenceJsonOrLogs} />
              ) : (
                <Typography variant="body2" sx={{ color: tokens.textSecondary, fontStyle: 'italic' }}>
                  {isVi ? 'Kiểm thử: Không có log hoặc bằng chứng đính kèm' : 'Testing: No logs or evidence attached'}
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 1 }}>
              {isVi ? 'MÔ TẢ CHI TIẾT' : 'DESCRIPTION'}
            </Typography>
            <MarkdownRenderer content={issue.description || (isVi ? '(Không có mô tả bổ sung)' : '(No description provided)')} />
          </Box>

          {issue.pullRequest && (
            <Box sx={{ my: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, textTransform: 'uppercase' }}>
                {isVi ? 'PULL REQUEST LIÊN KẾT' : 'LINKED PULL REQUEST'}
              </Typography>
              <PullRequestPreview
                pr={issue.pullRequest}
                repoFullName={issue.repository?.fullName}
                onRefresh={fetchIssueData}
              />
            </Box>
          )}

          <ActivityTimeline activities={activities} />

          <CommentThread
            targetType={TargetType.ISSUE}
            targetId={issue.id}
            comments={comments}
            onRefresh={fetchIssueData}
          />
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
              STATUS
            </Typography>
            <Select
              size="small"
              fullWidth
              value={issue.status}
              disabled={issue.isDeleted}
              onChange={(e) => handleStatusChange(e.target.value as IssueStatus)}
              sx={{ fontSize: '0.8125rem' }}
            >
              <MenuItem value={IssueStatus.OPEN}>Open</MenuItem>
              <MenuItem value={IssueStatus.IN_PROGRESS}>In Progress</MenuItem>
              <MenuItem value={IssueStatus.NEEDS_INFO}>Needs Info</MenuItem>
              <MenuItem value={IssueStatus.RESOLVED}>Resolved</MenuItem>
              <MenuItem value={IssueStatus.CLOSED}>Closed</MenuItem>
            </Select>
          </Box>

          <Box>
            <Button
              size="small"
              fullWidth
              variant="outlined"
              startIcon={isWatching ? <EyeOff size={16} /> : <Eye size={16} />}
              onClick={handleToggleWatch}
              sx={{ borderRadius: '6px', textTransform: 'none' }}
            >
              {isWatching ? 'Unwatch' : 'Watch Issue'}
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

          {/* Assignees */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.8 }}>
              {isVi ? 'NGƯỜI ĐƯỢC PHÂN CÔNG' : 'ASSIGNEES'}
            </Typography>
            {!issue.assignees || issue.assignees.length === 0 ? (
              <Typography variant="body2" sx={{ color: tokens.textSecondary, fontSize: '0.8125rem', fontStyle: 'italic' }}>
                {isVi ? '(Chưa phân công)' : '(No assignees)'}
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                {issue.assignees.map((a: UserSummaryDto) => (
                  <Box key={a.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <UserAvatar user={a} size={20} />
                    <Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8125rem' }}>
                      {a.displayName}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {/* Labels */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.8 }}>
              {isVi ? 'NHÃN' : 'LABELS'}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
              {!issue.labels || issue.labels.length === 0 ? (
                <Typography variant="body2" sx={{ color: tokens.textSecondary, fontSize: '0.8125rem', fontStyle: 'italic' }}>
                  {isVi ? '(Không có nhãn)' : '(No labels)'}
                </Typography>
              ) : (
                issue.labels.map((lbl: IssueLabelDto) => (
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
            {issue.repository ? (
              <>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                  {issue.repository.fullName}
                </Typography>
                {issue.branch && (
                  <Box component="code" sx={{ display: 'block', mt: 0.5, fontSize: '0.75rem', color: tokens.textSecondary }}>
                    {issue.branch}
                  </Box>
                )}
              </>
            ) : (
              <Typography variant="body2" sx={{ color: tokens.textSecondary, fontSize: '0.8125rem', fontStyle: 'italic' }}>
                {isVi ? '(Chưa liên kết kho lưu trữ)' : '(No repository linked)'}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>

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
          {isVi ? `Xóa bài viết #${issue.number}?` : `Delete issue #${issue.number}?`}
        </DialogTitle>
        <DialogContent sx={{ py: 1.5 }}>
          <Typography variant="body2" sx={{ color: tokens.textSecondary, lineHeight: 1.6 }}>
            {isVi
              ? 'Bài viết này sẽ được chuyển sang trạng thái đã xóa và ghi nhận trong nhật ký đối soát (audit trail). Thao tác này không làm mất dữ liệu vĩnh viễn.'
              : 'This issue will be marked as deleted and recorded in the audit trail. Data is preserved for tracking and compliance.'}
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
            onClick={handleDeleteIssue}
            disabled={deleting}
            startIcon={deleting ? <CircularProgress size={16} /> : <Trash2 size={16} />}
            sx={{ borderRadius: '6px', textTransform: 'none' }}
          >
            {deleting ? (isVi ? 'Đang xóa...' : 'Deleting...') : (isVi ? 'Xác nhận xóa' : 'Confirm Delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Full Edit Issue Dialog (100% Parity with CreateIssuePage) */}
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
          {isVi ? 'Chỉnh sửa bài viết' : 'Edit Issue'}
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
              placeholder={isVi ? 'Nhập tiêu đề bài viết...' : 'Enter issue title...'}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
            />
          </Box>

          {/* Type, Priority, Severity */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
                {isVi ? 'LOẠI BÀI VIẾT' : 'TYPE'}
              </Typography>
              <Select
                fullWidth
                size="small"
                value={editType}
                onChange={(e) => setEditType(e.target.value as IssueType)}
                sx={{ borderRadius: '6px' }}
              >
                <MenuItem value={IssueType.BUG}>Bug Report</MenuItem>
                <MenuItem value={IssueType.TASK}>Task / Question</MenuItem>
                <MenuItem value={IssueType.FEATURE}>Feature Proposal</MenuItem>
              </Select>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
                {isVi ? 'ĐỘ ƯU TIÊN' : 'PRIORITY'}
              </Typography>
              <Select
                fullWidth
                size="small"
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as IssuePriority)}
                sx={{ borderRadius: '6px' }}
              >
                <MenuItem value={IssuePriority.P0}>P0 - Blocker</MenuItem>
                <MenuItem value={IssuePriority.P1}>P1 - High</MenuItem>
                <MenuItem value={IssuePriority.P2}>P2 - Medium</MenuItem>
                <MenuItem value={IssuePriority.P3}>P3 - Low</MenuItem>
              </Select>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
                {isVi ? 'MỨC ĐỘ NGHIÊM TRỌNG' : 'SEVERITY'}
              </Typography>
              <Select
                fullWidth
                size="small"
                value={editSeverity}
                onChange={(e) => setEditSeverity(e.target.value as IssueSeverity)}
                sx={{ borderRadius: '6px' }}
              >
                <MenuItem value={IssueSeverity.BLOCKER}>Blocker</MenuItem>
                <MenuItem value={IssueSeverity.CRITICAL}>Critical</MenuItem>
                <MenuItem value={IssueSeverity.MAJOR}>Major</MenuItem>
                <MenuItem value={IssueSeverity.MINOR}>Minor</MenuItem>
                <MenuItem value={IssueSeverity.TRIVIAL}>Trivial</MenuItem>
              </Select>
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
                placeholder="main, fix/auth..."
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

          {/* Assignees */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
              {isVi ? 'NGƯỜI PHÂN CÔNG' : 'ASSIGNEES'}
            </Typography>
            <Select
              multiple
              fullWidth
              size="small"
              value={editAssigneeIds}
              onChange={(e) => setEditAssigneeIds(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
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

          {/* Bug Reproduction & Testing Details Section */}
          <Box sx={{ p: 2, borderRadius: '8px', border: `1px solid ${tokens.border}`, backgroundColor: tokens.background, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {isVi ? 'Thông tin tái hiện & Kiểm thử lỗi' : 'Bug Reproduction & Testing Details'}
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
                  {isVi ? 'MÔI TRƯỜNG' : 'ENVIRONMENT'}
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  value={editEnvironment}
                  onChange={(e) => setEditEnvironment(e.target.value)}
                  placeholder="Chrome 122, macOS 14..."
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
                  {isVi ? 'TẦN SUẤT' : 'FREQUENCY'}
                </Typography>
                <Select
                  fullWidth
                  size="small"
                  value={editFrequency}
                  onChange={(e) => setEditFrequency(e.target.value as BugFrequency)}
                  sx={{ borderRadius: '6px' }}
                >
                  <MenuItem value={BugFrequency.ALWAYS}>{isVi ? 'Luôn luôn (100%)' : 'Always (100%)'}</MenuItem>
                  <MenuItem value={BugFrequency.OFTEN}>{isVi ? 'Thường xuyên (~70%)' : 'Often (~70%)'}</MenuItem>
                  <MenuItem value={BugFrequency.SOMETIMES}>{isVi ? 'Thỉnh thoảng (~30%)' : 'Sometimes (~30%)'}</MenuItem>
                  <MenuItem value={BugFrequency.RARE}>{isVi ? 'Hiếm khi (<10%)' : 'Rare (<10%)'}</MenuItem>
                </Select>
              </Box>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
                {isVi ? 'TIỀN ĐIỀU KIỆN' : 'PRECONDITION'}
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={editPrecondition}
                onChange={(e) => setEditPrecondition(e.target.value)}
                placeholder={isVi ? 'Ví dụ: Đã đăng nhập với tài khoản viewer...' : 'e.g. Logged in as viewer...'}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
              />
            </Box>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
                {isVi ? 'CÁC BƯỚC TÁI HIỆN' : 'STEPS TO REPRODUCE'}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={editSteps}
                onChange={(e) => setEditSteps(e.target.value)}
                placeholder="1. Go to...\n2. Click..."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.error, display: 'block', mb: 0.5 }}>
                  {isVi ? 'KẾT QUẢ THỰC TẾ' : 'ACTUAL RESULT'}
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  value={editActual}
                  onChange={(e) => setEditActual(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
                />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.success, display: 'block', mb: 0.5 }}>
                  {isVi ? 'KẾT QUẢ MONG ĐỢI' : 'EXPECTED RESULT'}
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  value={editExpected}
                  onChange={(e) => setEditExpected(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
                />
              </Box>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
                {isVi ? 'BẰNG CHỨNG / LOG KIỂM THỬ' : 'EVIDENCE / TEST LOGS'}
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={2}
                value={editEvidence}
                onChange={(e) => setEditEvidence(e.target.value)}
                placeholder={isVi ? 'Dán log lỗi, stacktrace hoặc link ảnh bằng chứng...' : 'Paste logs, error stacktraces or image links...'}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
              />
            </Box>
          </Box>

          {/* Description Markdown Editor */}
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary, display: 'block', mb: 0.5 }}>
              {isVi ? 'MÔ TẢ CHI TIẾT' : 'DESCRIPTION'}
            </Typography>
            <MarkdownEditor
              value={editDescription}
              onChange={setEditDescription}
              placeholder={isVi ? 'Mô tả chi tiết bài viết...' : 'Detailed issue description...'}
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

