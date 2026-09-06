import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, InputAdornment, Select, MenuItem, FormControl,
  InputLabel, Button, Chip, Pagination, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions
} from '@mui/material';
import { Search, MessageSquare, X, Plus, Bookmark } from 'lucide-react';
import { useLocation } from 'wouter';
import { useThemeContext } from '../contexts/ThemeContext';
import { useAuthContext } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { StatusBadge } from '../components/issues/StatusBadge';
import { PriorityBadge, SeverityBadge } from '../components/issues/PriorityBadge';
import { UserAvatar } from '../components/common/UserAvatar';
import { apiFetch } from '../api/client';
import { getLabelColor } from '../utils/labels';
import { IssueDto, IssueLabelDto, UserSummaryDto, IssueStatus, IssuePriority, IssueSeverity } from '@reported/contracts';

export const IssuesPage: React.FC = () => {
  const { tokens } = useThemeContext();
  const { user } = useAuthContext();
  const { t } = useI18n();
  const { activeWorkspace, activeProject } = useWorkspace();
  const [location, setLocation] = useLocation();

  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<IssueDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [page, setPage] = useState(1);
  const [assignedOnly, setAssignedOnly] = useState(false);

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState('');
  const [savingFilter, setSavingFilter] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const prioParam = params.get('priority');
    const sevParam = params.get('severity');
    const statParam = params.get('status');
    const srchParam = params.get('search');
    const sortParam = params.get('sortBy');

    if (viewParam === 'assigned') {
      setAssignedOnly(true);
    } else {
      setAssignedOnly(false);
    }

    if (prioParam) setPriorityFilter(prioParam);
    if (sevParam) setSeverityFilter(sevParam);
    if (statParam) setStatusFilter(statParam);
    if (srchParam) setSearch(srchParam);
    if (sortParam) setSortBy(sortParam);
  }, [location]);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (statusFilter !== 'ALL') q.set('status', statusFilter);
      if (priorityFilter !== 'ALL') q.set('priority', priorityFilter);
      if (severityFilter !== 'ALL') q.set('severity', severityFilter);
      if (activeProject) q.set('projectId', activeProject.id);
      if (assignedOnly && user) q.set('assigneeId', user.id);
      q.set('sortBy', sortBy);
      q.set('page', page.toString());
      q.set('limit', '15');

      const res = await apiFetch<{ data: IssueDto[]; pagination: { total: number; totalPages: number } }>(`/issues?${q.toString()}`);
      setIssues(res.data);
      setTotalCount(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [statusFilter, priorityFilter, severityFilter, sortBy, page, activeWorkspace, activeProject, assignedOnly]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchIssues();
  };

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setPriorityFilter('ALL');
    setSeverityFilter('ALL');
    setSortBy('newest');
    setAssignedOnly(false);
    setPage(1);
    setLocation('/issues');
  };

  const handleSaveFilter = async () => {
    if (!saveFilterName.trim()) return;
    setSavingFilter(true);
    try {
      const filterState: Record<string, unknown> = {};
      if (search) filterState.search = search;
      if (statusFilter !== 'ALL') filterState.status = statusFilter;
      if (priorityFilter !== 'ALL') filterState.priority = priorityFilter;
      if (severityFilter !== 'ALL') filterState.severity = severityFilter;
      if (sortBy !== 'newest') filterState.sortBy = sortBy;
      if (assignedOnly) filterState.view = 'assigned';

      await apiFetch('/saved-views', {
        method: 'POST',
        body: JSON.stringify({
          name: saveFilterName.trim(),
          targetType: 'ISSUE',
          filterState
        })
      });

      window.dispatchEvent(new Event('saved-views-updated'));
      setSaveModalOpen(false);
      setSaveFilterName('');
    } catch (err) {
      console.error(err);
    } finally {
      setSavingFilter(false);
    }
  };

  const hasActiveFilters = search || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || severityFilter !== 'ALL' || sortBy !== 'newest' || assignedOnly;

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.02em', mb: 0.5, color: tokens.textPrimary }}>
            {t('issues')}
          </Typography>
          <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
            Theo dõi, tái hiện và xử lý lỗi kỹ thuật, regression và nhiệm vụ phát triển
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2" sx={{ color: tokens.textSecondary, fontWeight: 500 }}>
            {totalCount} vấn đề
          </Typography>
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => setLocation('/issues/new')}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              backgroundColor: tokens.primary,
              boxShadow: 'none',
              borderRadius: '8px'
            }}
          >
            {t('newIssue')}
          </Button>
        </Box>
      </Box>

      <Box
        component="form"
        onSubmit={handleSearchSubmit}
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1.5,
          p: 1.5,
          mb: 2,
          borderRadius: '8px',
          backgroundColor: tokens.surface,
          border: `1px solid ${tokens.border}`
        }}
      >
        <TextField
          size="small"
          placeholder="Tìm theo tiêu đề, mô tả hoặc stacktrace..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={16} color={tokens.textSecondary} />
              </InputAdornment>
            ),
            sx: { fontSize: '0.8125rem' }
          }}
          sx={{ flex: 1, minWidth: 200 }}
        />

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Trạng thái</InputLabel>
          <Select
            value={statusFilter}
            label="Trạng thái"
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            sx={{ fontSize: '0.8125rem' }}
          >
            <MenuItem value="ALL">Tất cả trạng thái</MenuItem>
            <MenuItem value={IssueStatus.OPEN}>{t('statusOpen')}</MenuItem>
            <MenuItem value={IssueStatus.IN_PROGRESS}>{t('statusInProgress')}</MenuItem>
            <MenuItem value={IssueStatus.NEEDS_INFO}>{t('statusNeedsInfo')}</MenuItem>
            <MenuItem value={IssueStatus.RESOLVED}>{t('statusResolved')}</MenuItem>
            <MenuItem value={IssueStatus.CLOSED}>{t('statusClosed')}</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Mức ưu tiên</InputLabel>
          <Select
            value={priorityFilter}
            label="Mức ưu tiên"
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            sx={{ fontSize: '0.8125rem' }}
          >
            <MenuItem value="ALL">Tất cả mức</MenuItem>
            <MenuItem value={IssuePriority.P0}>{t('priorityP0')}</MenuItem>
            <MenuItem value={IssuePriority.P1}>{t('priorityP1')}</MenuItem>
            <MenuItem value={IssuePriority.P2}>{t('priorityP2')}</MenuItem>
            <MenuItem value={IssuePriority.P3}>{t('priorityP3')}</MenuItem>
            <MenuItem value={IssuePriority.P4}>{t('priorityP4')}</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Nghiêm trọng</InputLabel>
          <Select
            value={severityFilter}
            label="Nghiêm trọng"
            onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
            sx={{ fontSize: '0.8125rem' }}
          >
            <MenuItem value="ALL">Tất cả mức</MenuItem>
            <MenuItem value={IssueSeverity.BLOCKER}>Blocker</MenuItem>
            <MenuItem value={IssueSeverity.CRITICAL}>Critical</MenuItem>
            <MenuItem value={IssueSeverity.MAJOR}>Major</MenuItem>
            <MenuItem value={IssueSeverity.MINOR}>Minor</MenuItem>
            <MenuItem value={IssueSeverity.TRIVIAL}>Trivial</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Sắp xếp</InputLabel>
          <Select
            value={sortBy}
            label="Sắp xếp"
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            sx={{ fontSize: '0.8125rem' }}
          >
            <MenuItem value="newest">Mới nhất</MenuItem>
            <MenuItem value="oldest">Cũ nhất</MenuItem>
            <MenuItem value="updated">Mới cập nhật</MenuItem>
            <MenuItem value="priority">Mức ưu tiên</MenuItem>
            <MenuItem value="severity">Độ nghiêm trọng</MenuItem>
          </Select>
        </FormControl>

        {hasActiveFilters && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Bookmark size={15} />}
              onClick={() => {
                setSaveFilterName(search || (priorityFilter !== 'ALL' ? `Lọc ${priorityFilter}` : 'Bộ lọc tùy chỉnh'));
                setSaveModalOpen(true);
              }}
              sx={{ fontSize: '0.75rem', textTransform: 'none', borderRadius: '6px' }}
            >
              {t('saveCurrentFilter')}
            </Button>

            <Button
              size="small"
              variant="text"
              startIcon={<X size={15} />}
              onClick={clearFilters}
              sx={{ fontSize: '0.75rem', color: tokens.textSecondary, textTransform: 'none' }}
            >
              Xóa bộ lọc
            </Button>
          </Box>
        )}
      </Box>

      <Box sx={{ border: `1px solid ${tokens.border}`, borderRadius: '8px', backgroundColor: tokens.surface, overflow: 'hidden' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={26} />
          </Box>
        ) : issues.length === 0 ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ fontWeight: 600, color: tokens.textPrimary, mb: 0.5 }}>
              Không có vấn đề nào khớp với điều kiện tìm kiếm
            </Typography>
            <Typography variant="body2" sx={{ color: tokens.textSecondary, mb: 2 }}>
              Thử xóa bớt bộ lọc hoặc tạo một vấn đề kỹ thuật mới.
            </Typography>
            <Button variant="outlined" onClick={() => setLocation('/issues/new')} startIcon={<Plus size={16} />}>
              {t('newIssue')}
            </Button>
          </Box>
        ) : (
          issues.map((issue) => (
            <Box
              key={issue.id}
              onClick={() => setLocation(`/issues/${issue.number}`)}
              sx={{
                p: 1.5,
                px: 2,
                borderBottom: `1px solid ${tokens.divider}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'background-color 0.12s ease',
                '&:hover': {
                  backgroundColor: tokens.hover
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0, mr: 2 }}>
                <StatusBadge status={issue.status} />

                <Box sx={{ minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.3 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: tokens.textPrimary, fontSize: '0.875rem' }} noWrap>
                      {issue.title}
                    </Typography>

                    {issue.labels?.map((lbl: IssueLabelDto) => {
                      const style = getLabelColor(lbl.name, lbl.color);
                      return (
                        <Chip
                          key={lbl.id}
                          label={lbl.name}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            backgroundColor: style.bg,
                            color: style.text,
                            border: `1px solid ${style.border}`
                          }}
                        />
                      );
                    })}
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.75rem', color: tokens.textSecondary }}>
                    <span>#{issue.number}</span>
                    {issue.repository && (
                      <span>trong <strong>{issue.repository.fullName}</strong></span>
                    )}
                    <span>bởi <strong>@{issue.author.username}</strong></span>
                    <span>• {new Date(issue.createdAt).toLocaleDateString()}</span>
                  </Box>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                <SeverityBadge severity={issue.severity} />
                <PriorityBadge priority={issue.priority} />

                <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.5 }}>
                  {issue.assignees?.map((a: UserSummaryDto) => (
                    <Box key={a.id} sx={{ ml: -0.5 }}>
                      <UserAvatar user={a} size={22} />
                    </Box>
                  ))}
                </Box>

                {issue.commentsCount > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, color: tokens.textSecondary, fontSize: '0.75rem' }}>
                    <MessageSquare size={14} />
                    <span>{issue.commentsCount}</span>
                  </Box>
                )}
              </Box>
            </Box>
          ))
        )}
      </Box>

      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, val) => setPage(val)}
            size="small"
          />
        </Box>
      )}

      <Dialog open={saveModalOpen} onClose={() => setSaveModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
          Lưu bộ lọc tìm kiếm
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ color: tokens.textSecondary, mb: 2 }}>
            Bộ lọc này sẽ được ghim vào thanh Sidebar để bạn có thể mở nhanh bất kỳ lúc nào.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Tên bộ lọc"
            value={saveFilterName}
            onChange={(e) => setSaveFilterName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveFilter()}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSaveModalOpen(false)} sx={{ textTransform: 'none' }}>
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveFilter}
            disabled={savingFilter || !saveFilterName.trim()}
            sx={{ textTransform: 'none', backgroundColor: tokens.primary }}
          >
            {savingFilter ? 'Đang lưu...' : 'Lưu bộ lọc'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

