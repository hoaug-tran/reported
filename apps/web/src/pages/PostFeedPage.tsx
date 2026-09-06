import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CircularProgress,
  Chip,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Menu,
  MenuItem as MuiMenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Search, Plus, MessageSquare, GitPullRequest, Bug, Eye, HelpCircle, Lightbulb, MoreVertical, Trash2, ExternalLink, Edit3 } from 'lucide-react';
import { useLocation } from 'wouter';
import { useThemeContext } from '../contexts/ThemeContext';
import { useAuthContext } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { PostFeedSkeleton } from '../components/common/Skeletons';
import { UserAvatar } from '../components/common/UserAvatar';
import { NewPostModal } from '../components/common/NewPostModal';
import { apiFetch } from '../api/client';
import {
  IssueDto,
  ReviewDetailDto,
  IssueType
} from '@reported/contracts';

interface FeedItem {
  id: string;
  kind: 'issue' | 'review';
  type: string;
  number: number;
  title: string;
  description: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  commentsCount: number;
  labels: Array<{ id?: string; name: string; color: string }>;
  updatedAt: string;
  createdAt: string;
  repoName?: string | null;
  prNumber?: number | null;
  link: string;
}

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

export const PostFeedPage: React.FC = () => {
  const { tokens } = useThemeContext();
  const { user } = useAuthContext();
  const { language } = useI18n();
  const [, setLocation] = useLocation();
  const isVi = language === 'vi';

  const [loading, setLoading] = useState(true);
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'bugs' | 'reviews' | 'questions' | 'ideas'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<FeedItem[]>([]);

  const [menuAnchor, setMenuAnchor] = useState<{ el: HTMLElement; item: FeedItem } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeedItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const [issuesRes, reviewsRes] = await Promise.all([
        apiFetch<{ data: IssueDto[] }>('/issues?sortBy=updated&limit=40'),
        apiFetch<{ data: ReviewDetailDto[] }>('/reviews?sortBy=updated&limit=40')
      ]);

      const issueFeed: FeedItem[] = (issuesRes.data || []).map((iss) => ({
        id: iss.id,
        kind: 'issue',
        type: iss.type,
        number: iss.number,
        title: iss.title,
        description: iss.description,
        author: iss.author,
        commentsCount: iss.commentsCount || 0,
        labels: iss.labels || [],
        updatedAt: iss.updatedAt,
        createdAt: iss.createdAt,
        repoName: iss.repository?.name || null,
        prNumber: iss.pullRequest?.prNumber || null,
        link: `/issues/${iss.number}`
      }));

      const reviewFeed: FeedItem[] = (reviewsRes.data || []).map((rev) => ({
        id: rev.id,
        kind: 'review',
        type: 'REVIEW',
        number: rev.number,
        title: rev.title,
        description: rev.description,
        author: rev.author,
        commentsCount: rev.commentsCount || 0,
        labels: rev.labels || [],
        updatedAt: rev.updatedAt,
        createdAt: rev.createdAt,
        repoName: rev.repository?.name || null,
        prNumber: rev.pullRequest?.prNumber || null,
        link: `/reviews/${rev.number}`
      }));

      const combined = [...issueFeed, ...reviewFeed].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );

      setItems(combined);
    } catch (err) {
      console.error('Failed to load feed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const handleDeleteItem = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const endpoint = deleteTarget.kind === 'issue'
        ? `/issues/${deleteTarget.id}`
        : `/reviews/${deleteTarget.id}`;
      await apiFetch(endpoint, { method: 'DELETE' });
      setDeleteTarget(null);
      await loadFeed();
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setDeleting(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === 'bugs' && item.type !== IssueType.BUG && item.type !== 'BUG') return false;
    if (activeTab === 'reviews' && item.kind !== 'review') return false;
    if (activeTab === 'questions' && item.type !== IssueType.TASK && item.type !== 'QUESTION') return false;
    if (activeTab === 'ideas' && item.type !== IssueType.FEATURE && item.type !== 'IDEA') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchAuthor = (item.author.displayName || item.author.username).toLowerCase().includes(q);
      const matchNumber = String(item.number).includes(q);
      if (!matchTitle && !matchAuthor && !matchNumber) return false;
    }

    return true;
  });

  return (
    <Box sx={{ width: '100%', pb: 8 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
          mb: 3
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.025em',
              color: tokens.textPrimary,
              display: 'flex',
              alignItems: 'center',
              gap: 1.2
            }}
          >
            {isVi ? 'Bài thảo luận kỹ thuật' : 'Engineering Posts'}
          </Typography>
          <Typography variant="body2" sx={{ color: tokens.textSecondary, mt: 0.3 }}>
            {isVi
              ? 'Theo dõi và thảo luận toàn bộ các vấn đề kỹ thuật, bug và review pull request'
              : 'Track and discuss technical issues, bugs, and pull request reviews'}
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<Plus size={16} />}
          onClick={() => setNewPostOpen(true)}
          sx={{
            backgroundColor: tokens.primary,
            borderRadius: '8px',
            textTransform: 'none',
            fontWeight: 700,
            px: 2.5,
            py: 0.9,
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)',
            '&:hover': {
              backgroundColor: tokens.primaryHover
            }
          }}
        >
          {isVi ? 'Đăng bài mới' : 'New Post'}
        </Button>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { md: 'center' },
          gap: 2,
          mb: 2.5,
          borderBottom: `1px solid ${tokens.divider}`,
          pb: 1.5
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          textColor="primary"
          indicatorColor="primary"
          sx={{
            minHeight: 36,
            '& .MuiTab-root': {
              minHeight: 36,
              py: 0.5,
              px: 1.8,
              fontSize: '0.84rem',
              fontWeight: 700,
              textTransform: 'none'
            }
          }}
        >
          <Tab label={isVi ? 'Tất cả' : 'All'} value="all" />
          <Tab label={<Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}><Bug size={14} />{isVi ? 'Lỗi (Bugs)' : 'Bugs'}</Box>} value="bugs" />
          <Tab label={<Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}><Eye size={14} />{isVi ? 'Review PR' : 'Reviews'}</Box>} value="reviews" />
          <Tab label={<Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}><HelpCircle size={14} />{isVi ? 'Câu hỏi' : 'Questions'}</Box>} value="questions" />
          <Tab label={<Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}><Lightbulb size={14} />{isVi ? 'Ý tưởng' : 'Ideas'}</Box>} value="ideas" />
        </Tabs>

        <TextField
          size="small"
          placeholder={isVi ? 'Tìm kiếm tiêu đề, mã số, tác giả...' : 'Filter posts by title or author...'}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} color={tokens.textSecondary} />
              </InputAdornment>
            )
          }}
          sx={{
            width: { xs: '100%', md: 280 },
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              backgroundColor: tokens.surfaceSecondary
            }
          }}
        />
      </Box>

      {loading ? (
        <PostFeedSkeleton count={5} />
      ) : filteredItems.length === 0 ? (
        <Card
          sx={{
            p: 6,
            textAlign: 'center',
            backgroundColor: tokens.surfaceSecondary,
            border: `1px solid ${tokens.border}`,
            borderRadius: '8px'
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tokens.textPrimary, mb: 0.5 }}>
            {isVi ? 'Không tìm thấy bài viết nào' : 'No posts match your filters'}
          </Typography>
          <Typography variant="body2" sx={{ color: tokens.textSecondary, mb: 2 }}>
            {isVi
              ? 'Hãy thử thay đổi từ khóa tìm kiếm hoặc đăng một bài viết mới.'
              : 'Try tweaking your search keywords or start a new conversation.'}
          </Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<Plus size={16} />}
            onClick={() => setNewPostOpen(true)}
            sx={{ borderRadius: '8px', textTransform: 'none', backgroundColor: tokens.primary }}
          >
            {isVi ? 'Đăng bài mới ngay' : 'Post now'}
          </Button>
        </Card>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: tokens.surface,
            borderRadius: '8px',
            border: `1px solid ${tokens.border}`,
            overflow: 'hidden'
          }}
        >
          {filteredItems.map((item, idx) => {
            const isBug = item.type === IssueType.BUG || item.type === 'BUG';
            const isReview = item.kind === 'review';
            const isQuestion = item.type === IssueType.TASK || item.type === 'QUESTION';
            const isIdea = item.type === IssueType.FEATURE || item.type === 'IDEA';

            let badgeColor = '#6366f1';
            let badgeLabel = item.type;
            if (isBug) {
              badgeColor = '#ef4444';
              badgeLabel = 'BUG';
            } else if (isReview) {
              badgeColor = '#a855f7';
              badgeLabel = 'REVIEW';
            } else if (isQuestion) {
              badgeColor = '#3b82f6';
              badgeLabel = 'QUESTION';
            } else if (isIdea) {
              badgeColor = '#10b981';
              badgeLabel = 'IDEA';
            }

            return (
              <Box
                key={`${item.kind}-${item.id}`}
                onClick={() => setLocation(item.link)}
                sx={{
                  minHeight: 68,
                  py: 1.5,
                  px: 2.2,
                  borderBottom:
                    idx < filteredItems.length - 1 ? `1px solid ${tokens.divider}` : 'none',
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
                  <Chip
                    label={badgeLabel}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      backgroundColor: `${badgeColor}18`,
                      color: badgeColor,
                      border: `1px solid ${badgeColor}35`,
                      borderRadius: '6px',
                      flexShrink: 0
                    }}
                  />

                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.4 }}>
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
                          #{item.number}
                        </span>
                        {item.title}
                      </Typography>

                      {item.prNumber && (
                        <Chip
                          icon={<GitPullRequest size={12} />}
                          label={`PR #${item.prNumber}`}
                          size="small"
                          sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600 }}
                        />
                      )}

                      {item.labels?.slice(0, 3).map((l) => (
                        <Chip
                          key={l.name}
                          label={l.name}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.6875rem',
                            fontWeight: 500,
                            backgroundColor: 'transparent',
                            border: `1px solid ${tokens.border}`,
                            color: tokens.textSecondary
                          }}
                        />
                      ))}
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, fontSize: '0.75rem', color: tokens.textSecondary }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                        <UserAvatar user={item.author} size={18} showTooltip={false} />
                        <span>@{item.author.username}</span>
                      </Box>
                      <span>• {formatRelativeTime(item.createdAt, isVi)}</span>
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: tokens.textSecondary, fontSize: '0.75rem' }}>
                    <MessageSquare size={14} />
                    <span>{item.commentsCount}</span>
                  </Box>

                  {user && item.author.id === user.id && (
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuAnchor({ el: e.currentTarget, item });
                      }}
                      sx={{
                        color: tokens.textSecondary,
                        p: 0.5,
                        '&:hover': { color: tokens.textPrimary }
                      }}
                    >
                      <MoreVertical size={16} />
                    </IconButton>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      <Menu
        anchorEl={menuAnchor?.el}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: {
            borderRadius: '8px',
            border: `1px solid ${tokens.border}`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.24)',
            minWidth: 160
          }
        }}
      >
        <MuiMenuItem
          onClick={() => {
            if (menuAnchor) setLocation(menuAnchor.item.link);
            setMenuAnchor(null);
          }}
          sx={{ fontSize: '0.875rem', gap: 1.5, py: 1 }}
        >
          <ExternalLink size={15} />
          {isVi ? 'Xem chi tiết' : 'View details'}
        </MuiMenuItem>
        <MuiMenuItem
          onClick={() => {
            if (menuAnchor) setLocation(menuAnchor.item.link);
            setMenuAnchor(null);
          }}
          sx={{ fontSize: '0.875rem', gap: 1.5, py: 1 }}
        >
          <Edit3 size={15} />
          {isVi ? 'Chỉnh sửa' : 'Edit'}
        </MuiMenuItem>
        <MuiMenuItem
          onClick={() => {
            if (menuAnchor) {
              setDeleteTarget(menuAnchor.item);
              setMenuAnchor(null);
            }
          }}
          sx={{ fontSize: '0.875rem', gap: 1.5, py: 1, color: '#f85149' }}
        >
          <Trash2 size={15} />
          {isVi ? 'Xoá' : 'Delete'}
        </MuiMenuItem>
      </Menu>

      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1rem' }}>
          {isVi ? 'Xác nhận xoá' : 'Confirm Delete'}
        </DialogTitle>
        <DialogContent sx={{ pt: '8px !important' }}>
          <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
            {isVi
              ? `Bài này sẽ bị xoá mềm. Lịch sử và bình luận vẫn được lưu trữ.`
              : `This will soft-delete the post. History and comments are preserved.`}
          </Typography>
          {deleteTarget && (
            <Typography variant="body2" sx={{ mt: 1.5, fontWeight: 600, color: tokens.textPrimary }}>
              #{deleteTarget.number} - {deleteTarget.title}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            onClick={() => setDeleteTarget(null)}
            disabled={deleting}
            sx={{ textTransform: 'none', borderRadius: '6px' }}
          >
            {isVi ? 'Hủy' : 'Cancel'}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteItem}
            disabled={deleting}
            startIcon={<Trash2 size={15} />}
            sx={{ textTransform: 'none', borderRadius: '6px', boxShadow: 'none' }}
          >
            {deleting ? (isVi ? 'Đang xoá...' : 'Deleting...') : (isVi ? 'Xoá' : 'Delete')}
          </Button>
        </DialogActions>
      </Dialog>

      <NewPostModal open={newPostOpen} onClose={() => { setNewPostOpen(false); loadFeed(); }} />
    </Box>
  );
};
