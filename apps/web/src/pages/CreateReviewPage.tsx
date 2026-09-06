import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Chip,
  Grid,
  Alert,
  Tooltip,
  IconButton,
  CircularProgress,
  Collapse,
  MenuItem,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import { toast } from '../contexts/ToastContext';
import {
  Eye,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  Send,
  GitPullRequest,
  FolderGit2,
  Bug,
  ShieldCheck,
  Cpu,
  Zap,
  Code2,
  GitBranch,
  Lock,
  Globe,
  Link as LinkIcon,
  Target,
  RefreshCw,
  Users,
  LucideIcon
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useThemeContext } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { apiFetch } from '../api/client';
import { MarkdownEditor } from '../components/editor/MarkdownEditor';
import { PullRequestPreview } from '../components/github/PullRequestPreview';
import { UserAvatar } from '../components/common/UserAvatar';
import {
  ReviewType,
  UserSummaryDto,
  RepositoryDto,
  PullRequestSummaryDto,
  PullRequestState,
  PullRequestChecksStatus
} from '@reported/contracts';
import { Page } from '../components/common/Page';
import { buttonSx, inputSx } from '../theme/ui';

interface LivePullRequest {
  number: number;
  title: string;
  state: string;
  headBranch: string;
  baseBranch: string;
  headSha?: string;
  authorLogin?: string;
  authorAvatar?: string;
  htmlUrl: string;
  isDraft?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface FocusAreaItem {
  key: string;
  labelVi: string;
  labelEn: string;
  descVi: string;
  descEn: string;
  icon: LucideIcon;
}

const FOCUS_AREAS_CONFIG: FocusAreaItem[] = [
  {
    key: 'logic',
    labelVi: 'Logic & Ngoại lệ',
    labelEn: 'Logic & Edge Cases',
    descVi: 'Luồng nghiệp vụ, boundary conditions và kiểm soát lỗi',
    descEn: 'Business logic, boundary values, and error handling',
    icon: Bug
  },
  {
    key: 'security',
    labelVi: 'Bảo mật & Phân quyền',
    labelEn: 'Security & Auth',
    descVi: 'Xác thực, permission, IDOR và bảo vệ dữ liệu',
    descEn: 'Authentication, permissions, and data protection',
    icon: ShieldCheck
  },
  {
    key: 'architecture',
    labelVi: 'Kiến trúc & Schema DB',
    labelEn: 'Architecture & DB',
    descVi: 'Tổ chức module, migration, quan hệ bảng và clean code',
    descEn: 'Module structure, schema migrations, and clean code',
    icon: Cpu
  },
  {
    key: 'performance',
    labelVi: 'Hiệu năng & Tối ưu',
    labelEn: 'Performance & Scaling',
    descVi: 'N+1 query, memory leak, concurrency và tải trọng',
    descEn: 'N+1 queries, memory leaks, concurrency, and payload',
    icon: Zap
  },
  {
    key: 'style',
    labelVi: 'Coding Style & Chuẩn',
    labelEn: 'Code Style & Naming',
    descVi: 'Quy chuẩn đặt tên, modularity và comment dễ hiểu',
    descEn: 'Naming conventions, modularity, and readability',
    icon: Code2
  }
];

export const CreateReviewPage: React.FC = () => {
  const { tokens } = useThemeContext();
  const { language } = useI18n();
  const { activeWorkspace, projects } = useWorkspace();
  const [, setLocation] = useLocation();
  const isVi = language === 'vi';

  const queryParams = new URLSearchParams(window.location.search);
  const initRepoId = queryParams.get('repoId') || '';
  const initPrNumber = queryParams.get('prNumber') ? parseInt(queryParams.get('prNumber')!, 10) : null;

  const [prUrl, setPrUrl] = useState('');
  const [title, setTitle] = useState('');
  const [specialNotes, setSpecialNotes] = useState('');
  const [reviewType] = useState<ReviewType>(ReviewType.CODE);
  const [deadline, setDeadline] = useState('');

  const [focusAreas, setFocusAreas] = useState<{ [key: string]: boolean }>({
    logic: true,
    security: false,
    architecture: false,
    performance: false,
    style: false
  });

  const [reviewerIds, setReviewerIds] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>(['review', 'pr']);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [projectId, setProjectId] = useState<string>('');
  const [repositoryId, setRepositoryId] = useState<string>(initRepoId);
  const [branch, setBranch] = useState('');
  const [commitHash, setCommitHash] = useState('');

  const [prSelectionMode, setPrSelectionMode] = useState<'repo' | 'url'>('repo');
  const [livePulls, setLivePulls] = useState<LivePullRequest[]>([]);
  const [loadingLivePulls, setLoadingLivePulls] = useState(false);
  const [selectedPr, setSelectedPr] = useState<LivePullRequest | null>(null);
  const [livePullsError, setLivePullsError] = useState<string | null>(null);
  const [prSearch, setPrSearch] = useState('');
  const [isChangingPr, setIsChangingPr] = useState(false);

  const [usersList, setUsersList] = useState<UserSummaryDto[]>([]);
  const [repositoriesList, setRepositoriesList] = useState<RepositoryDto[]>([]);
  const [prPreview, setPrPreview] = useState<PullRequestSummaryDto | null>(null);
  const [isLoadingPr, setIsLoadingPr] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const setErrorMsg = (msg: string | null) => { if (msg) toast.error(msg); };
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('reported_review_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.prUrl && !initPrNumber) setPrUrl(parsed.prUrl);
        if (parsed.title && !initPrNumber) setTitle(parsed.title);
        if (parsed.specialNotes) setSpecialNotes(parsed.specialNotes);
        if (parsed.focusAreas) setFocusAreas(parsed.focusAreas);
        if (parsed.reviewerIds) setReviewerIds(parsed.reviewerIds);
        if (parsed.selectedLabels) setSelectedLabels(parsed.selectedLabels);
        setLastSaved(parsed.savedAt || null);
      }
    } catch {
    }
  }, [initPrNumber]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (prUrl || title || specialNotes || reviewerIds.length > 0) {
        const payload = {
          prUrl,
          title,
          specialNotes,
          focusAreas,
          reviewerIds,
          selectedLabels,
          savedAt: new Date().toLocaleTimeString()
        };
        localStorage.setItem('reported_review_draft', JSON.stringify(payload));
        setLastSaved(payload.savedAt);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [prUrl, title, specialNotes, focusAreas, reviewerIds, selectedLabels]);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (!activeWorkspace) return;
      try {
        const [membersRes, rRes] = await Promise.all([
          apiFetch<Array<{ userId: string; username: string; displayName: string; avatarUrl?: string | null; role: string }>>(
            `/workspaces/${activeWorkspace.id}/members`
          ),
          apiFetch<RepositoryDto[]>(`/github/repositories?workspaceId=${activeWorkspace.id}`)
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
        setRepositoriesList(rRes || []);
      } catch {
      }
    };
    fetchMetadata();
  }, [activeWorkspace?.id]);

  useEffect(() => {
    if (projects.length > 0 && !projectId) {
      setProjectId(projects[0].id);
    }
  }, [projects]);

  useEffect(() => {
    if (!repositoryId || prSelectionMode !== 'repo') {
      setLivePulls([]);
      return;
    }
    const fetchLivePulls = async () => {
      setLoadingLivePulls(true);
      setLivePullsError(null);
      try {
        const data = await apiFetch<{ pulls: LivePullRequest[]; error?: string }>(
          `/github/repositories/${repositoryId}/github-pulls`
        );
        const pulls = data.pulls || [];
        setLivePulls(pulls);
        if (data.error) setLivePullsError(data.error);
        if (initPrNumber && pulls.length > 0) {
          const matched = pulls.find((p: LivePullRequest) => p.number === initPrNumber);
          if (matched) {
            setSelectedPr(matched);
            setIsChangingPr(false);
          }
        }
      } catch {
        setLivePulls([]);
        setLivePullsError(isVi ? 'Không thể tải danh sách PR từ GitHub' : 'Failed to load PRs from GitHub');
      } finally {
        setLoadingLivePulls(false);
      }
    };
    fetchLivePulls();
  }, [repositoryId, prSelectionMode, initPrNumber]);

  useEffect(() => {
    if (!selectedPr) return;
    const repo = repositoriesList.find(r => r.id === repositoryId);
    const autoTitle = repo
      ? `PR #${selectedPr.number}: ${selectedPr.title} (${repo.fullName})`
      : `PR #${selectedPr.number}: ${selectedPr.title}`;
    setTitle(autoTitle);
    if (selectedPr.headBranch) setBranch(selectedPr.headBranch);
    if (selectedPr.headSha) setCommitHash(selectedPr.headSha);
    if (selectedPr.htmlUrl) setPrUrl(selectedPr.htmlUrl);
  }, [selectedPr, repositoryId, repositoriesList]);

  useEffect(() => {
    if (prSelectionMode !== 'url' || !prUrl.trim()) {
      if (prSelectionMode !== 'url') return;
      setPrPreview(null);
      setIsLoadingPr(false);
      return;
    }
    setIsLoadingPr(true);
    const timer = setTimeout(async () => {
      try {
        const preview = await apiFetch<PullRequestSummaryDto>(
          `/github/preview-pr?url=${encodeURIComponent(prUrl)}`
        );
        setPrPreview(preview);
        if (!title.trim() && preview.title) {
          setTitle(`PR #${preview.prNumber}: ${preview.title}`);
        }
        if ((preview as unknown as { repository?: { fullName: string } }).repository) {
          const matched = repositoriesList.find(
            (r) =>
              r.fullName ===
              (preview as unknown as { repository: { fullName: string } }).repository.fullName
          );
          if (matched) setRepositoryId(matched.id);
        }
        if (preview.headBranch) setBranch(preview.headBranch);
      } catch {
        setPrPreview(null);
      } finally {
        setIsLoadingPr(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [prUrl, prSelectionMode, repositoriesList, title]);

  const handleClearDraft = () => {
    localStorage.removeItem('reported_review_draft');
    setPrUrl('');
    setTitle('');
    setSpecialNotes('');
    setDeadline('');
    setReviewerIds([]);
    setSelectedPr(null);
    setLastSaved(null);
  };

  const toggleReviewer = (userId: string) => {
    if (reviewerIds.includes(userId)) {
      setReviewerIds(reviewerIds.filter((id) => id !== userId));
    } else {
      setReviewerIds([...reviewerIds, userId]);
    }
  };

  const toggleFocus = (key: string) => {
    setFocusAreas((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const effectiveTitle = title.trim() || (selectedPr ? `PR #${selectedPr.number}: ${selectedPr.title}` : '') || (prPreview ? `PR #${prPreview.prNumber}: ${prPreview.title}` : '');

    if (!effectiveTitle) {
      setErrorMsg(isVi ? 'Vui lòng nhập link PR hoặc tiêu đề cần review' : 'Please provide a PR link or title');
      return;
    }

    if (reviewerIds.length === 0) {
      setErrorMsg(isVi ? 'Vui lòng chọn ít nhất một đồng nghiệp để nhờ review' : 'Please select at least one reviewer');
      return;
    }

    const activeFocus = FOCUS_AREAS_CONFIG
      .filter((item) => focusAreas[item.key])
      .map((item) => isVi ? item.labelVi : item.labelEn);

    let constructedDesc = '';
    if (activeFocus.length > 0) {
      constructedDesc += `**${isVi ? 'Trọng tâm review' : 'Focus areas'}:** ${activeFocus.join(', ')}\n\n`;
    }

    if (specialNotes.trim()) {
      constructedDesc += `${specialNotes.trim()}`;
    } else {
      constructedDesc += isVi
        ? `*Tác giả không ghi chú gì thêm. Vui lòng xem và đối chiếu theo checklist chung.*`
        : `*No special notes provided. Please review per standard checklist.*`;
    }

    try {
      setIsSubmitting(true);
      const res = await apiFetch<{ id: string; number: number }>('/reviews', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId: activeWorkspace?.id,
          projectId: projectId || undefined,
          title: effectiveTitle,
          description: constructedDesc,
          reviewType,
          deadline: deadline ? new Date(deadline).toISOString() : undefined,
          repositoryId: repositoryId || undefined,
          prUrl: prUrl.trim() || undefined,
          branch: branch.trim() || undefined,
          commitHash: commitHash.trim() || undefined,
          reviewerIds,
          labels: selectedLabels
        })
      });

      localStorage.removeItem('reported_review_draft');
      setLocation(`/reviews/${res.number}`);
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || 'Không thể gửi yêu cầu review. Vui lòng thử lại.';
      setErrorMsg(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPulls = livePulls.filter((pr) => {
    const q = prSearch.trim().toLowerCase();
    if (!q) return true;
    return [pr.number, pr.title, pr.headBranch, pr.baseBranch, pr.authorLogin]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q));
  });

  const selectedRepoObj = repositoriesList.find((r) => r.id === repositoryId);

  return (
    <Page variant="form">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Tooltip title={isVi ? 'Quay lại danh sách review' : 'Back to reviews'}>
            <IconButton onClick={() => setLocation('/reviews')} sx={{ border: `1px solid ${tokens.border}`, borderRadius: '8px' }}>
              <ArrowLeft size={18} />
            </IconButton>
          </Tooltip>
          <Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: tokens.textPrimary }}
            >
              {isVi ? 'Yêu cầu Review code' : 'Request Code Review'}
            </Typography>
          </Box>
        </Box>

        {lastSaved && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={<CheckCircle2 size={14} color="#10b981" />}
              label={`${isVi ? 'Đã lưu nháp' : 'Draft saved'} ${lastSaved}`}
              size="small"
              sx={{ backgroundColor: tokens.surfaceSecondary, color: tokens.textSecondary, fontSize: '0.75rem' }}
            />
            <Tooltip title={isVi ? 'Xóa bản nháp' : 'Clear draft'}>
              <IconButton size="small" onClick={handleClearDraft} sx={{ color: tokens.textSecondary }}>
                <Trash2 size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>



      <form onSubmit={handleSubmit}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, md: 3.5 },
            borderRadius: '8px',
            border: `1px solid ${tokens.border}`,
            backgroundColor: tokens.surface,
            mb: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 3
          }}
        >
          <Box>
            <TextField
              fullWidth
              placeholder={isVi ? 'Tiêu đề review (ví dụ: feat(vocabulary): vocabulary learning journey)' : 'Review title (e.g. feat(vocabulary): vocabulary learning journey)'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              variant="outlined"
              required
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  borderRadius: '8px',
                  backgroundColor: tokens.surface
                },
                ...inputSx(tokens)
              }}
            />
          </Box>

          <Box sx={{ borderRadius: '8px', border: `1px solid ${tokens.border}`, backgroundColor: tokens.surfaceSecondary, p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: selectedPr && !isChangingPr ? 1.5 : 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GitPullRequest size={18} color="#a855f7" />
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tokens.textPrimary }}>
                  {isVi ? 'Pull Request được liên kết' : 'Linked Pull Request'}
                </Typography>
                {selectedPr && (
                  <Chip
                    size="small"
                    label={`PR #${selectedPr.number}`}
                    sx={{ backgroundColor: '#a855f7', color: '#ffffff', fontWeight: 700, height: 20 }}
                  />
                )}
              </Box>

              {selectedPr && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<RefreshCw size={13} />}
                  onClick={() => setIsChangingPr(!isChangingPr)}
                  sx={{ textTransform: 'none', fontSize: '0.75rem', borderRadius: '6px' }}
                >
                  {isChangingPr ? (isVi ? 'Giữ PR hiện tại' : 'Keep current PR') : (isVi ? 'Đổi PR khác' : 'Change PR')}
                </Button>
              )}
            </Box>

            {selectedPr && !isChangingPr ? (
              <Box>
                <PullRequestPreview
                  pr={{
                    id: String(selectedPr.number),
                    prNumber: selectedPr.number,
                    title: selectedPr.title,
                    state: (selectedPr.state === 'closed' ? PullRequestState.CLOSED : PullRequestState.OPEN),
                    isMerged: false,
                    authorGithub: selectedPr.authorLogin || '',
                    authorAvatar: selectedPr.authorAvatar,
                    headBranch: selectedPr.headBranch,
                    baseBranch: selectedPr.baseBranch,
                    checksStatus: PullRequestChecksStatus.PASSING,
                    reviewStatus: 'PENDING',
                    url: selectedPr.htmlUrl,
                    updatedAt: selectedPr.updatedAt || new Date().toISOString(),
                    repository: selectedRepoObj ? {
                      id: selectedRepoObj.id,
                      name: selectedRepoObj.name,
                      owner: selectedRepoObj.fullName.split('/')[0] || '',
                      fullName: selectedRepoObj.fullName,
                      provider: selectedRepoObj.provider as any,
                      defaultBranch: selectedRepoObj.defaultBranch,
                      isPrivate: selectedRepoObj.isPrivate ?? false
                    } : undefined
                  }}
                />
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant={prSelectionMode === 'repo' ? 'contained' : 'outlined'}
                    startIcon={<FolderGit2 size={14} />}
                    onClick={() => setPrSelectionMode('repo')}
                    sx={{
                      borderRadius: '6px',
                      textTransform: 'none',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      ...(prSelectionMode === 'repo' ? { backgroundColor: tokens.primary, color: '#ffffff' } : {})
                    }}
                  >
                    {isVi ? 'Chọn từ Repo đã liên kết' : 'From Linked Repo'}
                  </Button>
                  <Button
                    size="small"
                    variant={prSelectionMode === 'url' ? 'contained' : 'outlined'}
                    startIcon={<LinkIcon size={14} />}
                    onClick={() => { setPrSelectionMode('url'); setSelectedPr(null); setLivePulls([]); }}
                    sx={{
                      borderRadius: '6px',
                      textTransform: 'none',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      ...(prSelectionMode === 'url' ? { backgroundColor: tokens.primary, color: '#ffffff' } : {})
                    }}
                  >
                    {isVi ? 'Dán link PR trực tiếp' : 'Paste PR URL'}
                  </Button>
                </Box>

                {prSelectionMode === 'repo' ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel>{isVi ? 'Chọn Repository' : 'Select Repository'}</InputLabel>
                      <Select
                        value={repositoryId}
                        label={isVi ? 'Chọn Repository' : 'Select Repository'}
                        onChange={(e) => setRepositoryId(e.target.value)}
                        sx={inputSx(tokens)}
                      >
                        {repositoriesList.length === 0 && (
                          <MenuItem value="" disabled>
                            {isVi ? 'Chưa có repo nào được liên kết' : 'No repositories linked yet'}
                          </MenuItem>
                        )}
                        {repositoriesList.map((repo) => (
                          <MenuItem key={repo.id} value={repo.id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {repo.isPrivate ? <Lock size={14} /> : <Globe size={14} />}
                              <span>{repo.fullName}</span>
                              <Chip label={repo.defaultBranch} size="small" sx={{ height: 18, fontSize: '0.68rem', ml: 0.5 }} />
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {repositoryId && (
                      <Box>
                        {loadingLivePulls ? (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2, color: tokens.textSecondary, fontSize: '0.82rem' }}>
                            <CircularProgress size={16} />
                            <span>{isVi ? 'Đang tải danh sách Pull Request...' : 'Loading pull requests...'}</span>
                          </Box>
                        ) : livePullsError ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Alert severity="warning" sx={{ fontSize: '0.8rem', py: 0.5, borderRadius: '6px' }}>{livePullsError}</Alert>
                            {(livePullsError.toLowerCase().includes('token') || livePullsError.toLowerCase().includes('access')) && (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => setLocation('/settings/connected-accounts')}
                                sx={{ alignSelf: 'flex-start', fontSize: '0.75rem', textTransform: 'none', borderRadius: '6px' }}
                              >
                                {isVi ? 'Đến trang Cài đặt để kết nối lại GitHub' : 'Go to Settings to Reconnect GitHub'}
                              </Button>
                            )}
                          </Box>
                        ) : livePulls.length === 0 ? (
                          <Alert severity="info" sx={{ fontSize: '0.8rem', py: 0.5, borderRadius: '6px' }}>
                            {isVi ? 'Không có Pull Request nào trong repository này.' : 'No pull requests found for this repo.'}
                          </Alert>
                        ) : (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <TextField
                              size="small"
                              placeholder={isVi ? 'Tìm nhanh theo số PR, tiêu đề, branch hoặc tác giả...' : 'Search by PR number, title, branch, or author...'}
                              value={prSearch}
                              onChange={(e) => setPrSearch(e.target.value)}
                              sx={inputSx(tokens)}
                            />
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8, maxHeight: 280, overflowY: 'auto', pr: 0.5 }}>
                              {filteredPulls.map((pr) => {
                                const isSelected = selectedPr?.number === pr.number;
                                return (
                                  <Box
                                    key={pr.number}
                                    onClick={() => {
                                      setSelectedPr(pr);
                                      setIsChangingPr(false);
                                    }}
                                    sx={{
                                      p: 1.5,
                                      borderRadius: '8px',
                                      border: `1.5px solid ${isSelected ? tokens.primary : tokens.border}`,
                                      backgroundColor: isSelected ? tokens.primary : tokens.surface,
                                      color: isSelected ? '#ffffff !important' : tokens.textPrimary,
                                      cursor: 'pointer',
                                      transition: 'all 0.12s ease',
                                      '&:hover': {
                                        borderColor: tokens.primary,
                                        backgroundColor: isSelected ? tokens.primaryHover : tokens.hover
                                      }
                                    }}
                                  >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4 }}>
                                      <GitPullRequest size={15} color={isSelected ? '#ffffff' : '#a855f7'} />
                                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.85rem', color: isSelected ? '#ffffff' : tokens.textPrimary, flex: 1 }} noWrap>
                                        #{pr.number} {pr.title}
                                      </Typography>
                                      {pr.isDraft && <Chip label="Draft" size="small" sx={{ height: 16, fontSize: '0.65rem' }} />}
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: isSelected ? '#ffffff' : tokens.textSecondary, fontSize: '0.75rem' }}>
                                        <GitBranch size={12} color={isSelected ? '#ffffff' : undefined} />
                                        <span>{pr.headBranch}</span>
                                        <span style={{ opacity: 0.6 }}>→</span>
                                        <span>{pr.baseBranch}</span>
                                      </Box>
                                      {pr.authorLogin && (
                                        <Typography variant="caption" sx={{ color: isSelected ? '#ffffff' : tokens.textSecondary }}>
                                          by @{pr.authorLogin}
                                        </Typography>
                                      )}
                                    </Box>
                                  </Box>
                                );
                              })}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Box>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="https://github.com/org/repo/pull/28"
                      value={prUrl}
                      onChange={(e) => setPrUrl(e.target.value)}
                      InputProps={{
                        startAdornment: <GitPullRequest size={16} style={{ marginRight: 8, color: tokens.textSecondary }} />,
                        endAdornment: isLoadingPr ? <CircularProgress size={16} /> : null
                      }}
                      sx={inputSx(tokens)}
                    />
                    {prPreview && (
                      <Box sx={{ mt: 1.5 }}>
                        <PullRequestPreview pr={prPreview} />
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            )}
          </Box>

          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: tokens.textPrimary }}>
              {isVi ? 'Ghi chú & Bối cảnh cho Reviewer' : 'Context & Notes for Reviewers'}
            </Typography>
            <MarkdownEditor
              value={specialNotes}
              onChange={setSpecialNotes}
              placeholder={
                isVi
                  ? 'Mô tả tóm tắt giải pháp kỹ thuật, các file quan trọng cần đọc trước, các trade-off đã đánh đổi, hoặc test cases cần reviewer xác minh...'
                  : 'Describe the technical approach, key files to inspect first, trade-offs made, or test cases you want reviewers to verify...'
              }
              minRows={5}
            />
          </Box>

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.8 }}>
              <Target size={18} color={tokens.primary} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tokens.textPrimary }}>
                {isVi ? 'Trọng tâm đánh giá (Focus Areas)' : 'Review Focus Areas'}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: tokens.textSecondary, fontSize: '0.8rem', mb: 1.5 }}>
              {isVi
                ? 'Đánh dấu các khía cạnh bạn mong muốn đồng nghiệp tập trung soi kỹ nhất:'
                : 'Select the primary aspects you want your peers to inspect closely:'}
            </Typography>

            <Grid container spacing={1.5}>
              {FOCUS_AREAS_CONFIG.map((item) => {
                const checked = Boolean(focusAreas[item.key]);
                const IconComponent = item.icon;
                return (
                  <Grid item xs={12} sm={6} md={2.4} key={item.key}>
                    <Box
                      onClick={() => toggleFocus(item.key)}
                      sx={{
                        p: 1.6,
                        height: '100%',
                        borderRadius: '8px',
                        border: `1.5px solid ${checked ? tokens.primary : tokens.border}`,
                        backgroundColor: checked ? tokens.primary : tokens.surfaceSecondary,
                        color: checked ? '#ffffff !important' : tokens.textPrimary,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 0.8,
                        '&:hover': {
                          borderColor: tokens.primary,
                          backgroundColor: checked ? tokens.primaryHover : tokens.hover
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: checked ? 'rgba(255, 255, 255, 0.2)' : `${tokens.primary}15`,
                            color: checked ? '#ffffff' : tokens.primary
                          }}
                        >
                          <IconComponent size={16} color={checked ? '#ffffff' : tokens.primary} />
                        </Box>
                        {checked && (
                          <Chip
                            size="small"
                            label={isVi ? 'Ưu tiên' : 'Priority'}
                            sx={{
                              height: 18,
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              backgroundColor: '#ffffff',
                              color: tokens.primary
                            }}
                          />
                        )}
                      </Box>

                      <Box>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.83rem',
                            color: checked ? '#ffffff' : tokens.textPrimary,
                            lineHeight: 1.3,
                            mb: 0.4
                          }}
                        >
                          {isVi ? item.labelVi : item.labelEn}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: checked ? 'rgba(255, 255, 255, 0.85)' : tokens.textSecondary,
                            fontSize: '0.72rem',
                            lineHeight: 1.35,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {isVi ? item.descVi : item.descEn}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Box>

          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Users size={18} color="#a855f7" />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tokens.textPrimary }}>
                {isVi ? 'Chỉ định đồng nghiệp Review (@Reviewer)' : 'Assign Reviewers'}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {usersList.map((u) => {
                const isSelected = reviewerIds.includes(u.id);
                return (
                  <Chip
                    key={u.id}
                    avatar={<UserAvatar user={u} size={24} showTooltip={false} />}
                    label={u.displayName || `@${u.username}`}
                    clickable
                    onClick={() => toggleReviewer(u.id)}
                    sx={{
                      height: 34,
                      px: 0.5,
                      borderRadius: '8px',
                      backgroundColor: isSelected ? '#a855f7' : tokens.surfaceSecondary,
                      color: isSelected ? '#ffffff !important' : tokens.textPrimary,
                      border: `1px solid ${isSelected ? '#a855f7' : tokens.border}`,
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '0.82rem',
                      '&:hover': {
                        backgroundColor: isSelected ? '#9333ea' : tokens.hover
                      }
                    }}
                  />
                );
              })}
            </Box>
          </Box>

          <Box>
            <Button
              size="small"
              variant="text"
              onClick={() => setShowAdvanced((prev) => !prev)}
              sx={{
                textTransform: 'none',
                color: tokens.textSecondary,
                fontSize: '0.8rem',
                p: 0
              }}
            >
              {showAdvanced ? (isVi ? '▲ Thu gọn cài đặt nâng cao' : '▲ Hide advanced') : (isVi ? '▼ Cài đặt nâng cao (Hạn chót, Dự án, Nhánh Git)' : '▼ Advanced settings (Deadline, Project, Git Branch)')}
            </Button>

            <Collapse in={showAdvanced}>
              <Box
                sx={{
                  p: 2,
                  mt: 1.5,
                  borderRadius: '8px',
                  backgroundColor: tokens.surfaceSecondary,
                  border: `1px solid ${tokens.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2
                }}
              >
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small">
                      <InputLabel>{isVi ? 'Dự án' : 'Project'}</InputLabel>
                      <Select
                        value={projectId}
                        label={isVi ? 'Dự án' : 'Project'}
                        onChange={(e) => setProjectId(e.target.value)}
                        sx={inputSx(tokens)}
                      >
                        {projects.map((p) => (
                          <MenuItem key={p.id} value={p.id}>
                            {p.name} ({p.key})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label={isVi ? 'Hạn hoàn thành (Deadline)' : 'Deadline'}
                      type="date"
                      value={deadline}
                      onChange={(e) => setDeadline(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={inputSx(tokens)}
                    />
                  </Grid>

                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      size="small"
                      label={isVi ? 'Nhánh Git (Branch)' : 'Git Branch'}
                      placeholder="e.g. feature/vocabulary-learning-journey"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      sx={inputSx(tokens)}
                    />
                  </Grid>
                </Grid>
              </Box>
            </Collapse>
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              pt: 2,
              borderTop: `1px solid ${tokens.border}`
            }}
          >
            <Button
              variant="outlined"
              onClick={() => setLocation('/reviews')}
              sx={buttonSx(tokens)}
            >
              {isVi ? 'Hủy bỏ' : 'Cancel'}
            </Button>

            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              endIcon={isSubmitting ? <CircularProgress size={16} /> : <Send size={16} />}
              sx={buttonSx(tokens)}
            >
              {isSubmitting ? (isVi ? 'Đang gửi...' : 'Submitting...') : (isVi ? 'Gửi yêu cầu Review' : 'Ask for Review')}
            </Button>
          </Box>
        </Paper>
      </form>
    </Page>
  );
};
