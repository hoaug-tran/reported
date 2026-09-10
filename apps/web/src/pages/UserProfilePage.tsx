import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  Divider,
  Link as MuiLink,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  Tabs,
  Tab,
  IconButton,
  CircularProgress,
} from "@mui/material";
import {
  Mail,
  Calendar,
  GitPullRequest,
  Edit3,
  Flame,
  Trophy,
  Activity,
  FileText,
  CheckCircle2,
  MessageSquare,
  Upload,
  ExternalLink,
  User as UserIcon,
  Sparkles,
} from "lucide-react";
import { useRoute, useLocation } from "wouter";
import { useThemeContext } from "../contexts/ThemeContext";
import { useI18n } from "../contexts/I18nContext";
import { useAuthContext } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { UserAvatar } from "../components/common/UserAvatar";
import { apiFetch } from "../api/client";
import { UserProfileDto } from "@reported/contracts";
import { compressAvatarToWebP } from "../utils/imageOptimizer";
import { uploadFileWithChunking } from "../utils/chunkedUpload";

interface ActivityItem {
  type: string;
  id: string;
  title: string;
  link: string;
  status: string;
  createdAt: string;
}

interface ActivityData {
  dailyMap: Record<
    string,
    { count: number; issues: number; reviews: number; comments: number }
  >;
  totalContributions: number;
  currentStreak: number;
  longestStreak: number;
  recentItems: ActivityItem[];
  recentIssues: Array<{
    id: string;
    title: string;
    key: string;
    state: string;
    createdAt: string;
  }>;
  recentReviews: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
  }>;
}

export const UserProfilePage: React.FC = () => {
  const { tokens, resolvedMode } = useThemeContext();
  const { language } = useI18n();
  const isVi = language === "vi";
  const isDark = resolvedMode === "dark";
  const toast = useToast();
  const { user: currentUser, refreshUser } = useAuthContext();
  const [, setLocation] = useLocation();
  const [, params] = useRoute("/users/:username");

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfileDto | null>(null);
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  const [editOpen, setEditOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [editGithubUsername, setEditGithubUsername] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const isSelf =
    currentUser &&
    profile &&
    (currentUser.id === profile.id ||
      currentUser.username === profile.username);

  useEffect(() => {
    if (!params?.username) return;
    setLoading(true);
    Promise.all([
      apiFetch<UserProfileDto>(`/users/${params.username}`),
      apiFetch<ActivityData>(`/users/${params.username}/activity`).catch(
        () => null,
      ),
    ])
      .then(([prof, act]) => {
        setProfile(prof);
        setActivityData(act);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [params?.username]);

  const handleOpenEdit = () => {
    if (!profile) return;
    setEditDisplayName(profile.displayName || "");
    setEditEmail(profile.email || "");
    setEditBio(profile.bio || "");
    setEditAvatarUrl(profile.avatarUrl || "");
    setEditGithubUsername(profile.githubUsername || "");
    setEditOpen(true);
  };

  const handleAvatarFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      const webpFile = await compressAvatarToWebP(file);
      const res = await uploadFileWithChunking(webpFile, webpFile.name);
      setEditAvatarUrl(res.inlineUrl || res.url);
      toast.success(
        isVi
          ? "Đã tải lên và nén ảnh WebP thành công!"
          : "Avatar compressed to WebP and uploaded!",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editDisplayName.trim()) {
      toast.error(
        isVi
          ? "Tên hiển thị không được để trống"
          : "Display name cannot be empty",
      );
      return;
    }
    if (!editEmail.trim() || !editEmail.includes("@")) {
      toast.error(isVi ? "Email không hợp lệ" : "Invalid email address");
      return;
    }

    try {
      setIsSaving(true);
      const updated = await apiFetch<UserProfileDto>("/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: editDisplayName.trim(),
          email: editEmail.trim(),
          bio: editBio.trim(),
          avatarUrl: editAvatarUrl.trim() || null,
          githubUsername: editGithubUsername.trim() || null,
        }),
      });

      setProfile((prev) => (prev ? { ...prev, ...updated } : updated));
      await refreshUser();
      setEditOpen(false);
      toast.success(
        isVi
          ? "Đã cập nhật thông tin cá nhân thành công."
          : "Profile updated successfully.",
      );
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Error updating profile",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const calendarDays = useMemo(() => {
    const days: Array<{
      dateStr: string;
      count: number;
      issues: number;
      reviews: number;
      comments: number;
      dayOfWeek: number;
      month: number;
    }> = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 364);

    const dayShift = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayShift);

    const cursor = new Date(startDate);
    while (cursor <= today || cursor.getDay() !== 0) {
      const dateStr = cursor.toISOString().split("T")[0];
      const data = activityData?.dailyMap[dateStr] || {
        count: 0,
        issues: 0,
        reviews: 0,
        comments: 0,
      };
      days.push({
        dateStr,
        count: data.count,
        issues: data.issues,
        reviews: data.reviews,
        comments: data.comments,
        dayOfWeek: cursor.getDay(),
        month: cursor.getMonth(),
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    return days;
  }, [activityData]);

  const weeks = useMemo(() => {
    const result: (typeof calendarDays)[] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  const monthLabels = useMemo(() => {
    const labels: Array<{ text: string; colIndex: number }> = [];
    let lastMonth = -1;
    weeks.forEach((week, wIdx) => {
      const firstDayOfMonth = week.find(
        (d) =>
          d.dateStr.endsWith("-01") ||
          (d.dayOfWeek === 1 && d.month !== lastMonth),
      );
      if (firstDayOfMonth && firstDayOfMonth.month !== lastMonth) {
        lastMonth = firstDayOfMonth.month;
        const monthNamesVi = [
          "Thg 1",
          "Thg 2",
          "Thg 3",
          "Thg 4",
          "Thg 5",
          "Thg 6",
          "Thg 7",
          "Thg 8",
          "Thg 9",
          "Thg 10",
          "Thg 11",
          "Thg 12",
        ];
        const monthNamesEn = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        labels.push({
          text: isVi ? monthNamesVi[lastMonth] : monthNamesEn[lastMonth],
          colIndex: wIdx,
        });
      }
    });
    return labels;
  }, [weeks, isVi]);

  const getCellColor = (count: number) => {
    if (count === 0) return isDark ? "#1a2332" : "#ebedf0";
    if (count <= 2) return isDark ? "#0e4429" : "#9be9a8";
    if (count <= 5) return isDark ? "#006d32" : "#40c463";
    if (count <= 9) return isDark ? "#26a641" : "#30a14e";
    return isDark ? "#39d353" : "#216e39";
  };

  if (loading) {
    return (
      <Box
        sx={{
          maxWidth: 1000,
          mx: "auto",
          py: 4,
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
          <Skeleton variant="circular" width={80} height={80} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="40%" height={36} />
            <Skeleton variant="text" width="20%" height={20} sx={{ mt: 0.5 }} />
          </Box>
        </Box>
        <Skeleton
          variant="rectangular"
          width="100%"
          height={180}
          sx={{ borderRadius: "8px" }}
        />
        <Skeleton
          variant="rectangular"
          width="100%"
          height={260}
          sx={{ borderRadius: "8px" }}
        />
      </Box>
    );
  }

  if (!profile) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Typography variant="h3">
          {isVi ? "Không tìm thấy người dùng" : "User not found"}
        </Typography>
        <Button
          onClick={() => setLocation("/")}
          sx={{ mt: 2, borderRadius: "6px" }}
        >
          {isVi ? "Về trang chủ" : "Back to Home"}
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        maxWidth: 1100,
        mx: "auto",
        pb: 8,
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      <Box
        sx={{
          p: { xs: 2.5, sm: 3 },
          borderRadius: "10px",
          border: `1px solid ${tokens.border}`,
          backgroundColor: tokens.surface,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "center", sm: "flex-start" },
          textAlign: { xs: "center", sm: "left" },
          gap: { xs: 2, sm: 3 },
          position: "relative",
        }}
      >
        <Box sx={{ position: "relative" }}>
          <UserAvatar user={profile} size={84} showTooltip={false} />
          {isSelf && (
            <Tooltip title={isVi ? "Đổi ảnh đại diện" : "Change avatar"}>
              <IconButton
                size="small"
                onClick={handleOpenEdit}
                sx={{
                  position: "absolute",
                  bottom: -4,
                  right: -4,
                  backgroundColor: tokens.primary,
                  color: "#ffffff",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                  "&:hover": { backgroundColor: tokens.primaryHover },
                }}
              >
                <Edit3 size={13} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, width: { xs: "100%", sm: "auto" } }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "center", sm: "flex-start" },
              justifyContent: "space-between",
              gap: 1.5,
              mb: 0.5,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: { xs: "center", sm: "flex-start" },
                gap: 1.2,
                flexWrap: "wrap",
              }}
            >
              <Typography
                variant="h1"
                sx={{
                  fontWeight: 800,
                  fontSize: "1.45rem",
                  letterSpacing: "-0.015em",
                }}
              >
                {profile.displayName}
              </Typography>
              <Chip
                label={profile.role}
                size="small"
                sx={{
                  height: 20,
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  borderRadius: "4px",
                  backgroundColor: tokens.surfaceSecondary,
                  color: tokens.primary,
                  border: `1px solid ${tokens.border}`,
                }}
              />
            </Box>

            {isSelf && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<Edit3 size={14} />}
                onClick={handleOpenEdit}
                sx={{
                  borderRadius: "6px",
                  fontSize: "0.8125rem",
                  borderColor: tokens.border,
                  color: tokens.textPrimary,
                }}
              >
                {isVi ? "Chỉnh sửa hồ sơ" : "Edit profile"}
              </Button>
            )}
          </Box>

          <Typography
            variant="body2"
            sx={{
              color: tokens.textSecondary,
              mb: 1.2,
              fontFamily: "monospace",
            }}
          >
            @{profile.username}
          </Typography>

          {profile.bio && (
            <Typography
              variant="body2"
              sx={{
                color: tokens.textPrimary,
                mb: 1.8,
                lineHeight: 1.6,
                maxWidth: 720,
              }}
            >
              {profile.bio}
            </Typography>
          )}

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: { xs: "center", sm: "flex-start" },
              gap: 2.5,
              flexWrap: "wrap",
              color: tokens.textSecondary,
              fontSize: "0.8125rem",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
              <Mail size={14} />
              <span>{profile.email}</span>
            </Box>

            {profile.githubUsername && (
              <MuiLink
                href={`https://github.com/${profile.githubUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.6,
                  color: tokens.textSecondary,
                  textDecoration: "none",
                  "&:hover": { color: tokens.primary },
                }}
              >
                <GitPullRequest size={14} />
                <span>github.com/{profile.githubUsername}</span>
                <ExternalLink size={12} />
              </MuiLink>
            )}

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
              <Calendar size={14} />
              <span>
                {isVi ? "Tham gia từ" : "Joined"}{" "}
                {new Date(profile.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: { xs: 1, sm: 2 },
        }}
      >
        <Box
          sx={{
            p: { xs: 1.2, sm: 2 },
            borderRadius: "8px",
            border: `1px solid ${tokens.border}`,
            backgroundColor: tokens.surface,
            textAlign: "center",
          }}
        >
          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              color: tokens.primary,
              fontSize: { xs: "1.25rem", sm: "1.75rem" },
            }}
          >
            {profile.createdIssuesCount || 0}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: tokens.textSecondary,
              fontWeight: 700,
              letterSpacing: "0.02em",
              fontSize: { xs: "0.625rem", sm: "0.75rem" },
              display: "block",
              lineHeight: 1.2,
            }}
          >
            {isVi ? "ĐÃ TẠO" : "OPENED"}
          </Typography>
        </Box>

        <Box
          sx={{
            p: { xs: 1.2, sm: 2 },
            borderRadius: "8px",
            border: `1px solid ${tokens.border}`,
            backgroundColor: tokens.surface,
            textAlign: "center",
          }}
        >
          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              color: tokens.warning,
              fontSize: { xs: "1.25rem", sm: "1.75rem" },
            }}
          >
            {profile.assignedIssuesCount || 0}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: tokens.textSecondary,
              fontWeight: 700,
              letterSpacing: "0.02em",
              fontSize: { xs: "0.625rem", sm: "0.75rem" },
              display: "block",
              lineHeight: 1.2,
            }}
          >
            {isVi ? "ĐƯỢC GIAO" : "ASSIGNED"}
          </Typography>
        </Box>

        <Box
          sx={{
            p: { xs: 1.2, sm: 2 },
            borderRadius: "8px",
            border: `1px solid ${tokens.border}`,
            backgroundColor: tokens.surface,
            textAlign: "center",
          }}
        >
          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              color: "#a855f7",
              fontSize: { xs: "1.25rem", sm: "1.75rem" },
            }}
          >
            {profile.pendingReviewsCount || 0}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: tokens.textSecondary,
              fontWeight: 700,
              letterSpacing: "0.02em",
              fontSize: { xs: "0.625rem", sm: "0.75rem" },
              display: "block",
              lineHeight: 1.2,
            }}
          >
            {isVi ? "REVIEW" : "REVIEWS"}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          p: 2.5,
          borderRadius: "10px",
          border: `1px solid ${tokens.border}`,
          backgroundColor: tokens.surface,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Activity size={16} color={tokens.primary} />
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 700, fontSize: "0.875rem" }}
            >
              {isVi
                ? "Biểu đồ hoạt động & Đóng góp"
                : "Activity & Contributions"}
            </Typography>
            <Chip
              label={`${activityData?.totalContributions || 0} ${isVi ? "đóng góp trong năm qua" : "in the last year"}`}
              size="small"
              sx={{
                height: 20,
                fontSize: "0.6875rem",
                fontWeight: 600,
                backgroundColor: tokens.surfaceSecondary,
                border: `1px solid ${tokens.border}`,
              }}
            />
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                fontSize: "0.75rem",
                color: tokens.textSecondary,
              }}
            >
              <Flame size={14} color="#f59e0b" />
              <span>
                {isVi ? "Chuỗi hiện tại:" : "Current streak:"}{" "}
                <strong>{activityData?.currentStreak || 0}d</strong>
              </span>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                fontSize: "0.75rem",
                color: tokens.textSecondary,
              }}
            >
              <Trophy size={14} color="#10b981" />
              <span>
                {isVi ? "Kỷ lục:" : "Longest:"}{" "}
                <strong>{activityData?.longestStreak || 0}d</strong>
              </span>
            </Box>
          </Box>
        </Box>

        <Box sx={{ width: "100%", overflowX: "auto", pb: 1, pr: 0.5 }}>
          <Box
            sx={{
              width: "100%",
              minWidth: 780,
              pr: 2,
              boxSizing: "border-box",
            }}
          >
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: `28px repeat(${weeks.length}, minmax(0, 1fr))`,
                gap: "3px",
                width: "100%",
                mb: 0.8,
                alignItems: "center",
              }}
            >
              <Box />
              {monthLabels.map((m, idx) => (
                <Typography
                  key={idx}
                  variant="caption"
                  sx={{
                    gridColumn: `${m.colIndex + 2}`,
                    fontSize: "0.6875rem",
                    color: tokens.textSecondary,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {m.text}
                </Typography>
              ))}
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: `28px repeat(${weeks.length}, minmax(0, 1fr))`,
                gap: "3px",
                width: "100%",
                alignItems: "stretch",
              }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateRows: "repeat(7, 1fr)",
                  gap: "3px",
                  pr: 0.6,
                }}
              >
                <Box />
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: "0.625rem",
                    color: tokens.textSecondary,
                    display: "flex",
                    alignItems: "center",
                    lineHeight: 1,
                  }}
                >
                  {isVi ? "T2" : "Mon"}
                </Typography>
                <Box />
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: "0.625rem",
                    color: tokens.textSecondary,
                    display: "flex",
                    alignItems: "center",
                    lineHeight: 1,
                  }}
                >
                  {isVi ? "T4" : "Wed"}
                </Typography>
                <Box />
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: "0.625rem",
                    color: tokens.textSecondary,
                    display: "flex",
                    alignItems: "center",
                    lineHeight: 1,
                  }}
                >
                  {isVi ? "T6" : "Fri"}
                </Typography>
                <Box />
              </Box>

              {weeks.map((week, wIdx) => (
                <Box
                  key={wIdx}
                  sx={{
                    display: "grid",
                    gridTemplateRows: "repeat(7, 1fr)",
                    gap: "3px",
                    width: "100%",
                  }}
                >
                  {week.map((day) => {
                    const tipText = isVi
                      ? `${day.count} hoạt động vào ${day.dateStr} (${day.issues} bài viết, ${day.reviews} review, ${day.comments} bình luận)`
                      : `${day.count} contributions on ${day.dateStr} (${day.issues} issues, ${day.reviews} reviews, ${day.comments} comments)`;
                    return (
                      <Tooltip
                        key={day.dateStr}
                        title={tipText}
                        arrow
                        placement="top"
                      >
                        <Box
                          sx={{
                            width: "100%",
                            aspectRatio: "1",
                            borderRadius: "2.5px",
                            backgroundColor: getCellColor(day.count),
                            transition: "all 0.12s ease",
                            cursor: "pointer",
                            "&:hover": {
                              transform: "scale(1.25)",
                              transformOrigin:
                                wIdx >= weeks.length - 2
                                  ? "right center"
                                  : "center center",
                              boxShadow: `0 0 0 2px ${tokens.primary}`,
                              zIndex: 2,
                            },
                          }}
                        />
                      </Tooltip>
                    );
                  })}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1,
            pt: 0.5,
          }}
        >
          <Typography
            variant="caption"
            sx={{ color: tokens.textSecondary, fontSize: "0.75rem" }}
          >
            {isVi
              ? `${activityData?.totalContributions || 0} hoạt động được ghi nhận trong 52 tuần qua`
              : `${activityData?.totalContributions || 0} contributions recorded across 52 weeks`}
          </Typography>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.6,
              fontSize: "0.6875rem",
              color: tokens.textSecondary,
            }}
          >
            <span>{isVi ? "Ít" : "Less"}</span>
            <Box
              sx={{
                width: 11,
                height: 11,
                borderRadius: "2px",
                backgroundColor: getCellColor(0),
              }}
            />
            <Box
              sx={{
                width: 11,
                height: 11,
                borderRadius: "2px",
                backgroundColor: getCellColor(2),
              }}
            />
            <Box
              sx={{
                width: 11,
                height: 11,
                borderRadius: "2px",
                backgroundColor: getCellColor(5),
              }}
            />
            <Box
              sx={{
                width: 11,
                height: 11,
                borderRadius: "2px",
                backgroundColor: getCellColor(8),
              }}
            />
            <Box
              sx={{
                width: 11,
                height: 11,
                borderRadius: "2px",
                backgroundColor: getCellColor(12),
              }}
            />
            <span>{isVi ? "Nhiều" : "More"}</span>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          borderRadius: "10px",
          border: `1px solid ${tokens.border}`,
          backgroundColor: tokens.surface,
          overflow: "hidden",
        }}
      >
        <Box sx={{ borderBottom: `1px solid ${tokens.border}`, px: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            textColor="primary"
            indicatorColor="primary"
            sx={{
              minHeight: 44,
              maxWidth: "100%",
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 600,
                minHeight: 44,
                fontSize: "0.84rem",
                whiteSpace: "nowrap",
              },
            }}
          >
            <Tab label={isVi ? "Hoạt động gần đây" : "Recent Activity"} />
            <Tab label={isVi ? "Bài viết đã tạo" : "Opened Issues"} />
            <Tab label={isVi ? "Yêu cầu Review" : "Code Reviews"} />
          </Tabs>
        </Box>

        <Box sx={{ p: 2.5, minHeight: 320 }}>
          {activeTab === 0 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
              {!activityData?.recentItems ||
              activityData.recentItems.length === 0 ? (
                <Typography
                  variant="body2"
                  sx={{
                    color: tokens.textSecondary,
                    textAlign: "center",
                    py: 3,
                  }}
                >
                  {isVi
                    ? "Chưa có hoạt động gần đây."
                    : "No recent activity recorded yet."}
                </Typography>
              ) : (
                activityData.recentItems.map((item, idx) => (
                  <Box
                    key={idx}
                    onClick={() => setLocation(item.link)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      height: 48,
                      minHeight: 48,
                      boxSizing: "border-box",
                      px: 1.5,
                      borderRadius: "6px",
                      backgroundColor: tokens.surfaceSecondary,
                      cursor: "pointer",
                      transition: "background-color 0.12s ease",
                      "&:hover": { backgroundColor: tokens.hover },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.2,
                        minWidth: 0,
                        flex: 1,
                        mr: 1,
                      }}
                    >
                      {item.type === "issue" ? (
                        <FileText
                          size={16}
                          color={tokens.primary}
                          style={{ flexShrink: 0 }}
                        />
                      ) : (
                        <CheckCircle2
                          size={16}
                          color={tokens.accent}
                          style={{ flexShrink: 0 }}
                        />
                      )}
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: tokens.textPrimary,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        noWrap
                      >
                        {item.title}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Chip
                        label={item.status}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: "0.625rem",
                          fontWeight: 600,
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          color: tokens.textSecondary,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {new Date(item.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          )}

          {activeTab === 1 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
              {!activityData?.recentIssues ||
              activityData.recentIssues.length === 0 ? (
                <Typography
                  variant="body2"
                  sx={{
                    color: tokens.textSecondary,
                    textAlign: "center",
                    py: 3,
                  }}
                >
                  {isVi ? "Chưa tạo bài viết nào." : "No issues created yet."}
                </Typography>
              ) : (
                activityData.recentIssues.map((issue) => (
                  <Box
                    key={issue.id}
                    onClick={() => setLocation(`/issues/${issue.id}`)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      height: 48,
                      minHeight: 48,
                      boxSizing: "border-box",
                      px: 1.5,
                      borderRadius: "6px",
                      backgroundColor: tokens.surfaceSecondary,
                      cursor: "pointer",
                      transition: "background-color 0.12s ease",
                      "&:hover": { backgroundColor: tokens.hover },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.2,
                        minWidth: 0,
                        flex: 1,
                        mr: 1,
                      }}
                    >
                      <FileText
                        size={16}
                        color={tokens.primary}
                        style={{ flexShrink: 0 }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: tokens.textPrimary,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        noWrap
                      >
                        {issue.title}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Chip
                        label={issue.state}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: "0.625rem",
                          fontWeight: 600,
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          color: tokens.textSecondary,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {new Date(issue.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          )}

          {activeTab === 2 && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
              {!activityData?.recentReviews ||
              activityData.recentReviews.length === 0 ? (
                <Typography
                  variant="body2"
                  sx={{
                    color: tokens.textSecondary,
                    textAlign: "center",
                    py: 3,
                  }}
                >
                  {isVi
                    ? "Chưa tham gia review nào."
                    : "No reviews involved yet."}
                </Typography>
              ) : (
                activityData.recentReviews.map((rev) => (
                  <Box
                    key={rev.id}
                    onClick={() => setLocation(`/reviews/${rev.id}`)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      height: 48,
                      minHeight: 48,
                      boxSizing: "border-box",
                      px: 1.5,
                      borderRadius: "6px",
                      backgroundColor: tokens.surfaceSecondary,
                      cursor: "pointer",
                      transition: "background-color 0.12s ease",
                      "&:hover": { backgroundColor: tokens.hover },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.2,
                        minWidth: 0,
                        flex: 1,
                        mr: 1,
                      }}
                    >
                      <CheckCircle2
                        size={16}
                        color={tokens.accent}
                        style={{ flexShrink: 0 }}
                      />
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: 600,
                          color: tokens.textPrimary,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        noWrap
                      >
                        {rev.title}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Chip
                        label={rev.status}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: "0.625rem",
                          fontWeight: 600,
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{
                          color: tokens.textSecondary,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          )}
        </Box>
      </Box>

      <Dialog
        open={editOpen}
        onClose={() => !isSaving && setEditOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "10px",
            backgroundColor: tokens.surface,
            border: `1px solid ${tokens.border}`,
            backgroundImage: "none",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {isVi ? "Chỉnh sửa thông tin cá nhân" : "Edit Personal Profile"}
        </DialogTitle>

        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2.5,
            pt: "16px !important",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2.5,
              p: 1.5,
              borderRadius: "8px",
              backgroundColor: tokens.surfaceSecondary,
              border: `1px solid ${tokens.border}`,
            }}
          >
            <UserAvatar
              user={{ displayName: editDisplayName, avatarUrl: editAvatarUrl }}
              size={64}
              showTooltip={false}
            />
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, color: tokens.textSecondary }}
              >
                {isVi ? "Ảnh đại diện" : "Avatar"}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Button
                  component="label"
                  variant="outlined"
                  size="small"
                  startIcon={
                    isUploadingAvatar ? (
                      <CircularProgress size={14} />
                    ) : (
                      <Upload size={14} />
                    )
                  }
                  disabled={isUploadingAvatar}
                  sx={{ borderRadius: "6px", fontSize: "0.75rem" }}
                >
                  {isUploadingAvatar
                    ? isVi
                      ? "Đang tải..."
                      : "Uploading..."
                    : isVi
                      ? "Tải ảnh lên"
                      : "Upload image"}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleAvatarFileSelect}
                  />
                </Button>
                {editAvatarUrl && (
                  <Button
                    size="small"
                    color="inherit"
                    onClick={() => setEditAvatarUrl("")}
                    sx={{
                      fontSize: "0.75rem",
                      borderRadius: "6px",
                      color: tokens.error,
                    }}
                  >
                    {isVi ? "Xóa ảnh" : "Remove"}
                  </Button>
                )}
              </Box>
            </Box>
          </Box>

          <TextField
            fullWidth
            label={isVi ? "Tên hiển thị" : "Display Name"}
            value={editDisplayName}
            onChange={(e) => setEditDisplayName(e.target.value)}
            required
          />

          <TextField
            fullWidth
            label="Email"
            type="email"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            required
          />

          <TextField
            fullWidth
            label="GitHub Username"
            placeholder="hoaug-tran"
            value={editGithubUsername}
            onChange={(e) =>
              setEditGithubUsername(e.target.value.replace(/^@/, ""))
            }
            helperText={
              isVi
                ? "Liên kết tài khoản GitHub của bạn để đồng bộ avatar và code reviews"
                : "Link your GitHub username for PR and review sync"
            }
          />

          <TextField
            fullWidth
            label={isVi ? "Giới thiệu bản thân (Bio)" : "Bio"}
            multiline
            rows={3}
            placeholder={
              isVi
                ? "Lập trình viên Fullstack, quan tâm đến kiến trúc hệ thống và clean code..."
                : "Fullstack engineer passionate about scalable architecture..."
            }
            value={editBio}
            onChange={(e) => setEditBio(e.target.value)}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setEditOpen(false)}
            disabled={isSaving}
            sx={{ borderRadius: "6px", color: tokens.textSecondary }}
          >
            {isVi ? "Hủy" : "Cancel"}
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveProfile}
            disabled={isSaving || isUploadingAvatar}
            sx={{ borderRadius: "6px", minWidth: 90 }}
          >
            {isSaving
              ? isVi
                ? "Đang lưu..."
                : "Saving..."
              : isVi
                ? "Lưu thay đổi"
                : "Save changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
