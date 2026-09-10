import React, { useState, useEffect, useCallback } from "react";
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
  Tooltip,
} from "@mui/material";
import {
  Search,
  Plus,
  MessageSquare,
  GitPullRequest,
  Bug,
  Eye,
  HelpCircle,
  Lightbulb,
} from "lucide-react";
import { useLocation } from "wouter";
import { useThemeContext } from "../contexts/ThemeContext";
import { useAuthContext } from "../contexts/AuthContext";
import { useI18n } from "../contexts/I18nContext";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { PostFeedSkeleton } from "../components/common/Skeletons";
import { UserAvatar } from "../components/common/UserAvatar";
import { NewPostModal } from "../components/common/NewPostModal";
import { apiFetch } from "../api/client";
import { IssueDto, ReviewDetailDto, IssueType } from "@reported/contracts";

interface FeedItem {
  id: string;
  kind: "issue" | "review";
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
  if (diffSec < 60) return isVi ? "vừa xong" : "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return isVi ? `${diffMin} phút trước` : `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return isVi ? `${diffHour} giờ trước` : `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return isVi ? `${diffDay} ngày trước` : `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export const PostFeedPage: React.FC = () => {
  const { tokens } = useThemeContext();
  const { user } = useAuthContext();
  const { activeWorkspace } = useWorkspace();
  const { language } = useI18n();
  const [, setLocation] = useLocation();
  const isVi = language === "vi";
  const [loading, setLoading] = useState(true);
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "all" | "bugs" | "reviews" | "questions" | "ideas"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [items, setItems] = useState<FeedItem[]>([]);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const [issuesRes, reviewsRes] = await Promise.all([
        apiFetch<{ data: IssueDto[] }>("/issues?sortBy=updated&limit=40"),
        apiFetch<{ data: ReviewDetailDto[] }>(
          "/reviews?sortBy=updated&limit=40",
        ),
      ]);

      const issueFeed: FeedItem[] = (issuesRes.data || []).map((iss) => ({
        id: iss.id,
        kind: "issue",
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
        link: `/issues/${iss.number}`,
      }));

      const reviewFeed: FeedItem[] = (reviewsRes.data || []).map((rev) => ({
        id: rev.id,
        kind: "review",
        type: "REVIEW",
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
        link: `/reviews/${rev.number}`,
      }));

      const combined = [...issueFeed, ...reviewFeed].sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );

      setItems(combined);
    } catch (err) {
      console.error("Failed to load feed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const filteredItems = items.filter((item) => {
    if (
      activeTab === "bugs" &&
      item.type !== IssueType.BUG &&
      item.type !== "BUG"
    )
      return false;
    if (activeTab === "reviews" && item.kind !== "review") return false;
    if (
      activeTab === "questions" &&
      item.type !== IssueType.TASK &&
      item.type !== "QUESTION"
    )
      return false;
    if (
      activeTab === "ideas" &&
      item.type !== IssueType.FEATURE &&
      item.type !== "IDEA"
    )
      return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchAuthor = (item.author.displayName || item.author.username)
        .toLowerCase()
        .includes(q);
      const matchNumber = String(item.number).includes(q);
      if (!matchTitle && !matchAuthor && !matchNumber) return false;
    }

    return true;
  });

  return (
    <Box sx={{ width: "100%", pb: 8 }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ mb: 1.5 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 800,
              letterSpacing: "-0.025em",
              color: tokens.textPrimary,
              display: "flex",
              alignItems: "center",
              gap: 1.2,
            }}
          >
            {isVi ? "Bài thảo luận kỹ thuật" : "Engineering Posts"}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: tokens.textSecondary, mt: 0.3 }}
          >
            {isVi
              ? "Theo dõi và thảo luận toàn bộ các vấn đề kỹ thuật, bug và review pull request"
              : "Track and discuss technical issues, bugs, and pull request reviews"}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: { xs: "flex-start", sm: "space-between" },
            gap: 1.5,
            flexWrap: "wrap",
          }}
        >
          <Typography
            variant="body2"
            sx={{
              color: tokens.textSecondary,
              fontWeight: 500,
              whiteSpace: "nowrap",
            }}
          >
            {filteredItems.length} {isVi ? "bài thảo luận" : "posts"}
          </Typography>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.2,
              flexWrap: "wrap",
              width: { xs: "100%", sm: "auto" },
              justifyContent: { xs: "flex-start", sm: "flex-end" },
            }}
          >
            <Button
              variant="contained"
              size="small"
              startIcon={<Plus size={16} />}
              onClick={() => setNewPostOpen(true)}
              sx={{
                backgroundColor: tokens.primary,
                borderRadius: "8px",
                textTransform: "none",
                fontWeight: 600,
                px: 2,
                py: 0.8,
                fontSize: "0.8125rem",
                boxShadow: "none",
                whiteSpace: "nowrap",
                "&:hover": {
                  backgroundColor: tokens.primaryHover,
                },
              }}
            >
              {isVi ? "Đăng bài mới" : "New Post"}
            </Button>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justifyContent: "space-between",
          alignItems: { md: "center" },
          gap: 2,
          mb: 2.5,
          borderBottom: `1px solid ${tokens.divider}`,
          pb: 1.5,
        }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          textColor="primary"
          indicatorColor="primary"
          sx={{
            minHeight: 36,
            maxWidth: "100%",
            "& .MuiTab-root": {
              minHeight: 36,
              py: 0.5,
              px: 1.8,
              fontSize: "0.84rem",
              fontWeight: 700,
              textTransform: "none",
              whiteSpace: "nowrap",
            },
          }}
        >
          <Tab label={isVi ? "Tất cả" : "All"} value="all" />
          <Tab
            label={
              <Box
                component="span"
                sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
              >
                <Bug size={14} />
                {isVi ? "Lỗi (Bugs)" : "Bugs"}
              </Box>
            }
            value="bugs"
          />
          <Tab
            label={
              <Box
                component="span"
                sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
              >
                <Eye size={14} />
                {isVi ? "Review PR" : "Reviews"}
              </Box>
            }
            value="reviews"
          />
          <Tab
            label={
              <Box
                component="span"
                sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
              >
                <HelpCircle size={14} />
                {isVi ? "Câu hỏi" : "Questions"}
              </Box>
            }
            value="questions"
          />
          <Tab
            label={
              <Box
                component="span"
                sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
              >
                <Lightbulb size={14} />
                {isVi ? "Ý tưởng" : "Ideas"}
              </Box>
            }
            value="ideas"
          />
        </Tabs>

        <TextField
          size="small"
          placeholder={
            isVi
              ? "Tìm kiếm tiêu đề, mã số, tác giả..."
              : "Filter posts by title or author..."
          }
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} color={tokens.textSecondary} />
              </InputAdornment>
            ),
          }}
          sx={{
            width: { xs: "100%", md: 280 },
            "& .MuiOutlinedInput-root": {
              borderRadius: "8px",
              backgroundColor: tokens.surfaceSecondary,
            },
          }}
        />
      </Box>

      {loading ? (
        <PostFeedSkeleton count={5} />
      ) : filteredItems.length === 0 ? (
        <Card
          sx={{
            p: 6,
            textAlign: "center",
            backgroundColor: tokens.surfaceSecondary,
            border: `1px solid ${tokens.border}`,
            borderRadius: "8px",
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, color: tokens.textPrimary, mb: 0.5 }}
          >
            {isVi
              ? "Không tìm thấy bài viết nào"
              : "No posts match your filters"}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: tokens.textSecondary, mb: 2 }}
          >
            {isVi
              ? "Hãy thử thay đổi từ khóa tìm kiếm hoặc đăng một bài viết mới."
              : "Try tweaking your search keywords or start a new conversation."}
          </Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<Plus size={16} />}
            onClick={() => setNewPostOpen(true)}
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              backgroundColor: tokens.primary,
            }}
          >
            {isVi ? "Đăng bài mới ngay" : "Post now"}
          </Button>
        </Card>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            backgroundColor: tokens.surface,
            borderRadius: "8px",
            border: `1px solid ${tokens.border}`,
            overflow: "hidden",
          }}
        >
          {filteredItems.map((item, idx) => {
            const isBug = item.type === IssueType.BUG || item.type === "BUG";
            const isReview = item.kind === "review";
            const isQuestion =
              item.type === IssueType.TASK || item.type === "QUESTION";
            const isIdea =
              item.type === IssueType.FEATURE || item.type === "IDEA";

            let badgeColor = "#6366f1";
            let badgeLabel = item.type || "POST";
            if (isBug) {
              badgeColor = "#ef4444";
              badgeLabel = "BUG";
            } else if (isReview) {
              badgeColor = "#a855f7";
              badgeLabel = "REVIEW";
            } else if (isQuestion) {
              badgeColor = "#3b82f6";
              badgeLabel = "QUESTION";
            } else if (isIdea) {
              badgeColor = "#10b981";
              badgeLabel = "IDEA";
            }

            return (
              <Box
                key={`${item.kind}-${item.id}`}
                onClick={() => setLocation(item.link)}
                sx={{
                  minHeight: 74,
                  py: { xs: 1.5, sm: 1.8 },
                  px: { xs: 1.8, sm: 2.5 },
                  borderBottom:
                    idx < filteredItems.length - 1
                      ? `1px solid ${tokens.divider}`
                      : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                  cursor: "pointer",
                  transition: "background-color 0.12s ease",
                  "&:hover": {
                    backgroundColor: tokens.hover,
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <Chip
                    label={badgeLabel}
                    size="small"
                    sx={{
                      height: 24,
                      width: 90,
                      minWidth: 90,
                      maxWidth: 90,
                      fontSize: "0.6875rem",
                      fontWeight: 800,
                      backgroundColor: `${badgeColor}18`,
                      color: badgeColor,
                      border: `1px solid ${badgeColor}35`,
                      borderRadius: "6px",
                      flexShrink: 0,
                      justifyContent: "center",
                      "& .MuiChip-label": {
                        px: 0,
                        textAlign: "center",
                        width: "100%",
                      },
                    }}
                  />

                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        minWidth: 0,
                        mb: 0.5,
                      }}
                    >
                      <Tooltip
                        title={`#${item.number} - ${item.title}`}
                        placement="top-start"
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color: tokens.textPrimary,
                            fontSize: "0.92rem",
                            lineHeight: 1.35,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            minWidth: 0,
                            flex: 1,
                          }}
                        >
                          <span
                            style={{
                              color: tokens.textSecondary,
                              marginRight: 8,
                              minWidth: 42,
                              display: "inline-block",
                              fontWeight: 500,
                              fontFamily: "monospace",
                            }}
                          >
                            #{item.number}
                          </span>
                          {item.title}
                        </Typography>
                      </Tooltip>

                      {item.prNumber && (
                        <Chip
                          icon={<GitPullRequest size={12} />}
                          label={`PR #${item.prNumber}`}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: "0.65rem",
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        />
                      )}

                      {item.labels && item.labels.length > 0 && (
                        <Box
                          sx={{
                            display: { xs: "none", md: "flex" },
                            alignItems: "center",
                            gap: 0.6,
                            flexShrink: 0,
                          }}
                        >
                          {item.labels.slice(0, 2).map((l) => (
                            <Chip
                              key={l.name}
                              label={l.name}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: "0.6875rem",
                                fontWeight: 500,
                                backgroundColor: "transparent",
                                border: `1px solid ${tokens.border}`,
                                color: tokens.textSecondary,
                                whiteSpace: "nowrap",
                              }}
                            />
                          ))}
                          {item.labels.length > 2 && (
                            <Chip
                              label={`+${item.labels.length - 2}`}
                              sx={{
                                height: 20,
                                fontSize: "0.6875rem",
                                fontWeight: 600,
                                borderRadius: "5px",
                                backgroundColor: tokens.surfaceSecondary,
                                color: tokens.textSecondary,
                                border: `1px solid ${tokens.border}`,
                              }}
                            />
                          )}
                        </Box>
                      )}
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        fontSize: "0.75rem",
                        color: tokens.textSecondary,
                        minWidth: 0,
                        overflow: "hidden",
                        whiteSpace: "nowrap",
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
                        <UserAvatar
                          user={item.author}
                          size={18}
                          showTooltip={false}
                        />
                        <span>@{item.author.username}</span>
                      </Box>
                      <span style={{ flexShrink: 0 }}>
                        • {formatRelativeTime(item.createdAt, isVi)}
                      </span>
                    </Box>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    flexShrink: 0,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      color: tokens.textSecondary,
                      fontSize: "0.75rem",
                    }}
                  >
                    <MessageSquare size={14} />
                    <span>{item.commentsCount}</span>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      <NewPostModal
        open={newPostOpen}
        onClose={() => {
          setNewPostOpen(false);
          loadFeed();
        }}
      />
    </Box>
  );
};
