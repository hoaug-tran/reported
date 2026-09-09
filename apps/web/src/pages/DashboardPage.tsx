import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  Collapse,
  Tabs,
  Tab
} from '@mui/material';
import {
  CheckCircle2,
  Eye,
  ArrowRight,
  AtSign,
  AlertTriangle,
  Clock,
  ChevronUp,
  ChevronDown,
  MessageSquare,
  GitPullRequest,
  Bug,
  HelpCircle
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useThemeContext } from '../contexts/ThemeContext';
import { useAuthContext } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { UserAvatar } from '../components/common/UserAvatar';
import { apiFetch } from '../api/client';
import {
  IssueDto,
  ReviewDetailDto,
  NotificationDto,
  IssueType,
  ReviewStatus,
  RepositoryDto
} from '@reported/contracts';
import { DashboardHero } from '../components/dashboard/DashboardHero';
import { DashboardSidebarWidgets } from '../components/dashboard/DashboardSidebarWidgets';
import { CreateIssueModal } from '../components/issues/CreateIssueModal';
import { NewPostModal } from '../components/common/NewPostModal';
import { DashboardSkeleton } from '../components/common/Skeletons';

interface ConversationItem {
  id: string;
  kind: 'issue' | 'review';
  type: string;
  number: number;
  title: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  commentsCount: number;
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

export const DashboardPage: React.FC = () => {
  const { tokens } = useThemeContext();
  const { user } = useAuthContext();
  const { activeWorkspace } = useWorkspace();
  const { language } = useI18n();
  const [, setLocation] = useLocation();
  const isVi = language === 'vi';

  const [loading, setLoading] = useState(true);
  const [waitingOnOthersOpen, setWaitingOnOthersOpen] = useState(true);
  const [feedFilter, setFeedFilter] = useState<'all' | 'bugs' | 'reviews' | 'questions'>('all');
  const [createIssueOpen, setCreateIssueOpen] = useState(false);
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [repositoriesList, setRepositoriesList] = useState<RepositoryDto[]>([]);

  const [pendingReviews, setPendingReviews] = useState<ReviewDetailDto[]>([]);
  const [mentions, setMentions] = useState<NotificationDto[]>([]);
  const [urgentIssues, setUrgentIssues] = useState<IssueDto[]>([]);

  const [myOutboundReviews, setMyOutboundReviews] = useState<ReviewDetailDto[]>([]);

  const [conversations, setConversations] = useState<ConversationItem[]>([]);

  const hour = new Date().getHours();
  const greeting = hour < 12
    ? (isVi ? 'Chào buổi sáng' : 'Good morning')
    : hour < 18
    ? (isVi ? 'Chào buổi chiều' : 'Good afternoon')
    : (isVi ? 'Chào buổi tối' : 'Good evening');

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const [
          reviewsToMeRes,
          notificationsRes,
          urgentRes,
          myAuthoredReviewsRes,
          recentIssuesRes,
          recentReviewsRes,
          reposRes
        ] = await Promise.all([
          user
            ? apiFetch<{ data: ReviewDetailDto[] }>(`/reviews?reviewerId=${user.id}&limit=10`)
            : Promise.resolve({ data: [] }),
          user
            ? apiFetch<{ notifications: NotificationDto[] }>('/notifications?unreadOnly=true')
            : Promise.resolve({ notifications: [] }),
          apiFetch<{ data: IssueDto[] }>('/issues?priority=P0&priority=P1&status=OPEN&status=IN_PROGRESS&limit=5'),
          user
            ? apiFetch<{ data: ReviewDetailDto[] }>(`/reviews?authorId=${user.id}&limit=10`)
            : Promise.resolve({ data: [] }),
          apiFetch<{ data: IssueDto[] }>('/issues?sortBy=updated&limit=15'),
          apiFetch<{ data: ReviewDetailDto[] }>('/reviews?sortBy=updated&limit=15'),
          apiFetch<RepositoryDto[]>('/github/repositories').catch(() => [])
        ]);

        setRepositoriesList(reposRes || []);

        const pendingForMe = (reviewsToMeRes.data || []).filter(
          (r) => r.status === ReviewStatus.PENDING_REVIEW || r.status === ReviewStatus.IN_REVIEW
        );
        setPendingReviews(pendingForMe);

        const unreadMentions = (notificationsRes.notifications || []).filter(
          (n) => n.type === 'MENTIONED'
        );
        setMentions(unreadMentions);

        setUrgentIssues(urgentRes.data || []);

        const waitingReviews = (myAuthoredReviewsRes.data || []).filter(
          (r) => r.status === ReviewStatus.PENDING_REVIEW || r.status === ReviewStatus.IN_REVIEW
        );
        setMyOutboundReviews(waitingReviews);

        const issueItems: ConversationItem[] = (recentIssuesRes.data || []).map((iss) => ({
          id: iss.id,
          kind: 'issue',
          type: iss.type,
          number: iss.number,
          title: iss.title,
          author: iss.author,
          commentsCount: iss.commentsCount || 0,
          updatedAt: iss.updatedAt,
          createdAt: iss.createdAt,
          repoName: iss.repository?.name || null,
          prNumber: iss.pullRequest?.prNumber || null,
          link: `/issues/${iss.number}`
        }));

        const reviewItems: ConversationItem[] = (recentReviewsRes.data || []).map((rev) => ({
          id: rev.id,
          kind: 'review',
          type: 'REVIEW',
          number: rev.number,
          title: rev.title,
          author: rev.author,
          commentsCount: rev.commentsCount || 0,
          updatedAt: rev.updatedAt,
          createdAt: rev.createdAt,
          repoName: rev.repository?.name || null,
          prNumber: rev.pullRequest?.prNumber || null,
          link: `/reviews/${rev.number}`
        }));

        const merged = [...issueItems, ...reviewItems].sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        setConversations(merged);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user]);

  const filteredConversations = conversations.filter((item) => {
    if (feedFilter === 'all') return true;
    if (feedFilter === 'bugs') return item.type === IssueType.BUG || item.type === 'BUG';
    if (feedFilter === 'reviews') return item.kind === 'review';
    if (feedFilter === 'questions') return item.type === IssueType.TASK || item.type === 'QUESTION';
    return true;
  });

  const totalAttentionItems = pendingReviews.length + mentions.length + urgentIssues.length;

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <Box sx={{ width: '100%', pb: 8 }}>
      <DashboardHero
        user={user}
        isVi={isVi}
        onOpenCreateIssue={() => setCreateIssueOpen(true)}
        onOpenNewPost={() => setNewPostOpen(true)}
        pendingReviewsCount={pendingReviews.length}
        urgentIssuesCount={urgentIssues.length}
        waitingReviewsCount={myOutboundReviews.length}
        reposCount={repositoriesList.length}
      />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '2.5fr 1fr' },
          gap: 3,
          alignItems: 'flex-start'
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5, minWidth: 0 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: tokens.textSecondary,
                letterSpacing: '0.08em',
                fontSize: '0.75rem'
              }}
            >
              {isVi ? 'CẦN BẠN CHÚ Ý' : 'NEEDS YOUR ATTENTION'}
            </Typography>
            {totalAttentionItems > 0 && (
              <Chip
                label={totalAttentionItems}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.6875rem',
                  fontWeight: 800,
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444'
                }}
              />
            )}
          </Box>
        </Box>

        {totalAttentionItems === 0 ? (
          <Card
            sx={{
              backgroundColor: tokens.surfaceSecondary,
              border: `1px solid ${tokens.border}`,
              borderRadius: '8px',
              boxShadow: 'none',
              p: 3,
              textAlign: 'center'
            }}
          >
            <CheckCircle2 size={36} color="#10b981" style={{ marginBottom: 8 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: tokens.textPrimary }}>
              {isVi ? 'Bạn đã hoàn tất mọi việc cần xử lý!' : "You're all caught up!"}
            </Typography>
            <Typography variant="body2" sx={{ color: tokens.textSecondary, fontSize: '0.84rem', mt: 0.3 }}>
              {isVi
                ? 'Không có yêu cầu review hay tag nhắc tên nào đang chờ bạn.'
                : 'No pending reviews, urgent mentions, or blocker issues waiting for you.'}
            </Typography>
          </Card>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
            {pendingReviews.map((rev) => (
              <Card
                key={rev.id}
                onClick={() => setLocation(`/reviews/${rev.number}`)}
                sx={{
                  backgroundColor: tokens.surface,
                  border: `1px solid ${tokens.border}`,
                  borderLeft: '4px solid #a855f7',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                  p: 2,
                  minHeight: 124,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    borderColor: '#a855f7',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 6px 16px rgba(168, 85, 247, 0.1)'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                    <UserAvatar user={rev.author} size={28} />
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: tokens.textPrimary }}>
                        {rev.author.displayName || rev.author.username}
                      </Typography>
                      <Typography variant="caption" sx={{ color: tokens.textSecondary, display: 'block', fontSize: '0.72rem' }}>
                        {isVi ? 'nhờ bạn review' : 'requested your review'}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    icon={<Eye size={13} color="#a855f7" />}
                    label={isVi ? 'Review PR' : 'Review'}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      backgroundColor: 'rgba(168, 85, 247, 0.12)',
                      color: '#a855f7'
                    }}
                  />
                </Box>

                <Tooltip title={`#${rev.number} ${rev.title}`} placement="top-start">
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 700,
                      mt: 1.2,
                      mb: 0.6,
                      color: tokens.textPrimary,
                      fontSize: '0.9rem',
                      lineHeight: 1.35,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'block',
                      maxWidth: '100%'
                    }}
                  >
                    #{rev.number} {rev.title}
                  </Typography>
                </Tooltip>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: tokens.textSecondary, fontSize: '0.75rem' }}>
                    {rev.pullRequest ? (
                      <Chip
                        icon={<GitPullRequest size={12} />}
                        label={`PR #${rev.pullRequest.prNumber}`}
                        size="small"
                        sx={{ height: 18, fontSize: '0.65rem', fontWeight: 600 }}
                      />
                    ) : (
                      <span>{rev.repository?.name || 'repo'}</span>
                    )}
                    <span>• {formatRelativeTime(rev.createdAt, isVi)}</span>
                  </Box>
                  <Button
                    size="small"
                    variant="text"
                    endIcon={<ArrowRight size={14} />}
                    sx={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#a855f7',
                      p: 0,
                      minWidth: 'auto',
                      textTransform: 'none'
                    }}
                  >
                    {isVi ? 'Xem' : 'Check'}
                  </Button>
                </Box>
              </Card>
            ))}

            {mentions.map((m) => (
              <Card
                key={m.id}
                onClick={() => m.link && setLocation(m.link)}
                sx={{
                  backgroundColor: tokens.surface,
                  border: `1px solid ${tokens.border}`,
                  borderLeft: '4px solid #3b82f6',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                  p: 2,
                  minHeight: 124,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    borderColor: '#3b82f6',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 6px 16px rgba(59, 130, 246, 0.1)'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                    <UserAvatar user={m.actor} size={28} />
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: tokens.textPrimary }}>
                        {m.actor?.displayName || m.actor?.username || 'Colleague'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: tokens.textSecondary, display: 'block', fontSize: '0.72rem' }}>
                        {isVi ? 'đã nhắc đến bạn' : 'mentioned you'}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    icon={<AtSign size={13} color="#3b82f6" />}
                    label="@mention"
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      backgroundColor: 'rgba(59, 130, 246, 0.12)',
                      color: '#3b82f6'
                    }}
                  />
                </Box>

                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: 600,
                    mt: 1.2,
                    mb: 0.6,
                    color: tokens.textPrimary,
                    fontSize: '0.86rem',
                    lineHeight: 1.4,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}
                >
                  "{m.message}"
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="caption" sx={{ color: tokens.textSecondary, fontSize: '0.75rem' }}>
                    {formatRelativeTime(m.createdAt, isVi)}
                  </Typography>
                  <Button
                    size="small"
                    variant="text"
                    endIcon={<ArrowRight size={14} />}
                    sx={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#3b82f6',
                      p: 0,
                      minWidth: 'auto',
                      textTransform: 'none'
                    }}
                  >
                    {isVi ? 'Mở' : 'Reply'}
                  </Button>
                </Box>
              </Card>
            ))}

            {urgentIssues.map((iss) => (
              <Card
                key={iss.id}
                onClick={() => setLocation(`/issues/${iss.number}`)}
                sx={{
                  backgroundColor: tokens.surface,
                  border: `1px solid ${tokens.border}`,
                  borderLeft: '4px solid #ef4444',
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                  p: 2,
                  minHeight: 124,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    borderColor: '#ef4444',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 6px 16px rgba(239, 68, 68, 0.1)'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AlertTriangle size={16} color="#ef4444" />
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#ef4444', letterSpacing: '0.04em' }}>
                      {iss.priority} BLOCKER
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
                    {formatRelativeTime(iss.createdAt, isVi)}
                  </Typography>
                </Box>

                <Tooltip title={`#${iss.number} ${iss.title}`} placement="top-start">
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 700,
                      mt: 1,
                      mb: 0.6,
                      color: tokens.textPrimary,
                      fontSize: '0.88rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'block',
                      maxWidth: '100%'
                    }}
                  >
                    #{iss.number} {iss.title}
                  </Typography>
                </Tooltip>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <UserAvatar user={iss.author} size={20} />
                    <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
                      {iss.author.displayName}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant="text"
                    endIcon={<ArrowRight size={14} />}
                    sx={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#ef4444',
                      p: 0,
                      minWidth: 'auto',
                      textTransform: 'none'
                    }}
                  >
                    {isVi ? 'Xử lý' : 'View'}
                  </Button>
                </Box>
              </Card>
            ))}
          </Box>
        )}
      </Box>



      <Box id="tour-recent-conversations">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { sm: 'center' },
            gap: 1.5,
            mb: 2,
            borderBottom: `1px solid ${tokens.divider}`,
            pb: 1.5
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <MessageSquare size={16} color={tokens.textSecondary} />
            <Typography
              variant="caption"
              sx={{
                fontWeight: 800,
                color: tokens.textSecondary,
                letterSpacing: '0.08em',
                fontSize: '0.75rem'
              }}
            >
              {isVi ? 'THẢO LUẬN GẦN ĐÂY' : 'RECENT CONVERSATIONS'}
            </Typography>
          </Box>

          <Tabs
            value={feedFilter}
            onChange={(_, val) => setFeedFilter(val)}
            textColor="primary"
            indicatorColor="primary"
            sx={{
              minHeight: 32,
              '& .MuiTab-root': {
                minHeight: 32,
                py: 0.5,
                px: 1.5,
                fontSize: '0.8rem',
                fontWeight: 600,
                textTransform: 'none'
              }
            }}
          >
            <Tab label={isVi ? 'Tất cả' : 'All'} value="all" />
            <Tab label={<Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}><Bug size={14} />{isVi ? 'Lỗi' : 'Bugs'}</Box>} value="bugs" />
            <Tab label={<Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}><Eye size={14} />Reviews</Box>} value="reviews" />
            <Tab label={<Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}><HelpCircle size={14} />{isVi ? 'Thảo luận' : 'Questions'}</Box>} value="questions" />
          </Tabs>
        </Box>

        {filteredConversations.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
              {isVi ? 'Chưa có bài thảo luận nào.' : 'No conversations found.'}
            </Typography>
          </Box>
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
            {filteredConversations.map((item, idx) => {
              const isBug = item.type === IssueType.BUG || item.type === 'BUG';
              const isReview = item.kind === 'review';
              const isQuestion = item.type === IssueType.TASK || item.type === 'QUESTION';
              const isIdea = item.type === IssueType.FEATURE || item.type === 'IDEA';

              let badgeColor = '#6366f1';
              let badgeLabel = item.type || 'POST';
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
                    minHeight: 74,
                    boxSizing: 'border-box',
                    py: { xs: 1.5, sm: 1.8 },
                    px: { xs: 1.8, sm: 2.5 },
                    borderBottom:
                      idx < filteredConversations.length - 1 ? `1px solid ${tokens.divider}` : 'none',
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
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0, flex: 1 }}>
                    <Chip
                      label={badgeLabel}
                      size="small"
                      sx={{
                        height: 24,
                        width: 90,
                        minWidth: 90,
                        maxWidth: 90,
                        fontSize: '0.6875rem',
                        fontWeight: 800,
                        backgroundColor: `${badgeColor}18`,
                        color: badgeColor,
                        border: `1px solid ${badgeColor}35`,
                        borderRadius: '6px',
                        flexShrink: 0,
                        justifyContent: 'center',
                        '& .MuiChip-label': {
                          px: 0,
                          textAlign: 'center',
                          width: '100%'
                        }
                      }}
                    />

                    <Box sx={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, overflow: 'hidden', mb: 0.3 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: tokens.textPrimary,
                            fontSize: '0.9rem',
                            lineHeight: 1.3,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '100%',
                            display: 'block'
                          }}
                        >
                          <span style={{ color: tokens.textSecondary, marginRight: 8, minWidth: 42, display: 'inline-block', fontWeight: 500, fontFamily: 'monospace' }}>
                            #{item.number}
                          </span>
                          {item.title}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, fontSize: '0.75rem', color: tokens.textSecondary, minWidth: 0, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.6, flexShrink: 0 }}>
                          <UserAvatar user={item.author} size={18} showTooltip={false} />
                          <span>@{item.author.username}</span>
                        </Box>
                        <span style={{ flexShrink: 0 }}>• {formatRelativeTime(item.createdAt, isVi)}</span>
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: tokens.textSecondary, fontSize: '0.75rem' }}>
                      <MessageSquare size={14} />
                      <span>{item.commentsCount}</span>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>

    <Box sx={{ minWidth: 0 }}>
      <DashboardSidebarWidgets
        isVi={isVi}
        repositoriesList={repositoriesList}
        waitingReviews={myOutboundReviews}
        urgentCount={urgentIssues.length}
        pendingCount={pendingReviews.length}
        workspace={activeWorkspace}
      />
    </Box>
  </Box>

  <CreateIssueModal
    open={createIssueOpen}
    onClose={() => setCreateIssueOpen(false)}
    onSuccess={(number) => {
      setCreateIssueOpen(false);
      setLocation(`/issues/${number}`);
    }}
  />

  <NewPostModal
    open={newPostOpen}
    onClose={() => setNewPostOpen(false)}
  />
</Box>
);
};
