import React, { useState } from "react";
import { Box, Typography, Button, Tooltip } from "@mui/material";
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
  Search,
  Calendar,
} from "lucide-react";
import { useLocation } from "wouter";
import { useThemeContext } from "../../contexts/ThemeContext";
import { useWeatherAndClock } from "../../hooks/useWeatherAndClock";
import { MiniCalendarPopover } from "./MiniCalendarPopover";

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
  reposCount,
}) => {
  const { tokens } = useThemeContext();
  const [, setLocation] = useLocation();
  const { timeString, dateString, shortDateString, weather } =
    useWeatherAndClock(isVi);
  const [calendarAnchor, setCalendarAnchor] = useState<HTMLElement | null>(
    null,
  );

  const hour = new Date().getHours();
  let greeting = isVi ? "Chào buổi sáng" : "Good morning";
  if (hour >= 12 && hour < 14) {
    greeting = isVi ? "Chào buổi trưa" : "Good noon";
  } else if (hour >= 14 && hour < 18) {
    greeting = isVi ? "Chào buổi chiều" : "Good afternoon";
  } else if (hour >= 18 && hour < 22) {
    greeting = isVi ? "Chào buổi tối" : "Good evening";
  } else if (hour >= 22 || hour < 5) {
    greeting = isVi ? "Cú đêm lập trình" : "Late night coding";
  }

  const renderWeatherIcon = () => {
    const code = weather.weatherCode;
    if (code === 0) return <Sun size={14} color="#f59e0b" />;
    if (code >= 1 && code <= 3) return <CloudSun size={14} color="#38bdf8" />;
    if (code >= 51 && code <= 65)
      return <CloudRain size={14} color="#60a5fa" />;
    if (code >= 71 && code <= 77)
      return <Snowflake size={14} color="#93c5fd" />;
    if (code >= 95 && code <= 99)
      return <CloudLightning size={14} color="#fbbf24" />;
    return <Cloud size={14} color="#94a3b8" />;
  };

  const statusSummary =
    pendingReviewsCount === 0 && urgentIssuesCount === 0
      ? isVi
        ? "Mọi việc đang tiến triển tốt - Bạn không có yêu cầu review hay lỗi khẩn cấp nào cần xử lý."
        : "All caught up - No pending reviews or blocker issues waiting for you."
      : isVi
        ? `Bạn có ${pendingReviewsCount} review và ${urgentIssuesCount} issue đang chờ bạn xử lý.`
        : `You have ${pendingReviewsCount} review(s) and ${urgentIssuesCount} issue(s) waiting.`;

  return (
    <Box id="tour-dev-station" sx={{ mb: 3 }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", md: "center" },
          gap: 2,
          mb: 2.5,
        }}
      >
        <Box>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: tokens.textPrimary,
              fontSize: { xs: "1.45rem", sm: "1.8rem" },
            }}
          >
            {greeting},{" "}
            {user?.displayName ||
              user?.username ||
              (isVi ? "Kỹ sư" : "Engineer")}{" "}
            👋
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: tokens.textSecondary,
              mt: 0.5,
              fontSize: "0.875rem",
            }}
          >
            {statusSummary}
          </Typography>
        </Box>

        <Box
          onClick={(e) => setCalendarAnchor(e.currentTarget)}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            flexWrap: "nowrap",
            gap: { xs: 0.8, sm: 1.2 },
            px: { xs: 1.2, sm: 1.5 },
            py: 0,
            height: 38,
            minHeight: 38,
            maxWidth: "100%",
            overflowX: "auto",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
            boxSizing: "border-box",
            borderRadius: "8px",
            backgroundColor: tokens.surface,
            border: `1px solid ${tokens.border}`,
            boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
            flexShrink: 0,
            cursor: "pointer",
            transition: "all 0.15s ease",
            "&:hover": {
              borderColor: tokens.primary,
              backgroundColor: tokens.hover,
            },
          }}
        >
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.6,
              flexShrink: 0,
            }}
          >
            <Clock size={14} color={tokens.textSecondary} />
            <Typography
              sx={{
                fontSize: { xs: "0.75rem", sm: "0.8125rem" },
                fontWeight: 600,
                color: tokens.textPrimary,
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
                lineHeight: 1,
              }}
            >
              {timeString}
            </Typography>
          </Box>

          <Box
            sx={{
              width: "1px",
              minWidth: "1px",
              maxWidth: "1px",
              height: 14,
              backgroundColor: tokens.divider,
              flexShrink: 0,
            }}
          />

          <Tooltip title={`${dateString} • Bấm để xem lịch chi tiết`}>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.6,
                flexShrink: 0,
              }}
            >
              <Calendar size={14} color={tokens.textSecondary} />
              <Typography
                sx={{
                  fontSize: { xs: "0.75rem", sm: "0.8125rem" },
                  fontWeight: 600,
                  color: tokens.textPrimary,
                  whiteSpace: "nowrap",
                  lineHeight: 1,
                }}
              >
                {shortDateString}
              </Typography>
            </Box>
          </Tooltip>

          <Box
            sx={{
              width: "1px",
              minWidth: "1px",
              maxWidth: "1px",
              height: 14,
              backgroundColor: tokens.divider,
              flexShrink: 0,
            }}
          />

          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.6,
              flexShrink: 0,
            }}
          >
            {renderWeatherIcon()}
            <Typography
              sx={{
                fontSize: { xs: "0.75rem", sm: "0.8125rem" },
                fontWeight: 600,
                color: tokens.textPrimary,
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
                lineHeight: 1,
              }}
            >
              {weather.temperature}°C
            </Typography>
          </Box>

          <Box
            sx={{
              width: "1px",
              minWidth: "1px",
              maxWidth: "1px",
              height: 14,
              backgroundColor: tokens.divider,
              flexShrink: 0,
            }}
          />

          <Tooltip
            title={`${weather.location} • ${weather.description} • Gió ${weather.windSpeed} km/h`}
          >
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.6,
                flexShrink: 0,
              }}
            >
              <MapPin size={14} color={tokens.textSecondary} />
              <Typography
                sx={{
                  fontSize: { xs: "0.75rem", sm: "0.8125rem" },
                  fontWeight: 600,
                  color: tokens.textPrimary,
                  whiteSpace: "nowrap",
                  lineHeight: 1,
                }}
              >
                {weather.location ? weather.location.split(",")[0].trim() : ""}
              </Typography>
            </Box>
          </Tooltip>
        </Box>

        <MiniCalendarPopover
          open={Boolean(calendarAnchor)}
          anchorEl={calendarAnchor}
          onClose={() => setCalendarAnchor(null)}
          weatherTemp={weather.temperature}
          weatherDesc={weather.description}
          isVi={isVi}
        />
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          alignItems: { xs: "stretch", lg: "center" },
          justifyContent: "space-between",
          gap: 1.5,
          p: 1.2,
          px: 1.5,
          borderRadius: "10px",
          backgroundColor: tokens.surface,
          border: `1px solid ${tokens.border}`,
        }}
      >
        <Box
          id="tour-action-buttons"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="contained"
            size="small"
            startIcon={<Plus size={15} />}
            onClick={() => setLocation("/issues/new")}
            sx={{
              backgroundColor: tokens.primary,
              color: "#ffffff",
              fontWeight: 600,
              textTransform: "none",
              fontSize: "0.8125rem",
              height: 28,
              px: 1.5,
              borderRadius: "6px",
            }}
          >
            {isVi ? "Tạo Issue" : "New Issue"}
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={<GitPullRequest size={14} color="#a855f7" />}
            onClick={() => setLocation("/reviews/new")}
            sx={{
              borderColor: "rgba(168, 85, 247, 0.4)",
              color: "#a855f7",
              fontWeight: 600,
              textTransform: "none",
              fontSize: "0.8125rem",
              height: 28,
              px: 1.5,
              borderRadius: "6px",
              backgroundColor: "rgba(168, 85, 247, 0.06)",
              "&:hover": {
                borderColor: "#a855f7",
                backgroundColor: "rgba(168, 85, 247, 0.12)",
              },
            }}
          >
            {isVi ? "Review PR" : "Request Review"}
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={onOpenNewPost}
            sx={{
              borderColor: tokens.border,
              color: tokens.textPrimary,
              fontWeight: 500,
              textTransform: "none",
              fontSize: "0.8125rem",
              height: 28,
              px: 1.4,
              borderRadius: "6px",
            }}
          >
            {isVi ? "Thảo luận" : "Discussion"}
          </Button>
        </Box>

        <Box
          id="tour-quick-filters"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Box
            onClick={() => setLocation("/reviews")}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              height: 28,
              boxSizing: "border-box",
              gap: 0.8,
              px: 1.2,
              borderRadius: "6px",
              backgroundColor:
                pendingReviewsCount > 0
                  ? "rgba(168, 85, 247, 0.15)"
                  : tokens.surfaceSecondary,
              border: `1px solid ${pendingReviewsCount > 0 ? "rgba(168, 85, 247, 0.3)" : "transparent"}`,
              cursor: "pointer",
              transition: "all 0.12s ease",
              "&:hover": {
                backgroundColor: tokens.hover,
              },
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor:
                  pendingReviewsCount > 0 ? "#a855f7" : tokens.textSecondary,
                flexShrink: 0,
              }}
            />
            <Typography
              sx={{
                fontSize: "0.75rem",
                fontWeight: 600,
                lineHeight: 1,
                color:
                  pendingReviewsCount > 0 ? "#c084fc" : tokens.textSecondary,
              }}
            >
              {pendingReviewsCount}{" "}
              {isVi ? "Review chờ bạn" : "Reviews for you"}
            </Typography>
          </Box>

          <Box
            onClick={() => setLocation("/issues?priority=P0&priority=P1")}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              height: 28,
              boxSizing: "border-box",
              gap: 0.8,
              px: 1.2,
              borderRadius: "6px",
              backgroundColor:
                urgentIssuesCount > 0
                  ? "rgba(239, 68, 68, 0.15)"
                  : tokens.surfaceSecondary,
              border: `1px solid ${urgentIssuesCount > 0 ? "rgba(239, 68, 68, 0.3)" : "transparent"}`,
              cursor: "pointer",
              transition: "all 0.12s ease",
              "&:hover": {
                backgroundColor: tokens.hover,
              },
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor:
                  urgentIssuesCount > 0 ? "#ef4444" : tokens.textSecondary,
                flexShrink: 0,
              }}
            />
            <Typography
              sx={{
                fontSize: "0.75rem",
                fontWeight: 600,
                lineHeight: 1,
                color: urgentIssuesCount > 0 ? "#f87171" : tokens.textSecondary,
              }}
            >
              {urgentIssuesCount} {isVi ? "Issue khẩn" : "Urgent issues"}
            </Typography>
          </Box>

          <Box
            onClick={() => setLocation("/reviews")}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              height: 28,
              boxSizing: "border-box",
              gap: 0.8,
              px: 1.2,
              borderRadius: "6px",
              backgroundColor: tokens.surfaceSecondary,
              cursor: "pointer",
              transition: "all 0.12s ease",
              "&:hover": {
                backgroundColor: tokens.hover,
              },
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: "#f59e0b",
                flexShrink: 0,
              }}
            />
            <Typography
              sx={{
                fontSize: "0.75rem",
                fontWeight: 600,
                lineHeight: 1,
                color: tokens.textSecondary,
              }}
            >
              {waitingReviewsCount}{" "}
              {isVi ? "Chờ đồng nghiệp" : "Waiting on others"}
            </Typography>
          </Box>

          <Box
            onClick={() => setLocation("/repositories")}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              height: 28,
              boxSizing: "border-box",
              gap: 0.8,
              px: 1.2,
              borderRadius: "6px",
              backgroundColor: tokens.surfaceSecondary,
              cursor: "pointer",
              transition: "all 0.12s ease",
              "&:hover": {
                backgroundColor: tokens.hover,
              },
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: "#10b981",
                flexShrink: 0,
              }}
            />
            <Typography
              sx={{
                fontSize: "0.75rem",
                fontWeight: 600,
                lineHeight: 1,
                color: tokens.textSecondary,
              }}
            >
              {reposCount} {isVi ? "Repo đã nối" : "Connected repos"}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
