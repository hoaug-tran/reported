import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, InputAdornment, Select, MenuItem, FormControl,
  InputLabel, Button, Chip, Pagination, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, LinearProgress
} from '@mui/material';
import { Search, MessageSquare, X, Plus, Clock, Bookmark, Trash2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { useThemeContext } from '../contexts/ThemeContext';
import { useAuthContext } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { StatusBadge } from '../components/issues/StatusBadge';
import { UserAvatar } from '../components/common/UserAvatar';
import { apiFetch } from '../api/client';
import { getLabelColor } from '../utils/labels';
import { ListSkeleton } from '../components/common/Skeletons';
import { useSmoothLoading } from '../hooks/useSmoothLoading';
import { ReviewDetailDto, ReviewType, ReviewStatus, IssueLabelDto, ReviewerAssignmentDto } from '@reported/contracts';

function formatRelativeTime(dateStr: string, isVi: boolean): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return isVi ? 'vừa xong' : 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return isVi ? `${diffMin} phút trước` : `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return isVi ? `${diffHour} giờ trước` : `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return isVi ? `${diffDay} ngày trước` : `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const ReviewsPage: React.FC = () => {
  const { tokens } = useThemeContext();
  const { user } = useAuthContext();
  const { t, language } = useI18n();
  const isVi = language === 'vi';
  const { activeWorkspace, activeProject } = useWorkspace();
  const [location, setLocation] = useLocation();

  const [loading, setLoading] = useState(true);
  const smoothLoading = useSmoothLoading(loading, { delay: 160, minDuration: 280 });
  const [reviews, setReviews] = useState<ReviewDetailDto[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [waitingOnly, setWaitingOnly] = useState(false);
  const isOwnerOrAdmin = activeWorkspace?.role === 'OWNER' || activeWorkspace?.role === 'ADMIN';
  const [showDeleted, setShowDeleted] = useState(false);

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState('');
  const [savingFilter, setSavingFilter] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const typeParam = params.get('reviewType');
    const statParam = params.get('status');
    const srchParam = params.get('search');

    if (viewParam === 'waiting') {
      setWaitingOnly(true);
    } else {
      setWaitingOnly(false);
    }

    if (typeParam) setTypeFilter(typeParam);
    if (statParam) setStatusFilter(statParam);
    if (srchParam) setSearch(srchParam);
  }, [location]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (typeFilter !== 'ALL') q.set('reviewType', typeFilter);
      if (statusFilter !== 'ALL') q.set('status', statusFilter);
      if (activeProject) q.set('projectId', activeProject.id);
      if (waitingOnly && user) q.set('reviewerId', user.id);
      if (showDeleted) q.set('onlyDeleted', 'true');
      q.set('page', page.toString());
      q.set('limit', '15');

      const res = await apiFetch<{ data: ReviewDetailDto[]; pagination: { total: number; totalPages: number } }>(`/reviews?${q.toString()}`);
      setReviews(res.data);
      setTotalCount(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [typeFilter, statusFilter, page, activeWorkspace, activeProject, waitingOnly, showDeleted]);

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('ALL');
    setStatusFilter('ALL');
    setWaitingOnly(false);
    setPage(1);
    setLocation('/reviews');
  };

  const handleSaveFilter = async () => {
    if (!saveFilterName.trim()) return;
    setSavingFilter(true);
    try {
      const filterState: Record<string, unknown> = {};
      if (search) filterState.search = search;
      if (typeFilter !== 'ALL') filterState.reviewType = typeFilter;
      if (statusFilter !== 'ALL') filterState.status = statusFilter;
      if (waitingOnly) filterState.view = 'waiting';

      await apiFetch('/saved-views', {
        method: 'POST',
        body: JSON.stringify({
          name: saveFilterName.trim(),
          targetType: 'REVIEW',
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

  const hasActiveFilters = search || typeFilter !== 'ALL' || statusFilter !== 'ALL' || waitingOnly;

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.02em', mb: 0.5, color: tokens.textPrimary }}>
            {t('reviews')}
          </Typography>
          <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
            Thẩm định kiến trúc, đánh giá PR, kiểm tra schema cơ sở dữ liệu và đánh giá bảo mật
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="body2" sx={{ color: tokens.textSecondary, fontWeight: 500 }}>
            {totalCount} yêu cầu review
          </Typography>
          {isOwnerOrAdmin && (
            <Button
              variant={showDeleted ? 'contained' : 'outlined'}
              color={showDeleted ? 'error' : 'inherit'}
              size="small"
              startIcon={<Trash2 size={15} />}
              onClick={() => {
                setShowDeleted(!showDeleted);
                setPage(1);
              }}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: '8px',
                fontSize: '0.8125rem'
              }}
            >
              {showDeleted ? 'Thùng rác (Đang xem)' : 'Thùng rác'}
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => setLocation('/reviews/new')}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              backgroundColor: tokens.primary,
              boxShadow: 'none',
              borderRadius: '8px'
            }}
          >
            {t('newReview')}
          </Button>
        </Box>
      </Box>

      <Box
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
          placeholder="Tìm theo tiêu đề, phạm vi review..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchReviews()}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={16} color={tokens.textSecondary} />
              </InputAdornment>
            ),
            sx: { fontSize: '0.84rem' }
          }}
          sx={{ flex: 1, minWidth: 200 }}
        />

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Loại review</InputLabel>
          <Select
            value={typeFilter}
            label="Loại review"
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            sx={{ fontSize: '0.8125rem' }}
          >
            <MenuItem value="ALL">Tất cả loại</MenuItem>
            <MenuItem value={ReviewType.CODE}>{t('typeCode')}</MenuItem>
            <MenuItem value={ReviewType.ARCHITECTURE}>{t('typeArchitecture')}</MenuItem>
            <MenuItem value={ReviewType.SECURITY}>{t('typeSecurity')}</MenuItem>
            <MenuItem value={ReviewType.DATABASE}>{t('typeDatabase')}</MenuItem>
            <MenuItem value={ReviewType.API}>API</MenuItem>
            <MenuItem value={ReviewType.UI}>UI / UX</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Trạng thái</InputLabel>
          <Select
            value={statusFilter}
            label="Trạng thái"
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            sx={{ fontSize: '0.8125rem' }}
          >
            <MenuItem value="ALL">Tất cả trạng thái</MenuItem>
            <MenuItem value={ReviewStatus.PENDING_REVIEW}>{t('statusPendingReview')}</MenuItem>
            <MenuItem value={ReviewStatus.IN_REVIEW}>{t('statusInReview')}</MenuItem>
            <MenuItem value={ReviewStatus.CHANGES_REQUESTED}>{t('statusChangesRequested')}</MenuItem>
            <MenuItem value={ReviewStatus.APPROVED}>{t('statusApproved')}</MenuItem>
            <MenuItem value={ReviewStatus.COMPLETED}>{t('statusCompleted')}</MenuItem>
            <MenuItem value={ReviewStatus.CLOSED}>{t('statusClosed')}</MenuItem>
          </Select>
        </FormControl>

        {hasActiveFilters && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Bookmark size={15} />}
              onClick={() => {
                setSaveFilterName(search || (typeFilter !== 'ALL' ? `Review ${typeFilter}` : 'Bộ lọc review'));
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

      <Box sx={{ border: `1px solid ${tokens.border}`, borderRadius: '8px', backgroundColor: tokens.surface, overflow: 'hidden', position: 'relative' }}>
        {loading && reviews.length > 0 && (
          <LinearProgress
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              zIndex: 2,
              backgroundColor: 'transparent'
            }}
          />
        )}
        {smoothLoading && reviews.length === 0 ? (
          <ListSkeleton rows={8} />
        ) : reviews.length === 0 && !loading ? (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ fontWeight: 600, color: tokens.textPrimary, mb: 0.5 }}>
              Không có yêu cầu review nào
            </Typography>
            <Typography variant="body2" sx={{ color: tokens.textSecondary, mb: 2 }}>
              Thử tìm kiếm với từ khóa khác hoặc tạo yêu cầu review mới.
            </Typography>
            <Button variant="outlined" onClick={() => setLocation('/reviews/new')} startIcon={<Plus size={16} />}>
              {t('newReview')}
            </Button>
          </Box>
        ) : (
          <Box sx={{ opacity: loading && reviews.length > 0 ? 0.6 : 1, transition: 'opacity 0.2s ease' }}>
            {reviews.map((rev) => (
              <Box
                key={rev.id}
                onClick={() => setLocation(`/reviews/${rev.number}`)}
                sx={{
                  minHeight: 68,
                  py: 1.5,
                  px: 2.2,
                  borderBottom: `1px solid ${tokens.divider}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 2,
                  cursor: 'pointer',
                  transition: 'background-color 0.12s ease',
                  '&:hover': {
                    backgroundColor: tokens.hover
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.6, minWidth: 0, flex: 1 }}>
                  <StatusBadge status={rev.status} />

                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.4 }}>
                      <Chip
                        label={rev.reviewType === ReviewType.PR ? 'PR' : rev.reviewType === ReviewType.CODE ? 'Code Review' : rev.reviewType}
                        sx={{
                          height: 22,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          borderRadius: '5px',
                          backgroundColor: tokens.surfaceSecondary,
                          color: tokens.textPrimary,
                          border: `1px solid ${tokens.border}`
                        }}
                      />

                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 700,
                          color: tokens.textPrimary,
                          fontSize: '0.92rem',
                          lineHeight: 1.3
                        }}
                      >
                        <span style={{ color: tokens.textSecondary, marginRight: 6, fontWeight: 500, fontFamily: 'monospace' }}>
                          #{rev.number}
                        </span>
                        {rev.title}
                      </Typography>

                      {rev.labels?.map((lbl: IssueLabelDto) => {
                        const style = getLabelColor(lbl.name, lbl.color);
                        return (
                          <Chip
                            key={lbl.id}
                            label={lbl.name}
                            sx={{
                              height: 22,
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              borderRadius: '5px',
                              backgroundColor: style.bg,
                              color: style.text,
                              border: `1px solid ${style.border}`
                            }}
                          />
                        );
                      })}
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, fontSize: '0.75rem', color: tokens.textSecondary }}>
                      {rev.author && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                          <UserAvatar user={rev.author} size={18} showTooltip={false} />
                          <span>@{rev.author.username}</span>
                        </Box>
                      )}
                      <span>• {formatRelativeTime(rev.createdAt, isVi)}</span>
                      {rev.repository && (
                        <span>• trong <strong>{rev.repository.fullName}</strong></span>
                      )}
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.5 }}>
                    {rev.reviewers?.map((r: ReviewerAssignmentDto) => (
                      <Box key={r.user.id} sx={{ ml: -0.5 }}>
                        <UserAvatar user={r.user} size={22} />
                      </Box>
                    ))}
                  </Box>

                  {rev.commentsCount > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: tokens.textSecondary, fontSize: '0.75rem', minWidth: 28, justifyContent: 'flex-end' }}>
                      <MessageSquare size={14} />
                      <span>{rev.commentsCount}</span>
                    </Box>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
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
          Lưu bộ lọc review
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

