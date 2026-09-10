import React from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  FolderGit2,
  ExternalLink,
  Plus,
  Clock,
  Keyboard,
  GitBranch,
  Tag,
} from "lucide-react";
import { useLocation } from "wouter";
import { useThemeContext } from "../../contexts/ThemeContext";
import { UserAvatar } from "../common/UserAvatar";
import {
  ReviewDetailDto,
  RepositoryDto,
  WorkspaceSummaryDto,
} from "@reported/contracts";

interface DashboardSidebarWidgetsProps {
  isVi: boolean;
  repositoriesList: RepositoryDto[];
  waitingReviews: ReviewDetailDto[];
  urgentCount?: number;
  pendingCount?: number;
  workspace?: WorkspaceSummaryDto | null;
}

function formatRelativeTime(dateStr: string, isVi: boolean): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return isVi ? `${diffMin}p trước` : `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return isVi ? `${diffHour}h trước` : `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  return isVi ? `${diffDay} ngày trước` : `${diffDay}d ago`;
}

const POPULAR_TAGS = [
  { name: "bug", color: "#ef4444", bg: "rgba(239, 68, 68, 0.12)" },
  { name: "urgent", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.12)" },
  { name: "security", color: "#ec4899", bg: "rgba(236, 72, 153, 0.12)" },
  { name: "frontend", color: "#3b82f6", bg: "rgba(59, 130, 246, 0.12)" },
  { name: "backend", color: "#10b981", bg: "rgba(16, 185, 129, 0.12)" },
  { name: "performance", color: "#eab308", bg: "rgba(234, 179, 8, 0.12)" },
  { name: "proposal", color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.12)" },
  { name: "discussion", color: "#06b6d4", bg: "rgba(6, 182, 212, 0.12)" },
];

export const DashboardSidebarWidgets: React.FC<
  DashboardSidebarWidgetsProps
> = ({
  isVi,
  repositoriesList,
  waitingReviews,
  urgentCount = 0,
  pendingCount = 0,
  workspace,
}) => {
  const { tokens } = useThemeContext();
  const [, setLocation] = useLocation();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.2 }}>
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: "10px",
          backgroundColor: tokens.surface,
          border: `1px solid ${tokens.border}`,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FolderGit2 size={16} color={tokens.primary} />
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: tokens.textPrimary,
                fontSize: "0.875rem",
              }}
            >
              {isVi ? "Kho lưu trữ" : "Repositories"}
            </Typography>
            <Chip
              label={repositoriesList.length}
              size="small"
              sx={{ height: 18, fontSize: "0.625rem", fontWeight: 700 }}
            />
          </Box>

          <Button
            size="small"
            variant="text"
            startIcon={<Plus size={14} />}
            onClick={() => setLocation("/repositories")}
            sx={{
              fontSize: "0.72rem",
              p: 0,
              minWidth: "auto",
              textTransform: "none",
              fontWeight: 600,
              color: tokens.primary,
            }}
          >
            {isVi ? "Quản lý" : "Manage"}
          </Button>
        </Box>

        {repositoriesList.length === 0 ? (
          <Box sx={{ py: 2, textAlign: "center" }}>
            <Typography
              variant="caption"
              sx={{ color: tokens.textSecondary, display: "block", mb: 1 }}
            >
              {isVi
                ? "Chưa liên kết kho mã nguồn nào."
                : "No repositories linked yet."}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setLocation("/repositories")}
              sx={{ fontSize: "0.75rem", textTransform: "none" }}
            >
              {isVi ? "Liên kết GitHub" : "Link GitHub"}
            </Button>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8 }}>
            {repositoriesList.slice(0, 4).map((repo) => (
              <Box
                key={repo.id}
                onClick={() => setLocation(`/repositories`)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 0.9,
                  px: 1.1,
                  borderRadius: "6px",
                  backgroundColor: tokens.surfaceSecondary,
                  cursor: "pointer",
                  transition: "background-color 0.12s ease",
                  "&:hover": {
                    backgroundColor: tokens.hover,
                  },
                }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: tokens.textPrimary,
                      fontSize: "0.8125rem",
                    }}
                    noWrap
                  >
                    {repo.name}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.8,
                      mt: 0.2,
                    }}
                  >
                    <GitBranch size={11} color={tokens.textSecondary} />
                    <Typography
                      variant="caption"
                      sx={{
                        color: tokens.textSecondary,
                        fontSize: "0.6875rem",
                      }}
                    >
                      {repo.defaultBranch || "main"}
                    </Typography>
                  </Box>
                </Box>

                <Tooltip
                  title={repo.webUrl ? (isVi ? "Mở trên web" : "Open web") : ""}
                >
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (repo.webUrl) window.open(repo.webUrl, "_blank");
                    }}
                    sx={{ color: tokens.textSecondary, p: 0.5 }}
                  >
                    <ExternalLink size={13} />
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      {waitingReviews.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: "10px",
            backgroundColor: tokens.surface,
            border: `1px solid ${tokens.border}`,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 1.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Clock size={16} color="#f59e0b" />
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 700,
                  color: tokens.textPrimary,
                  fontSize: "0.875rem",
                }}
              >
                {isVi ? "Đang chờ đồng nghiệp duyệt" : "Waiting on Review"}
              </Typography>
              <Chip
                label={waitingReviews.length}
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.625rem",
                  fontWeight: 700,
                  backgroundColor: "rgba(245, 158, 11, 0.15)",
                  color: "#f59e0b",
                }}
              />
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8 }}>
            {waitingReviews.slice(0, 4).map((rev) => {
              const pendingReviewers = (rev.reviewers || []).filter(
                (r) => r.status === "PENDING",
              );
              return (
                <Box
                  key={rev.id}
                  onClick={() => setLocation(`/reviews/${rev.number}`)}
                  sx={{
                    p: 1.1,
                    borderRadius: "6px",
                    backgroundColor: tokens.surfaceSecondary,
                    cursor: "pointer",
                    transition: "all 0.12s ease",
                    "&:hover": {
                      backgroundColor: tokens.hover,
                    },
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: tokens.textPrimary,
                      fontSize: "0.8125rem",
                      lineHeight: 1.3,
                    }}
                    noWrap
                  >
                    #{rev.number} {rev.title}
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      mt: 0.6,
                    }}
                  >
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: tokens.textSecondary,
                          fontSize: "0.6875rem",
                        }}
                      >
                        {isVi ? "Người duyệt:" : "Reviewer:"}
                      </Typography>
                      {pendingReviewers.map((r) => (
                        <Tooltip key={r.user.id} title={`@${r.user.username}`}>
                          <span>
                            <UserAvatar
                              user={r.user}
                              size={18}
                              showTooltip={false}
                            />
                          </span>
                        </Tooltip>
                      ))}
                    </Box>

                    <Typography
                      variant="caption"
                      sx={{
                        color: tokens.textSecondary,
                        fontSize: "0.6875rem",
                      }}
                    >
                      {formatRelativeTime(rev.createdAt, isVi)}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Paper>
      )}

      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: "10px",
          backgroundColor: tokens.surface,
          border: `1px solid ${tokens.border}`,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1.2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Tag size={15} color={tokens.primary} />
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: tokens.textPrimary,
                fontSize: "0.875rem",
              }}
            >
              {isVi ? "Chủ đề & Nhãn phổ biến" : "Trending Tags"}
            </Typography>
          </Box>
          <Button
            size="small"
            variant="text"
            onClick={() => setLocation("/issues")}
            sx={{
              fontSize: "0.72rem",
              p: 0,
              minWidth: "auto",
              textTransform: "none",
              fontWeight: 600,
              color: tokens.primary,
            }}
          >
            {isVi ? "Tất cả" : "All"}
          </Button>
        </Box>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
          {POPULAR_TAGS.map((tag) => (
            <Chip
              key={tag.name}
              label={`#${tag.name}`}
              size="small"
              onClick={() =>
                setLocation(`/issues?search=${encodeURIComponent(tag.name)}`)
              }
              sx={{
                height: 22,
                fontSize: "0.72rem",
                fontWeight: 600,
                backgroundColor: tag.bg,
                color: tag.color,
                border: `1px solid ${tag.color}33`,
                cursor: "pointer",
                transition: "all 0.12s ease",
                "&:hover": {
                  opacity: 0.85,
                  transform: "translateY(-1px)",
                },
              }}
            />
          ))}
        </Box>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: "10px",
          backgroundColor: tokens.surface,
          border: `1px solid ${tokens.border}`,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 1.5 }}>
          <Box
            sx={{
              display: "inline-flex",
              p: 0.6,
              borderRadius: "6px",
              backgroundColor: tokens.selected,
              color: tokens.primary,
            }}
          >
            <Keyboard size={15} color={tokens.primary} />
          </Box>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              color: tokens.textPrimary,
              fontSize: "0.875rem",
            }}
          >
            {isVi ? "Phím tắt" : "Shortcuts"}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.9 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.75rem",
            }}
          >
            <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
              {isVi ? "Tìm kiếm thông minh" : "Command palette"}
            </Typography>
            <Chip
              label="Ctrl + K"
              size="small"
              sx={{
                height: 20,
                fontSize: "0.65rem",
                fontFamily: "monospace",
                fontWeight: 700,
                backgroundColor: tokens.surfaceSecondary,
                color: tokens.primary,
                border: `1px solid ${tokens.border}`,
              }}
            />
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.75rem",
            }}
          >
            <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
              {isVi ? "Đóng / Mở Left Sidebar" : "Toggle sidebar"}
            </Typography>
            <Chip
              label="Ctrl + B"
              size="small"
              sx={{
                height: 20,
                fontSize: "0.65rem",
                fontFamily: "monospace",
                fontWeight: 700,
                backgroundColor: tokens.surfaceSecondary,
                color: tokens.primary,
                border: `1px solid ${tokens.border}`,
              }}
            />
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.75rem",
            }}
          >
            <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
              {isVi ? "Danh sách Issues" : "Go to Issues"}
            </Typography>
            <Chip
              label="/issues"
              size="small"
              sx={{
                height: 20,
                fontSize: "0.65rem",
                fontFamily: "monospace",
                fontWeight: 700,
                backgroundColor: tokens.surfaceSecondary,
                color: tokens.textPrimary,
                border: `1px solid ${tokens.border}`,
              }}
            />
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.75rem",
            }}
          >
            <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
              {isVi ? "Yêu cầu Code Review" : "Go to Reviews"}
            </Typography>
            <Chip
              label="/reviews"
              size="small"
              sx={{
                height: 20,
                fontSize: "0.65rem",
                fontFamily: "monospace",
                fontWeight: 700,
                backgroundColor: tokens.surfaceSecondary,
                color: tokens.textPrimary,
                border: `1px solid ${tokens.border}`,
              }}
            />
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontSize: "0.75rem",
            }}
          >
            <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
              {isVi ? "Bảng tin thảo luận" : "Go to Feed"}
            </Typography>
            <Chip
              label="/posts"
              size="small"
              sx={{
                height: 20,
                fontSize: "0.65rem",
                fontFamily: "monospace",
                fontWeight: 700,
                backgroundColor: tokens.surfaceSecondary,
                color: tokens.textPrimary,
                border: `1px solid ${tokens.border}`,
              }}
            />
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};
