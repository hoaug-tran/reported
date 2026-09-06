import React from 'react';
import { Box, Typography, Button, Tooltip } from '@mui/material';
import {
  Sun,
  CloudSun,
  CloudRain,
  Cloud,
  CloudLightning,
  Snowflake,
  MapPin,
  Clock,
  Plus,
  GitPullRequest,
  Search
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useWeatherAndClock } from '../../hooks/useWeatherAndClock';

interface DashboardHeroProps {
  user: { displayName?: string | null; username?: string } | null;
  isVi: boolean;
  onOpenCreateIssue: () => void;
  onOpenNewPost: () => void;
  pendingReviewsCount: number;
  urgentIssuesCount: number;
  waitingReviewsCount: number;
  reposCount: number;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({
  user,
  isVi,
  onOpenCreateIssue,
  onOpenNewPost,
  pendingReviewsCount,
  urgentIssuesCount,
  waitingReviewsCount,
  reposCount
}) => {
  const { tokens } = useThemeContext();
  const [, setLocation] = useLocation();
  const { timeString, dateString, weather } = useWeatherAndClock(isVi);

  const hour = new Date().getHours();
  let greeting = isVi ? 'Chào buổi sáng' : 'Good morning';
  if (hour >= 12 && hour < 14) {
    greeting = isVi ? 'Chào buổi trưa' : 'Good noon';
  } else if (hour >= 14 && hour < 18) {
    greeting = isVi ? 'Chào buổi chiều' : 'Good afternoon';
  } else if (hour >= 18 && hour < 22) {
    greeting = isVi ? 'Chào buổi tối' : 'Good evening';
  } else if (hour >= 22 || hour < 5) {
    greeting = isVi ? 'Cú đêm lập trình' : 'Late night coding';
  }

  const renderWeatherIcon = () => {
    const code = weather.weatherCode;
    if (code === 0) return <Sun size={17} color="#f59e0b" />;
    if (code >= 1 && code <= 3) return <CloudSun size={17} color="#38bdf8" />;
    if (code >= 51 && code <= 65) return <CloudRain size={17} color="#60a5fa" />;
    if (code >= 71 && code <= 77) return <Snowflake size={17} color="#93c5fd" />;
    if (code >= 95 && code <= 99) return <CloudLightning size={17} color="#fbbf24" />;
    return <Cloud size={17} color="#94a3b8" />;
  };

  const handleOpenCommandPalette = () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
  };

  const statusSummary = pendingReviewsCount === 0 && urgentIssuesCount === 0
    ? (isVi ? 'Mọi việc đang tiến triển tốt - Bạn không có yêu cầu review hay lỗi khẩn cấp nào cần xử lý.' : 'All caught up - No pending reviews or blocker issues waiting for you.')
    : (isVi ? `Bạn có ${pendingReviewsCount} review và ${urgentIssuesCount} issue đang chờ bạn xử lý.` : `You have ${pendingReviewsCount} review(s) and ${urgentIssuesCount} issue(s) waiting.`);

  return (
    <Box sx={{ mb: 3 }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2,
          mb: 2.5
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: tokens.textPrimary,
              fontSize: { xs: '1.45rem', sm: '1.8rem' }
            }}
          >
            {greeting}, {user?.displayName || user?.username || (isVi ? 'Kỹ sư' : 'Engineer')}
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: tokens.textSecondary,
              mt: 0.5,
              fontSize: '0.875rem'
            }}
          >
            {statusSummary}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            px: 1.8,
            py: 0.8,
            borderRadius: '24px',
            backgroundColor: tokens.surface,
            border: `1px solid ${tokens.border}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            flexShrink: 0
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <Clock size={15} color={tokens.primary} />
            <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.875rem', color: tokens.textPrimary }}>
              {timeString}
            </Typography>
          </Box>

          <Box sx={{ width: 1, height: 16, backgroundColor: tokens.divider }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            {renderWeatherIcon()}
            <Typography sx={{ fontWeight: 700, fontSize: '0.875rem', color: tokens.textPrimary }}>
              {weather.temperature}°C
            </Typography>
          </Box>

          <Box sx={{ width: 1, height: 16, backgroundColor: tokens.divider }} />

          <Tooltip title={`${dateString} • ${weather.description} • Gió ${weather.windSpeed} km/h`}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, cursor: 'default' }}>
              <MapPin size={13} color={tokens.textSecondary} />
              <Typography sx={{ fontSize: '0.75rem', color: tokens.textSecondary, fontWeight: 500, maxWidth: 130 }} noWrap>
                {weather.location}
              </Typography>
            </Box>
          </Tooltip>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          alignItems: { xs: 'stretch', lg: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
          p: 1.2,
          px: 1.5,
          borderRadius: '10px',
          backgroundColor: tokens.surface,
          border: `1px solid ${tokens.border}`
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<Plus size={15} />}
            onClick={onOpenCreateIssue}
            sx={{
              backgroundColor: tokens.primary,
              color: '#ffffff',
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '0.8125rem',
              height: 28,
              px: 1.5,
              borderRadius: '6px'
            }}
          >
            {isVi ? 'Tạo Issue' : 'New Issue'}
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={<GitPullRequest size={15} color="#a855f7" />}
            onClick={() => setLocation('/reviews/new')}
            sx={{
              borderColor: 'rgba(168, 85, 247, 0.4)',
              color: '#c084fc',
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '0.8125rem',
              height: 28,
              px: 1.5,
              borderRadius: '6px',
              backgroundColor: 'rgba(168, 85, 247, 0.06)',
              '&:hover': {
                borderColor: '#a855f7',
                backgroundColor: 'rgba(168, 85, 247, 0.12)'
              }
            }}
          >
            {isVi ? 'Review PR' : 'Request Review'}
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={onOpenNewPost}
            sx={{
              borderColor: tokens.border,
              color: tokens.textPrimary,
              fontWeight: 500,
              textTransform: 'none',
              fontSize: '0.8125rem',
              height: 28,
              px: 1.4,
              borderRadius: '6px'
            }}
          >
            {isVi ? 'Thảo luận' : 'Discussion'}
          </Button>

          <Button
            variant="text"
            size="small"
            startIcon={<Search size={13} />}
            onClick={handleOpenCommandPalette}
            sx={{
              color: tokens.textSecondary,
              fontSize: '0.75rem',
              fontWeight: 500,
              textTransform: 'none',
              height: 28
            }}
          >
            Ctrl + K
          </Button>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Box
            onClick={() => setLocation('/reviews')}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 28,
              boxSizing: 'border-box',
              gap: 0.8,
              px: 1.2,
              borderRadius: '6px',
              backgroundColor: pendingReviewsCount > 0 ? 'rgba(168, 85, 247, 0.15)' : tokens.surfaceSecondary,
              border: `1px solid ${pendingReviewsCount > 0 ? 'rgba(168, 85, 247, 0.3)' : 'transparent'}`,
              cursor: 'pointer',
              transition: 'all 0.12s ease',
              '&:hover': {
                backgroundColor: tokens.hover
              }
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: pendingReviewsCount > 0 ? '#a855f7' : tokens.textSecondary,
                flexShrink: 0
              }}
            />
            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                lineHeight: 1,
                color: pendingReviewsCount > 0 ? '#c084fc' : tokens.textSecondary
              }}
            >
              {pendingReviewsCount} {isVi ? 'Review chờ bạn' : 'Reviews for you'}
            </Typography>
          </Box>

          <Box
            onClick={() => setLocation('/issues?priority=P0&priority=P1')}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 28,
              boxSizing: 'border-box',
              gap: 0.8,
              px: 1.2,
              borderRadius: '6px',
              backgroundColor: urgentIssuesCount > 0 ? 'rgba(239, 68, 68, 0.15)' : tokens.surfaceSecondary,
              border: `1px solid ${urgentIssuesCount > 0 ? 'rgba(239, 68, 68, 0.3)' : 'transparent'}`,
              cursor: 'pointer',
              transition: 'all 0.12s ease',
              '&:hover': {
                backgroundColor: tokens.hover
              }
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: urgentIssuesCount > 0 ? '#ef4444' : tokens.textSecondary,
                flexShrink: 0
              }}
            />
            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                lineHeight: 1,
                color: urgentIssuesCount > 0 ? '#f87171' : tokens.textSecondary
              }}
            >
              {urgentIssuesCount} {isVi ? 'Issue khẩn' : 'Urgent issues'}
            </Typography>
          </Box>

          <Box
            onClick={() => setLocation('/reviews')}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 28,
              boxSizing: 'border-box',
              gap: 0.8,
              px: 1.2,
              borderRadius: '6px',
              backgroundColor: tokens.surfaceSecondary,
              cursor: 'pointer',
              transition: 'all 0.12s ease',
              '&:hover': {
                backgroundColor: tokens.hover
              }
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: '#f59e0b',
                flexShrink: 0
              }}
            />
            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                lineHeight: 1,
                color: tokens.textSecondary
              }}
            >
              {waitingReviewsCount} {isVi ? 'Chờ đồng nghiệp' : 'Waiting on others'}
            </Typography>
          </Box>

          <Box
            onClick={() => setLocation('/repositories')}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 28,
              boxSizing: 'border-box',
              gap: 0.8,
              px: 1.2,
              borderRadius: '6px',
              backgroundColor: tokens.surfaceSecondary,
              cursor: 'pointer',
              transition: 'all 0.12s ease',
              '&:hover': {
                backgroundColor: tokens.hover
              }
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: '#10b981',
                flexShrink: 0
              }}
            />
            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                lineHeight: 1,
                color: tokens.textSecondary
              }}
            >
              {reposCount} {isVi ? 'Repo đã nối' : 'Connected repos'}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
