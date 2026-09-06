import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Autocomplete,
  Alert,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import { Bug, CheckSquare, Sparkles, Lock, Globe, GitPullRequest } from 'lucide-react';
import {
  IssueType,
  IssueStatus,
  IssuePriority,
  IssueSeverity,
  BugFrequency,
  CreateIssueDto,
  RepositoryDto,
  UserSummaryDto
} from '@reported/contracts';
import { MarkdownEditor } from '../editor/MarkdownEditor';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useAuthContext } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { ContextualCodeHostingNotice } from '../common/ConnectedAccountNotice';
import { apiFetch } from '../../api/client';
import { buttonSx, inputSx } from '../../theme/ui';
import { UserAvatar } from '../common/UserAvatar';
import { getLabelColor } from '../../utils/labels';

interface CreateIssueModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (number: number) => void;
}

export const CreateIssueModal: React.FC<CreateIssueModalProps> = ({ open, onClose, onSuccess }) => {
  const { tokens } = useThemeContext();
  const { hasCodeHostingConnected } = useAuthContext();
  const { language } = useI18n();
  const isVi = language === 'vi';

  const [useTemplate, setUseTemplate] = useState(true);
  const [issueType, setIssueType] = useState<IssueType>(IssueType.BUG);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<IssuePriority>(IssuePriority.P2);
  const [severity, setSeverity] = useState<IssueSeverity>(IssueSeverity.MAJOR);

  const [environment, setEnvironment] = useState('');
  const [precondition, setPrecondition] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [actualResult, setActualResult] = useState('');
  const [expectedResult, setExpectedResult] = useState('');
  const [frequency, setFrequency] = useState<BugFrequency>(BugFrequency.ALWAYS);
  const [evidenceJson, setEvidenceJson] = useState('');

  const [repositories, setRepositories] = useState<RepositoryDto[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>('');
  const [prUrl, setPrUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [commitHash, setCommitHash] = useState('');

  const [allUsers, setAllUsers] = useState<UserSummaryDto[]>([]);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [labels, setLabels] = useState<string[]>(['bug']);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    apiFetch<UserSummaryDto[]>('/users').then(setAllUsers).catch(console.error);
    apiFetch<RepositoryDto[]>('/github/repositories').then(setRepositories).catch(console.error);
  }, [open]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError(isVi ? 'Vui lòng nhập tiêu đề' : 'Title is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const bugDetails = (issueType === IssueType.BUG && useTemplate) ? {
        environment: environment || 'Default Environment',
        precondition: precondition || undefined,
        stepsToReproduce: stepsToReproduce || 'See description',
        actualResult: actualResult || 'See description',
        expectedResult: expectedResult || 'See description',
        frequency,
        evidenceJsonOrLogs: evidenceJson || undefined
      } : null;

      const payload: CreateIssueDto = {
        title,
        description: description || title,
        type: issueType,
        status: IssueStatus.OPEN,
        priority,
        severity,
        labels,
        assigneeIds: selectedAssigneeIds,
        repositoryId: selectedRepoId || null,
        prUrl: prUrl || null,
        branch: branch || null,
        commitHash: commitHash || null,
        bugDetails
      };

      const res = await apiFetch<{ id: string; number: number }>('/issues', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      onSuccess(res.number);
      onClose();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : (err as { message?: string })?.message || 'Failed to create issue';
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: tokens.surface,
          borderRadius: '8px',
          border: `1px solid ${tokens.border}`
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${tokens.border}`, pb: 1.5 }}>
        <Typography variant="h6" sx={{ fontSize: '1.05rem', fontWeight: 700, color: tokens.textPrimary }}>
          {isVi ? 'Tạo vấn đề mới' : 'New Issue'}
        </Typography>

        <ToggleButtonGroup
          size="small"
          value={issueType}
          exclusive
          onChange={(_, val) => val && setIssueType(val)}
          sx={{ height: 32 }}
        >
          <ToggleButton value={IssueType.BUG} sx={{ px: 1.5, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Bug size={14} /> Bug
          </ToggleButton>
          <ToggleButton value={IssueType.TASK} sx={{ px: 1.5, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CheckSquare size={14} /> Task
          </ToggleButton>
          <ToggleButton value={IssueType.FEATURE} sx={{ px: 1.5, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Sparkles size={14} /> Feature
          </ToggleButton>
        </ToggleButtonGroup>
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && (
          <Alert severity="error" sx={{ borderRadius: '8px' }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TextField
          autoFocus
          fullWidth
          label={isVi ? 'Tiêu đề vấn đề *' : 'Issue Title *'}
          placeholder={isVi ? 'Tóm tắt ngắn gọn lỗi hoặc tác vụ...' : 'Concise summary of the bug or task...'}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          sx={inputSx(tokens)}
        />

        {issueType === IssueType.BUG && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              size="small"
              variant={useTemplate ? 'contained' : 'outlined'}
              onClick={() => setUseTemplate(true)}
              sx={{ fontSize: '0.75rem', borderRadius: '6px', textTransform: 'none' }}
            >
              {isVi ? 'Mẫu cấu trúc Bug' : 'Structured Bug Template'}
            </Button>
            <Button
              size="small"
              variant={!useTemplate ? 'contained' : 'outlined'}
              onClick={() => setUseTemplate(false)}
              sx={{ fontSize: '0.75rem', borderRadius: '6px', textTransform: 'none' }}
            >
              {isVi ? 'Markdown tự do' : 'Blank Markdown'}
            </Button>
          </Box>
        )}

        {issueType === IssueType.BUG && useTemplate ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <TextField
              size="small"
              fullWidth
              label={isVi ? 'Môi trường (Environment)' : 'Environment'}
              placeholder="e.g. Production, Staging, Safari 17.2 macOS"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              sx={inputSx(tokens)}
            />

            <TextField
              size="small"
              fullWidth
              label={isVi ? 'Điều kiện tiên quyết (Precondition)' : 'Preconditions'}
              placeholder="e.g. Logged in as workspace member with 2 repos linked"
              value={precondition}
              onChange={(e) => setPrecondition(e.target.value)}
              sx={inputSx(tokens)}
            />

            <TextField
              fullWidth
              multiline
              rows={3}
              label={isVi ? 'Các bước tái hiện (Steps to Reproduce)' : 'Steps to Reproduce'}
              placeholder={'1. Vào trang...\n2. Bấm nút...\n3. Gặp lỗi...'}
              value={stepsToReproduce}
              onChange={(e) => setStepsToReproduce(e.target.value)}
              sx={inputSx(tokens)}
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label={isVi ? 'Kết quả thực tế (Actual Result)' : 'Actual Result'}
                value={actualResult}
                onChange={(e) => setActualResult(e.target.value)}
                sx={inputSx(tokens)}
              />
              <TextField
                fullWidth
                multiline
                rows={2}
                label={isVi ? 'Kết quả mong đợi (Expected Result)' : 'Expected Result'}
                value={expectedResult}
                onChange={(e) => setExpectedResult(e.target.value)}
                sx={inputSx(tokens)}
              />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 1.5 }}>
              <FormControl size="small" fullWidth>
                <InputLabel>{isVi ? 'Tần suất' : 'Frequency'}</InputLabel>
                <Select
                  value={frequency}
                  label={isVi ? 'Tần suất' : 'Frequency'}
                  onChange={(e) => setFrequency(e.target.value as BugFrequency)}
                  sx={inputSx(tokens)}
                >
                  <MenuItem value={BugFrequency.ALWAYS}>{isVi ? 'Luôn luôn (100%)' : 'Every time (100%)'}</MenuItem>
                  <MenuItem value={BugFrequency.OFTEN}>{isVi ? 'Thường xuyên (~50%)' : 'Often (~50%)'}</MenuItem>
                  <MenuItem value={BugFrequency.SOMETIMES}>{isVi ? 'Thỉnh thoảng' : 'Intermittent'}</MenuItem>
                  <MenuItem value={BugFrequency.RARE}>{isVi ? 'Hiếm khi' : 'Rarely'}</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth>
                <InputLabel>{isVi ? 'Mức ưu tiên' : 'Priority'}</InputLabel>
                <Select
                  value={priority}
                  label={isVi ? 'Mức ưu tiên' : 'Priority'}
                  onChange={(e) => setPriority(e.target.value as IssuePriority)}
                  sx={inputSx(tokens)}
                >
                  <MenuItem value={IssuePriority.P0}>P0 - Blocker</MenuItem>
                  <MenuItem value={IssuePriority.P1}>P1 - High</MenuItem>
                  <MenuItem value={IssuePriority.P2}>P2 - Medium</MenuItem>
                  <MenuItem value={IssuePriority.P3}>P3 - Low</MenuItem>
                  <MenuItem value={IssuePriority.P4}>P4 - None</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" fullWidth>
                <InputLabel>{isVi ? 'Mức nghiêm trọng' : 'Severity'}</InputLabel>
                <Select
                  value={severity}
                  label={isVi ? 'Mức nghiêm trọng' : 'Severity'}
                  onChange={(e) => setSeverity(e.target.value as IssueSeverity)}
                  sx={inputSx(tokens)}
                >
                  <MenuItem value={IssueSeverity.BLOCKER}>Blocker</MenuItem>
                  <MenuItem value={IssueSeverity.CRITICAL}>Critical</MenuItem>
                  <MenuItem value={IssueSeverity.MAJOR}>Major</MenuItem>
                  <MenuItem value={IssueSeverity.MINOR}>Minor</MenuItem>
                  <MenuItem value={IssueSeverity.TRIVIAL}>Trivial</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ color: tokens.textSecondary, mb: 0.5, display: 'block', fontWeight: 600 }}>
                {isVi ? 'LOG / STACK TRACE / PAYLOAD JSON' : 'EVIDENCE / LOGS / JSON PAYLOAD'}
              </Typography>
              <MarkdownEditor
                value={evidenceJson}
                onChange={setEvidenceJson}
                placeholder={isVi ? 'Dán stack trace, payload JSON hoặc terminal logs tại đây...' : 'Paste stack trace, JSON error payload, or terminal logs here...'}
                minRows={3}
              />
            </Box>
          </Box>
        ) : (
          <Box>
            <Typography variant="caption" sx={{ color: tokens.textSecondary, mb: 0.5, display: 'block', fontWeight: 600 }}>
              {isVi ? 'MÔ TẢ CHI TIẾT (Markdown)' : 'DESCRIPTION (Markdown)'}
            </Typography>
            <MarkdownEditor
              value={description}
              onChange={setDescription}
              placeholder={isVi ? 'Mô tả chi tiết tác vụ, đính kèm liên kết, code snippet hoặc phương án đề xuất...' : 'Describe the issue, add links, code snippets, or JSON...'}
              minRows={5}
            />
          </Box>
        )}

        {!hasCodeHostingConnected && (
          <ContextualCodeHostingNotice returnPath="/issues" />
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          <FormControl size="small" fullWidth>
            <InputLabel>{isVi ? 'Repository liên kết' : 'Repository'}</InputLabel>
            <Select
              value={selectedRepoId}
              label={isVi ? 'Repository liên kết' : 'Repository'}
              onChange={(e) => setSelectedRepoId(e.target.value)}
              sx={inputSx(tokens)}
            >
              <MenuItem value="">{isVi ? 'Không liên kết' : 'None'}</MenuItem>
              {repositories.map((repo) => (
                <MenuItem key={repo.id} value={repo.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {repo.isPrivate ? <Lock size={14} /> : <Globe size={14} />}
                    <span>{repo.fullName}</span>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            fullWidth
            label={isVi ? 'Link Pull Request (tùy chọn)' : 'PR URL (optional)'}
            placeholder="https://github.com/.../pull/28"
            value={prUrl}
            onChange={(e) => setPrUrl(e.target.value)}
            InputProps={{
              startAdornment: <GitPullRequest size={16} style={{ marginRight: 8, color: tokens.textSecondary }} />
            }}
            sx={inputSx(tokens)}
          />
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          <Autocomplete
            multiple
            size="small"
            options={allUsers}
            getOptionLabel={(option) => `${option.displayName} (@${option.username})`}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <UserAvatar user={option} size={20} showTooltip={false} />
                  <span>{option.displayName} (@{option.username})</span>
                </Box>
              </li>
            )}
            onChange={(_, vals) => setSelectedAssigneeIds(vals.map(v => v.id))}
            renderInput={(params) => (
              <TextField
                {...params}
                label={isVi ? 'Người phụ trách (Assignees)' : 'Assignees'}
                placeholder={isVi ? 'Chọn người...' : 'Select users...'}
                sx={inputSx(tokens)}
              />
            )}
          />

          <Autocomplete
            multiple
            freeSolo
            size="small"
            options={['bug', 'performance', 'security', 'backend', 'frontend', 'database', 'architecture']}
            value={labels}
            onChange={(_, vals) => setLabels(vals)}
            renderTags={(val, getTagProps) =>
              val.map((option, index) => {
                const style = getLabelColor(option);
                return (
                  <Chip
                    {...getTagProps({ index })}
                    key={option}
                    label={option}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      backgroundColor: style.bg,
                      color: style.text,
                      border: `1px solid ${style.border}`
                    }}
                  />
                );
              })
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label={isVi ? 'Nhãn (Labels)' : 'Labels'}
                placeholder={isVi ? 'Thêm nhãn...' : 'Add labels...'}
                sx={inputSx(tokens)}
              />
            )}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: `1px solid ${tokens.border}`, justifyContent: 'space-between' }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: tokens.textSecondary }}>
          {isVi ? 'Hủy' : 'Cancel'}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting || !title.trim()}
          sx={buttonSx(tokens)}
        >
          {isSubmitting ? (isVi ? 'Đang tạo...' : 'Creating...') : (isVi ? 'Tạo vấn đề' : 'Create Issue')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
