import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  MenuItem,
  Chip,
  Grid,
  Alert,
  Tooltip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Collapse,
  Divider
} from '@mui/material';
import { Page } from '../components/common/Page';
import {
  Bug,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  Link,
  Code,
  ListOrdered,
  Sliders,
  HelpCircle,
  Lightbulb,
  AlertTriangle,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  FolderGit2,
  GitPullRequest,
  GitBranch,
  Lock,
  Globe
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useThemeContext } from '../contexts/ThemeContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useI18n } from '../contexts/I18nContext';
import { apiFetch } from '../api/client';
import { MarkdownEditor } from '../components/editor/MarkdownEditor';
import { getLabelColor } from '../utils/labels';
import {
  IssueType,
  IssuePriority,
  IssueSeverity,
  BugFrequency,
  UserSummaryDto,
  RepositoryDto,
  PullRequestSummaryDto
} from '@reported/contracts';

interface LivePullRequest {
  number: number;
  title: string;
  headBranch: string;
  baseBranch: string;
  headSha?: string;
  authorLogin?: string;
  htmlUrl: string;
  isDraft?: boolean;
}

export const CreateIssuePage: React.FC = () => {
  const { tokens } = useThemeContext();
  const { t, language } = useI18n();
  const { activeWorkspace, projects } = useWorkspace();
  const [, setLocation] = useLocation();
  const isVi = language === 'vi';

  const searchParams = new URLSearchParams(window.location.search);
  const intentParam = searchParams.get('intent') || 'bug';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<IssueType>(
    intentParam === 'question'
      ? IssueType.TASK
      : intentParam === 'idea'
      ? IssueType.FEATURE
      : intentParam === 'discussion'
      ? IssueType.TASK
      : IssueType.BUG
  );
  const [priority, setPriority] = useState<IssuePriority>(
    intentParam === 'help' ? IssuePriority.P0 : IssuePriority.P2
  );
  const [severity, setSeverity] = useState<IssueSeverity>(IssueSeverity.MAJOR);

  const [showPrLink, setShowPrLink] = useState(intentParam !== 'question');
  const [showBugDetails, setShowBugDetails] = useState(intentParam === 'bug' || intentParam === 'help');
  const [showEnvDetails, setShowEnvDetails] = useState(intentParam === 'bug' || intentParam === 'help');
  const [showMetadata, setShowMetadata] = useState(true);

  const [projectId, setProjectId] = useState<string>('');
  const [repositoryId, setRepositoryId] = useState<string>('');
  const [branch, setBranch] = useState('');
  const [commitHash, setCommitHash] = useState('');
  const [prUrl, setPrUrl] = useState('');

  const [environment, setEnvironment] = useState('');
  const [precondition, setPrecondition] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [actualResult, setActualResult] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [frequency, setFrequency] = useState<BugFrequency>(BugFrequency.ALWAYS);
  const [evidenceJsonOrLogs, setEvidenceJsonOrLogs] = useState('');

  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>(
    intentParam === 'question'
      ? ['question']
      : intentParam === 'idea'
      ? ['proposal']
      : intentParam === 'help'
      ? ['urgent', 'blocker']
      : intentParam === 'discussion'
      ? ['discussion']
      : ['bug']
  );

  const [usersList, setUsersList] = useState<UserSummaryDto[]>([]);
  const [repositoriesList, setRepositoriesList] = useState<RepositoryDto[]>([]);
  const [prPreview, setPrPreview] = useState<PullRequestSummaryDto | null>(null);
  const [livePulls, setLivePulls] = useState<LivePullRequest[]>([]);
  const [selectedPr, setSelectedPr] = useState<LivePullRequest | null>(null);
  const [loadingLivePulls, setLoadingLivePulls] = useState(false);
  const [livePullsError, setLivePullsError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('reported_issue_draft');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.type) setType(parsed.type);
        if (parsed.priority) setPriority(parsed.priority);
        if (parsed.severity) setSeverity(parsed.severity);
        if (parsed.environment) {
          setEnvironment(parsed.environment);
          setShowEnvDetails(true);
        }
        if (parsed.stepsToReproduce) {
          setStepsToReproduce(parsed.stepsToReproduce);
          setShowBugDetails(true);
        }
        if (parsed.actualResult) setActualResult(parsed.actualResult);
        if (parsed.expectedResult) setExpectedResult(parsed.expectedResult);
        if (parsed.prUrl) {
          setPrUrl(parsed.prUrl);
          setShowPrLink(true);
        }
        if (parsed.selectedLabels) setSelectedLabels(parsed.selectedLabels);
        setLastSaved(parsed.savedAt || null);
      }
    } catch {
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (title || description || stepsToReproduce) {
        const payload = {
          title,
          description,
          type,
          priority,
          severity,
          environment,
          stepsToReproduce,
          actualResult,
          expectedResult,
          prUrl,
          selectedLabels,
          savedAt: new Date().toLocaleTimeString()
        };
        localStorage.setItem('reported_issue_draft', JSON.stringify(payload));
        setLastSaved(payload.savedAt);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [
    title,
    description,
    type,
    priority,
    severity,
    environment,
    stepsToReproduce,
    actualResult,
    expectedResult,
    prUrl,
    selectedLabels
  ]);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (!activeWorkspace) return;
      try {
        const [membersRes, rRes] = await Promise.all([
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
  }, [projects, projectId]);

  useEffect(() => {
    if (repositoriesList.length > 0 && !repositoryId) {
      setRepositoryId(repositoriesList[0].id);
    }
  }, [repositoriesList, projectId, repositoryId]);

  useEffect(() => {
    if (!repositoryId || !showPrLink) {
      setLivePulls([]);
      setSelectedPr(null);
      return;
    }
    const fetchLivePulls = async () => {
      setLoadingLivePulls(true);
      setLivePullsError(null);
      try {
        const data = await apiFetch<{ pulls: LivePullRequest[]; error?: string }>(`/github/repositories/${repositoryId}/github-pulls`);
        setLivePulls(data.pulls || []);
        if (data.error) setLivePullsError(data.error);
      } catch {
        setLivePulls([]);
        setLivePullsError(isVi ? 'Không tải được Pull Request từ GitHub.' : 'Failed to load Pull Requests from GitHub.');
      } finally {
        setLoadingLivePulls(false);
      }
    };
    fetchLivePulls();
  }, [repositoryId, showPrLink]);

  useEffect(() => {
    if (!selectedPr) return;
    if (!title.trim()) setTitle(`#${selectedPr.number}: ${selectedPr.title}`);
    if (selectedPr.headBranch) setBranch(selectedPr.headBranch);
    if (selectedPr.headSha) setCommitHash(selectedPr.headSha);
    if (selectedPr.htmlUrl) setPrUrl(selectedPr.htmlUrl);
  }, [selectedPr]);

  useEffect(() => {
    if (!prUrl) {
      setPrPreview(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const preview = await apiFetch<PullRequestSummaryDto>(
          `/github/preview-pr?url=${encodeURIComponent(prUrl)}`
        );
        setPrPreview(preview);
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
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [prUrl, repositoriesList]);

  const handleClearDraft = () => {
    localStorage.removeItem('reported_issue_draft');
    setTitle('');
    setDescription('');
    setEnvironment('');
    setPrecondition('');
    setStepsToReproduce('');
    setActualResult('');
    setExpectedResult('');
    setEvidenceJsonOrLogs('');
    setPrUrl('');
    setLastSaved(null);
  };

  const handleInsertLogSnippet = () => {
    const snippet = '\n```\nPaste stacktrace, terminal output, or logs here\n\n```\n';
    setDescription((prev) => prev + snippet);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg(isVi ? 'Vui lòng nhập tiêu đề bài viết' : 'Please enter a title');
      return;
    }

    let finalDesc = description.trim();
    let bugDetailsPayload = null;

    if (stepsToReproduce.trim() || actualResult.trim() || expectedResult.trim()) {
      bugDetailsPayload = {
        environment: environment || 'Default Environment',
        precondition,
        stepsToReproduce: stepsToReproduce.trim() || 'See description',
        actualResult: actualResult.trim() || 'See description',
        expectedResult: expectedResult.trim() || 'See description',
        frequency,
        evidenceJsonOrLogs
      };

      if (!finalDesc) {
        finalDesc = `### Steps to reproduce:\n${stepsToReproduce}\n\n### Actual:\n${actualResult}\n\n### Expected:\n${expectedResult}`;
      }
    }

    if (!finalDesc) {
      setErrorMsg(
        isVi
          ? 'Vui lòng nhập nội dung mô tả hoặc đính kèm các bước tái hiện'
          : 'Please enter a description or reproduction steps'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiFetch<{ id: string; number: number }>('/issues', {
        method: 'POST',
        body: JSON.stringify({
          workspaceId: activeWorkspace?.id,
          projectId: projectId || undefined,
          title: title.trim(),
          description: finalDesc,
          type,
          priority,
          severity,
          labels: selectedLabels,
          assigneeIds,
          repositoryId: repositoryId || undefined,
          prUrl: prUrl.trim() || undefined,
          branch: branch.trim() || undefined,
          commitHash: commitHash.trim() || undefined,
          bugDetails: bugDetailsPayload
        })
      });

      localStorage.removeItem('reported_issue_draft');
      setLocation(`/issues/${res.number}`);
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message || 'Không thể tạo bài viết. Vui lòng thử lại.';
      setErrorMsg(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLabel = (lbl: string) => {
    if (selectedLabels.includes(lbl)) {
      setSelectedLabels(selectedLabels.filter((l) => l !== lbl));
    } else {
      setSelectedLabels([...selectedLabels, lbl]);
    }
  };

  const intentCopy = {
    bug: {
      icon: <Bug size={24} color="#ef4444" />,
      title: isVi ? 'Báo lỗi' : 'Report Bug',
      placeholder: isVi ? 'Ví dụ: Lưu hồ sơ lỗi 500 khi thiếu ảnh đại diện' : 'e.g., Saving profile returns 500 when avatar is missing',
      body: isVi ? 'Lỗi xảy ra ở đâu? Bạn đã làm gì trước đó? Có log hoặc ảnh chụp thì dán luôn.' : 'Where does it fail? What happened before it? Paste logs or screenshots if available.'
    },
    question: {
      icon: <HelpCircle size={24} color="#3b82f6" />,
      title: isVi ? 'Hỏi kỹ thuật' : 'Ask Question',
      placeholder: isVi ? 'Ví dụ: Refresh token khi nhiều request gọi cùng lúc nên xử lý thế nào?' : 'e.g., How should token refresh work when many requests run together?',
      body: isVi ? 'Nêu bối cảnh, điều đã thử và chỗ đang phân vân. Repo liên quan sẽ được gắn tự động nếu chọn bên dưới.' : 'Share context, what you tried, and what feels unclear. Pick related repo below if needed.'
    },
    idea: {
      icon: <Lightbulb size={24} color="#10b981" />,
      title: isVi ? 'Đề xuất' : 'Proposal',
      placeholder: isVi ? 'Ví dụ: Cache danh sách workspace để giảm thời gian mở dashboard' : 'e.g., Cache workspace list to speed up dashboard load',
      body: isVi ? 'Mô tả vấn đề, đề xuất thay đổi và lợi ích. Nếu liên quan repo/project, chọn ngay bên dưới.' : 'Describe problem, proposed change, and value. Pick project/repo below when relevant.'
    },
    help: {
      icon: <AlertTriangle size={24} color="#f59e0b" />,
      title: isVi ? 'Cần hỗ trợ gấp' : 'Urgent Help',
      placeholder: isVi ? 'Ví dụ: Staging không deploy được sau migration auth' : 'e.g., Staging cannot deploy after auth migration',
      body: isVi ? 'Nói rõ mức độ ảnh hưởng, log mới nhất và ai cần vào xử lý ngay.' : 'State impact, latest logs, and who should jump in now.'
    },
    discussion: {
      icon: <MessageSquare size={24} color="#06b6d4" />,
      title: isVi ? 'Bàn kiến trúc' : 'Architecture Talk',
      placeholder: isVi ? 'Ví dụ: Tách notification worker ra service riêng hay giữ trong API?' : 'e.g., Split notification worker into its own service or keep it in API?',
      body: isVi ? 'Đưa các phương án, trade-off và quyết định cần chốt. Giữ ngắn để mọi người phản hồi nhanh.' : 'List options, trade-offs, and the decision needed. Keep it short so people can respond fast.'
    }
  };
  const copy = intentCopy[(intentParam as keyof typeof intentCopy) in intentCopy ? intentParam as keyof typeof intentCopy : 'bug'];
  const headerIcon = copy.icon;
  const headerTitle = copy.title;
  const titlePlaceholder = copy.placeholder;

  return (
    <Page variant="form">
      {/* ━━ HEADER ROW ━━ */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Tooltip title={isVi ? 'Quay lại' : 'Back'}>
            <IconButton onClick={() => setLocation('/issues')} sx={{ border: `1px solid ${tokens.border}` }}>
              <ArrowLeft size={18} />
            </IconButton>
          </Tooltip>
          <Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: tokens.textPrimary, display: 'flex', alignItems: 'center', gap: 1 }}
            >
              {headerIcon} {headerTitle}
            </Typography>
            <Typography variant="body2" sx={{ color: tokens.textSecondary, fontSize: '0.85rem' }}>
              {isVi
                ? 'Nói chuyện thoải mái, giữ đúng ngữ cảnh mã nguồn và không bị trôi thông tin.'
                : 'Lightweight, high-context developer post with instant peer visibility.'}
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

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: '8px' }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2.5, md: 3.5 },
            borderRadius: '8px',
            border: `1px solid ${tokens.border}`,
            backgroundColor: tokens.surface,
            mb: 3
          }}
        >
          {/* 1. Title */}
          <TextField
            fullWidth
            placeholder={titlePlaceholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            variant="outlined"
            required
            autoFocus
            sx={{
              mb: 2.5,
              '& .MuiOutlinedInput-root': {
                fontSize: '1.15rem',
                fontWeight: 700,
                borderRadius: '8px'
              }
            }}
          />

          {/* 2. Main Markdown Textarea */}
          <Box sx={{ mb: 2 }}>
            <MarkdownEditor
              value={description}
              onChange={setDescription}
              placeholder={
                isVi
                  ? copy.body
                  : copy.body
              }
              minRows={6}
            />
          </Box>

          {/* 3. Action Row for Progressive Disclosure */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 1,
              pt: 1,
              pb: 2,
              borderBottom: `1px solid ${tokens.divider}`,
              mb: 2
            }}
          >
            <Button
              size="small"
              variant={showPrLink ? 'contained' : 'outlined'}
              startIcon={<Link size={15} />}
              onClick={() => setShowPrLink((prev) => !prev)}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              {showPrLink ? (isVi ? 'Đã liên kết PR' : 'PR linked') : isVi ? 'Liên kết PR GitHub' : 'Link GitHub PR'}
            </Button>

            <Button
              size="small"
              variant="outlined"
              startIcon={<Code size={15} />}
              onClick={handleInsertLogSnippet}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              {isVi ? 'Chèn log / trace' : 'Paste logs'}
            </Button>

            <Button
              size="small"
              variant={showBugDetails ? 'contained' : 'outlined'}
              startIcon={<ListOrdered size={15} />}
              onClick={() => setShowBugDetails((prev) => !prev)}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              {showBugDetails
                ? isVi
                  ? 'Các bước tái hiện'
                  : 'Repro steps added'
                : isVi
                ? 'Thêm bước tái hiện'
                : 'Add repro steps'}
            </Button>

            <Button
              size="small"
              variant={showEnvDetails ? 'contained' : 'outlined'}
              startIcon={<Sliders size={15} />}
              onClick={() => setShowEnvDetails((prev) => !prev)}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              {showEnvDetails ? (isVi ? 'Môi trường đã thêm' : 'Environment added') : isVi ? 'Thêm môi trường' : 'Add environment'}
            </Button>

            <Button
              size="small"
              variant={showMetadata ? 'contained' : 'text'}
              startIcon={showMetadata ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              onClick={() => setShowMetadata((prev) => !prev)}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontSize: '0.8rem',
                fontWeight: 700,
                color: showMetadata ? '#fff' : tokens.textSecondary,
                '& svg': { color: showMetadata ? '#fff' : tokens.textSecondary, stroke: showMetadata ? '#fff' : tokens.textSecondary }
              }}
            >
              {showMetadata ? (isVi ? 'Ẩn phân loại' : 'Hide metadata') : isVi ? 'Người nhận & Phân loại' : 'Assignees & Metadata'}
            </Button>
          </Box>

          {/* ━━ EXPANDABLE 1: PR LINK ━━ */}
          <Collapse in={showPrLink}>
            <Box
              sx={{
                p: 2,
                mb: 2.5,
                borderRadius: '8px',
                backgroundColor: tokens.surfaceSecondary,
                border: `1px solid ${tokens.border}`
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: tokens.textPrimary }}>
                {isVi ? 'Liên kết repo / Pull Request' : 'Link Repo / Pull Request'}
              </Typography>

              <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                <InputLabel>{isVi ? 'Repository đã liên kết' : 'Linked Repository'}</InputLabel>
                <Select
                  value={repositoryId}
                  label={isVi ? 'Repository đã liên kết' : 'Linked Repository'}
                  onChange={(e) => setRepositoryId(e.target.value)}
                >
                  {repositoriesList.length === 0 && (
                    <MenuItem value="" disabled>
                      {isVi ? 'Chưa có repository nào được liên kết' : 'No linked repositories yet'}
                    </MenuItem>
                  )}
                  {repositoriesList.map((repo) => (
                    <MenuItem key={repo.id} value={repo.id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {repo.isPrivate ? <Lock size={14} /> : <Globe size={14} />}
                        <span>{repo.fullName}</span>
                        <Chip label={repo.defaultBranch} size="small" sx={{ height: 18, fontSize: '0.68rem' }} />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {repositoryId && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                  {loadingLivePulls ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1, color: tokens.textSecondary }}>
                      <CircularProgress size={14} />
                      <span>{isVi ? 'Đang tải Pull Request...' : 'Loading Pull Requests...'}</span>
                    </Box>
                  ) : livePullsError ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Alert severity="warning" sx={{ borderRadius: '6px', fontSize: '0.8rem', py: 0.5 }}>{livePullsError}</Alert>
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
                    <Alert severity="info" sx={{ borderRadius: '6px', fontSize: '0.8rem', py: 0.5 }}>
                      {isVi ? 'Repo này chưa có Pull Request đang mở.' : 'No open Pull Requests for this repository.'}
                    </Alert>
                  ) : (
                    livePulls.map((pr) => {
                      const isSelected = selectedPr?.number === pr.number;
                      return (
                        <Box
                          key={pr.number}
                          onClick={() => setSelectedPr(isSelected ? null : pr)}
                          sx={{
                            p: 1.25,
                            borderRadius: '6px',
                            border: `1px solid ${isSelected ? tokens.primary : tokens.border}`,
                            backgroundColor: isSelected ? tokens.primary : tokens.surface,
                            color: isSelected ? '#ffffff !important' : tokens.textPrimary,
                            cursor: 'pointer',
                            '& svg, & svg *': {
                              color: isSelected ? '#ffffff !important' : undefined,
                              stroke: isSelected ? '#ffffff !important' : undefined
                            },
                            '&:hover': { backgroundColor: isSelected ? tokens.primaryHover : tokens.hover }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <GitPullRequest size={14} color={isSelected ? '#ffffff' : undefined} />
                            <Typography variant="body2" sx={{ fontWeight: 700, color: isSelected ? '#ffffff !important' : 'inherit' }} noWrap>
                              #{pr.number} {pr.title}
                            </Typography>
                            {pr.isDraft && <Chip label="Draft" size="small" sx={{ height: 18 }} />}
                          </Box>
                          <Typography variant="caption" sx={{ color: isSelected ? '#ffffff !important' : tokens.textSecondary }}>
                            {pr.headBranch} → {pr.baseBranch}{pr.authorLogin ? ` • @${pr.authorLogin}` : ''}
                          </Typography>
                        </Box>
                      );
                    })
                  )}
                </Box>
              )}
            </Box>
          </Collapse>

          {/* ━━ EXPANDABLE 2: STRUCTURED BUG DETAILS ━━ */}
          <Collapse in={showBugDetails}>
            <Box
              sx={{
                p: 2.5,
                mb: 2.5,
                borderRadius: '8px',
                backgroundColor: tokens.surfaceSecondary,
                border: `1px solid ${tokens.border}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tokens.textPrimary }}>
                {isVi ? 'Cấu trúc chi tiết tái hiện lỗi' : 'Reproduction Details'}
              </Typography>

              <TextField
                fullWidth
                multiline
                rows={3}
                label={isVi ? 'Các bước tái hiện' : 'Steps to reproduce'}
                placeholder={'1. Vào trang...\n2. Bấm nút...\n3. Nhìn thấy...'}
                value={stepsToReproduce}
                onChange={(e) => setStepsToReproduce(e.target.value)}
              />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label={isVi ? 'Kết quả thực tế' : 'Actual result'}
                    placeholder={isVi ? 'Ứng dụng phản hồi 500...' : 'App returns 500 error...'}
                    value={actualResult}
                    onChange={(e) => setActualResult(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label={isVi ? 'Kết quả mong đợi' : 'Expected result'}
                    placeholder={isVi ? 'Phải hiển thị thông báo validation rõ ràng...' : 'Should display clean validation message...'}
                    value={expectedResult}
                    onChange={(e) => setExpectedResult(e.target.value)}
                  />
                </Grid>
              </Grid>
            </Box>
          </Collapse>

          {/* ━━ EXPANDABLE 3: ENVIRONMENT & LOGS ━━ */}
          <Collapse in={showEnvDetails}>
            <Box
              sx={{
                p: 2.5,
                mb: 2.5,
                borderRadius: '8px',
                backgroundColor: tokens.surfaceSecondary,
                border: `1px solid ${tokens.border}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 2
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tokens.textPrimary }}>
                {isVi ? 'Môi trường hệ thống' : 'Environment & Setup'}
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    size="small"
                    label={isVi ? 'Môi trường / Phiên bản' : 'Environment / Version'}
                    placeholder="e.g. Node 22, Docker, Chrome 128, macOS"
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{isVi ? 'Tần suất' : 'Frequency'}</InputLabel>
                    <Select
                      value={frequency}
                      label={isVi ? 'Tần suất' : 'Frequency'}
                      onChange={(e) => setFrequency(e.target.value as BugFrequency)}
                    >
                      <MenuItem value={BugFrequency.ALWAYS}>{isVi ? 'Luôn luôn (100%)' : 'Always (100%)'}</MenuItem>
                      <MenuItem value={BugFrequency.OFTEN}>{isVi ? 'Thường xuyên' : 'Often (> 50%)'}</MenuItem>
                      <MenuItem value={BugFrequency.SOMETIMES}>{isVi ? 'Thỉnh thoảng' : 'Sometimes'}</MenuItem>
                      <MenuItem value={BugFrequency.RARE}>{isVi ? 'Hiếm khi' : 'Rare'}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          </Collapse>

          {/* ━━ EXPANDABLE 4: METADATA, ASSIGNEES, LABELS ━━ */}
          <Collapse in={showMetadata}>
            <Box
              sx={{
                p: 2.5,
                mb: 2.5,
                borderRadius: '8px',
                backgroundColor: tokens.surfaceSecondary,
                border: `1px solid ${tokens.border}`
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, color: tokens.textPrimary }}>
                {isVi ? 'Người nhận & Phân loại' : 'Assignees & Metadata'}
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{isVi ? 'Mức độ ưu tiên' : 'Priority'}</InputLabel>
                    <Select
                      value={priority}
                      label={isVi ? 'Mức độ ưu tiên' : 'Priority'}
                      onChange={(e) => setPriority(e.target.value as IssuePriority)}
                    >
                      <MenuItem value={IssuePriority.P0}>P0 - Blocker</MenuItem>
                      <MenuItem value={IssuePriority.P1}>P1 - Critical</MenuItem>
                      <MenuItem value={IssuePriority.P2}>P2 - Major</MenuItem>
                      <MenuItem value={IssuePriority.P3}>P3 - Minor</MenuItem>
                      <MenuItem value={IssuePriority.P4}>P4 - Trivial</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{isVi ? 'Dự án' : 'Project'}</InputLabel>
                    <Select
                      value={projectId}
                      label={isVi ? 'Dự án' : 'Project'}
                      onChange={(e) => setProjectId(e.target.value)}
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
                  <FormControl fullWidth size="small">
                    <InputLabel>{isVi ? 'Người thực hiện' : 'Assignee'}</InputLabel>
                    <Select
                      multiple
                      value={assigneeIds}
                      label={isVi ? 'Người thực hiện' : 'Assignee'}
                      onChange={(e) =>
                        setAssigneeIds(
                          typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value
                        )
                      }
                      renderValue={(selected) => (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {selected.map((uid) => {
                            const u = usersList.find((usr) => usr.id === uid);
                            return <Chip key={uid} label={u?.displayName || uid} size="small" />;
                          })}
                        </Box>
                      )}
                    >
                      {usersList.map((u) => (
                        <MenuItem key={u.id} value={u.id}>
                          {u.displayName} (@{u.username})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: tokens.textSecondary, mb: 1, display: 'block' }}>
                    {isVi ? 'Nhãn phân loại:' : 'Labels:'}
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                    {['bug', 'frontend', 'backend', 'auth', 'database', 'api', 'ui/ux', 'performance', 'security'].map(
                      (lbl) => {
                        const isSelected = selectedLabels.includes(lbl);
                        const color = getLabelColor(lbl);
                        return (
                          <Chip
                            key={lbl}
                            label={lbl}
                            clickable
                            size="small"
                            onClick={() => toggleLabel(lbl)}
                            sx={{
                              backgroundColor: isSelected ? color : 'transparent',
                              color: isSelected ? '#ffffff' : tokens.textPrimary,
                              border: `1px solid ${color}`,
                              fontWeight: isSelected ? 700 : 500,
                              fontSize: '0.75rem'
                            }}
                          />
                        );
                      }
                    )}
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Collapse>

          {/* ━━ SUBMIT ROW ━━ */}
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
              onClick={() => setLocation('/issues')}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                color: tokens.textSecondary,
                borderColor: tokens.border
              }}
            >
              {isVi ? 'Hủy bỏ' : 'Cancel'}
            </Button>

            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              endIcon={isSubmitting ? <CircularProgress size={16} /> : <Send size={15} />}
              sx={{
                backgroundColor: tokens.primary,
                borderRadius: '8px',
                px: 3,
                py: 1,
                fontWeight: 700,
                textTransform: 'none',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
                '&:hover': {
                  backgroundColor: tokens.primaryHover
                }
              }}
            >
              {isVi ? 'Đăng bài' : 'Post'}
            </Button>
          </Box>
        </Paper>
      </form>
    </Page>
  );
};
