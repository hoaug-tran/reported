import React, { useState, useMemo } from "react";
import { Box, Typography, Button, Alert } from "@mui/material";
import { CommentItem } from "./CommentItem";
import { MarkdownEditor } from "../editor/MarkdownEditor";
import { ActivityTimeline } from "../timeline/ActivityTimeline";
import { useThemeContext } from "../../contexts/ThemeContext";
import { useAuthContext } from "../../contexts/AuthContext";
import { useI18n } from "../../contexts/I18nContext";
import {
  CommentDto,
  TargetType,
  ActivityTimelineDto,
} from "@reported/contracts";
import { apiFetch } from "../../api/client";

interface CommentThreadProps {
  targetType: TargetType;
  targetId: string;
  comments: CommentDto[];
  activities?: ActivityTimelineDto[];
  onRefresh: () => void;
  childrenBeforeEditor?: React.ReactNode;
}

export const CommentThread: React.FC<CommentThreadProps> = ({
  targetType,
  targetId,
  comments,
  activities = [],
  onRefresh,
  childrenBeforeEditor,
}) => {
  const { tokens } = useThemeContext();
  const { user } = useAuthContext();
  const { language } = useI18n();
  const isVi = language === "vi";

  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    setError(null);

    try {
      await apiFetch("/comments", {
        method: "POST",
        body: JSON.stringify({
          targetType,
          targetId,
          content: newComment,
        }),
      });
      setNewComment("");
      onRefresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : isVi
            ? "Không thể gửi bình luận"
            : "Failed to post comment",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuote = (quoteText: string) => {
    setNewComment((prev) => (prev ? `${prev}\n\n${quoteText}` : quoteText));
  };

  const timelineItems = useMemo(() => {
    const items: Array<
      | { type: "comment"; comment: CommentDto; createdAt: string }
      | { type: "activity"; activity: ActivityTimelineDto; createdAt: string }
    > = [];

    (comments || []).forEach((c) => {
      items.push({ type: "comment", comment: c, createdAt: c.createdAt });
    });

    const filteredActivities = (activities || []).filter(
      (act) => act.actionType !== "COMMENT_ADDED",
    );
    filteredActivities.forEach((a) => {
      items.push({ type: "activity", activity: a, createdAt: a.createdAt });
    });

    items.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    return items;
  }, [comments, activities]);

  return (
    <Box sx={{ mt: 3 }}>
      <Typography
        variant="h4"
        sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
      >
        <span>{isVi ? "Thảo luận" : "Discussion"}</span>
        <span
          style={{
            fontSize: "0.8125rem",
            color: tokens.textSecondary,
            fontWeight: 500,
          }}
        >
          ({comments.length})
        </span>
      </Typography>

      {timelineItems.length === 0 ? (
        <Box
          sx={{
            py: 3,
            textAlign: "center",
            color: tokens.textSecondary,
            fontStyle: "italic",
            fontSize: "0.875rem",
          }}
        >
          {isVi
            ? "Chưa có phản hồi nào. Bắt đầu thảo luận kỹ thuật bên dưới."
            : "No comments yet. Start the technical discussion below."}
        </Box>
      ) : (
        <Box sx={{ mb: 3 }}>
          {timelineItems.map((item, idx) => {
            if (item.type === "comment") {
              return (
                <CommentItem
                  key={item.comment.id}
                  comment={item.comment}
                  onRefresh={onRefresh}
                  onQuote={handleQuote}
                />
              );
            }
            return (
              <Box key={`act-${item.activity.id || idx}`} sx={{ my: 1.5 }}>
                <ActivityTimeline activities={[item.activity]} />
              </Box>
            );
          })}
        </Box>
      )}

      {childrenBeforeEditor}

      <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${tokens.divider}` }}>
        {user ? (
          <>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, mb: 1, color: tokens.textPrimary }}
            >
              {isVi ? "Thêm phản hồi" : "Add a response"}
            </Typography>

            {error && (
              <Alert
                severity="error"
                sx={{ mb: 1.5 }}
                onClose={() => setError(null)}
              >
                {error}
              </Alert>
            )}

            <MarkdownEditor
              value={newComment}
              onChange={setNewComment}
              targetType={targetType}
              targetId={targetId}
              placeholder={
                isVi
                  ? "Gửi phản hồi kỹ thuật, dán log, JSON, khối code hoặc gắn thẻ đồng nghiệp với @..."
                  : "Leave technical feedback, paste logs, JSON, code blocks, or tag colleagues with @..."
              }
              minRows={4}
              onSubmit={handleSubmit}
            />

            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1.5 }}>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={isSubmitting || !newComment.trim()}
              >
                {isSubmitting
                  ? isVi
                    ? "Đang gửi..."
                    : "Posting..."
                  : isVi
                    ? "Gửi bình luận"
                    : "Comment"}
              </Button>
            </Box>
          </>
        ) : (
          <Box
            sx={{
              p: 2,
              textAlign: "center",
              backgroundColor: tokens.surfaceSecondary,
              borderRadius: 1,
            }}
          >
            <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
              {isVi
                ? "Vui lòng đăng nhập để tham gia thảo luận này."
                : "Please sign in to participate in this discussion."}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};
