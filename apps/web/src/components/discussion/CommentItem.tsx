import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Button,
  Tooltip,
  Menu,
  MenuItem,
} from "@mui/material";
import { ChevronDown, ChevronUp, EyeOff, Flag, Link as LinkIcon, MoreHorizontal, Reply, Quote, Edit2, Trash2, Smile } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { MarkdownRenderer } from "../markdown/MarkdownRenderer";
import { MarkdownEditor } from "../editor/MarkdownEditor";
import { useThemeContext } from "../../contexts/ThemeContext";
import { useAuthContext } from "../../contexts/AuthContext";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { TranslationKey, useI18n } from "../../contexts/I18nContext";
import { CommentDto, CommentHideReason, ReactionType } from "@reported/contracts";
import { apiFetch } from "../../api/client";

interface CommentItemProps {
  comment: CommentDto;
  onRefresh: () => void;
  onQuote: (quoteText: string) => void;
  isNested?: boolean;
  readOnly?: boolean;
}

const AVAILABLE_REACTIONS: Array<{ type: ReactionType; emoji: string }> = [
  { type: ReactionType.LIKE, emoji: "👍" },
  { type: ReactionType.DISLIKE, emoji: "👎" },
  { type: ReactionType.HEART, emoji: "❤️" },
  { type: ReactionType.HOORAY, emoji: "🎉" },
  { type: ReactionType.ROCKET, emoji: "🚀" },
  { type: ReactionType.EYES, emoji: "👀" },
  { type: ReactionType.FIRE, emoji: "🔥" },
  { type: ReactionType.USEFUL, emoji: "💡" },
  { type: ReactionType.AGREE, emoji: "✅" },
  { type: ReactionType.DISAGREE, emoji: "❌" },
  { type: ReactionType.BUG, emoji: "🐛" },
  { type: ReactionType.CONFUSED, emoji: "😕" },
];

const REACTION_EMOJIS: Record<string, string> = {
  [ReactionType.LIKE]: "👍",
  [ReactionType.DISLIKE]: "👎",
  [ReactionType.HEART]: "❤️",
  [ReactionType.HOORAY]: "🎉",
  [ReactionType.ROCKET]: "🚀",
  [ReactionType.EYES]: "👀",
  [ReactionType.FIRE]: "🔥",
  [ReactionType.USEFUL]: "💡",
  [ReactionType.AGREE]: "✅",
  [ReactionType.DISAGREE]: "❌",
  [ReactionType.BUG]: "🐛",
  [ReactionType.CONFUSED]: "😕",
};

const HIDE_REASONS = Object.values(CommentHideReason);

const COLLAPSE_CHARACTER_LIMIT = 2_000;
const COLLAPSE_LINE_LIMIT = 18;

function shouldCollapseComment(content: string) {
  return content.length > COLLAPSE_CHARACTER_LIMIT || content.split("\n").length > COLLAPSE_LINE_LIMIT;
}

function relativeTime(value: string, isVi: boolean) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  const units = seconds < 60 ? [seconds, "giây", "second"] : seconds < 3600 ? [Math.floor(seconds / 60), "phút", "minute"] : seconds < 86400 ? [Math.floor(seconds / 3600), "giờ", "hour"] : [Math.floor(seconds / 86400), "ngày", "day"];
  const [amount, vi, en] = units as [number, string, string];
  return isVi ? `${amount} ${vi} trước` : `${amount} ${en}${amount === 1 ? "" : "s"} ago`;
}

const CommentItemComponent: React.FC<CommentItemProps> = ({
  comment,
  onRefresh,
  onQuote,
  isNested = false,
  readOnly = false,
}) => {
  const { tokens, resolvedMode } = useThemeContext();
  const { user } = useAuthContext();
  const { activeWorkspace } = useWorkspace();
  const { t, language } = useI18n();

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [reactionAnchor, setReactionAnchor] = useState<null | HTMLElement>(
    null,
  );
  const [moderationAnchor, setModerationAnchor] = useState<null | HTMLElement>(null);
  const isLongComment = useMemo(() => shouldCollapseComment(comment.content), [comment.content]);
  const [isExpanded, setIsExpanded] = useState(() => !shouldCollapseComment(comment.content));

  const isLeader =
    activeWorkspace?.role === "OWNER" ||
    activeWorkspace?.role === "ADMIN" ||
    user?.role === "ADMIN";
  const canModify = user && (user.id === comment.author.id || isLeader);
  const canModerate = Boolean(isLeader);
  const isVi = language === "vi";
  const hideReasonLabel = (reason?: CommentHideReason | null) => {
    const key = ({
      [CommentHideReason.OFF_TOPIC]: "hideAsOffTopic",
      [CommentHideReason.OUTDATED]: "hideAsOutdated",
      [CommentHideReason.DUPLICATE]: "hideAsDuplicate",
      [CommentHideReason.RESOLVED]: "hideAsResolved",
      [CommentHideReason.SPAM]: "hideAsSpam",
      [CommentHideReason.ABUSE]: "hideAsAbuse",
    }[reason || CommentHideReason.OFF_TOPIC] || "hideAsOffTopic") as TranslationKey;
    return t(key);
  };
  const reactionLabel = (reaction: ReactionType) => {
    const key = ({
      [ReactionType.LIKE]: "reactionLike",
      [ReactionType.DISLIKE]: "reactionDislike",
      [ReactionType.HEART]: "reactionLove",
      [ReactionType.HOORAY]: "reactionHooray",
      [ReactionType.ROCKET]: "reactionRocket",
      [ReactionType.EYES]: "reactionEyes",
      [ReactionType.FIRE]: "reactionFire",
      [ReactionType.USEFUL]: "reactionIdea",
      [ReactionType.AGREE]: "reactionAgree",
      [ReactionType.DISAGREE]: "reactionDisagree",
      [ReactionType.BUG]: "reactionBug",
      [ReactionType.CONFUSED]: "reactionConfused",
    }[reaction] || "reactionLike") as TranslationKey;
    return t(key);
  };

  const handleToggleReaction = async (reaction: ReactionType | string) => {
    setReactionAnchor(null);
    try {
      await apiFetch(`/comments/${comment.id}/reactions`, {
        method: "POST",
        body: JSON.stringify({ reaction }),
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim()) return;
    try {
      await apiFetch(`/comments/${comment.id}`, {
        method: "PATCH",
        body: JSON.stringify({ content: editContent }),
      });
      setIsEditing(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!confirm(t("confirmDeleteComment"))) return;
    try {
      await apiFetch(`/comments/${comment.id}`, { method: "DELETE" });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleVisibility = async (hidden: boolean, reason?: CommentHideReason) => {
    setModerationAnchor(null);
    try {
      await apiFetch(`/comments/${comment.id}/visibility`, {
        method: "PATCH",
        body: JSON.stringify({ hidden, reason }),
      });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitReply = async () => {
    if (!replyContent.trim()) return;
    try {
      await apiFetch("/comments", {
        method: "POST",
        body: JSON.stringify({
          targetType: comment.targetType,
          targetId: comment.targetId,
          parentId: comment.id,
          content: replyContent,
        }),
      });
      setReplyContent("");
      setIsReplying(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Box
      id={`comment-${comment.id}`}
      sx={{
        my: 1.5,
        ml: isNested ? { xs: 1.5, sm: 3.5 } : 0,
        position: "relative",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
      }}
    >
      <Box
        sx={{
          borderRadius: "8px",
          border: `1px solid ${tokens.border}`,
          backgroundColor: tokens.surface,
          overflow: "hidden",
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
          transition: "border-color 0.15s ease",
          "&:hover": {
            borderColor: tokens.primary,
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: tokens.surfaceSecondary,
            borderBottom: `1px solid ${tokens.border}`,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <UserAvatar user={comment.author} size={22} />
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: tokens.textPrimary,
                fontSize: "0.84rem",
              }}
            >
              {comment.author.displayName}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: tokens.textSecondary, fontSize: "0.78rem" }}
            >
              @{comment.author.username}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: tokens.textSecondary, fontSize: "0.75rem" }}
            >
              • <Tooltip title={new Date(comment.createdAt).toLocaleString()}><span>{relativeTime(comment.createdAt, isVi)}</span></Tooltip>
              {comment.updatedAt !== comment.createdAt && <span> · {isVi ? "đã chỉnh sửa" : "edited"}</span>}
            </Typography>
          </Box>

          {!comment.isDeleted && !readOnly && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.2 }}>
              <Tooltip title={isVi ? "Sao chép liên kết" : "Copy link"}>
                <IconButton size="small" onClick={() => navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}#comment-${comment.id}`)} sx={{ color: tokens.textSecondary, p: 0.6 }}>
                  <LinkIcon size={14} />
                </IconButton>
              </Tooltip>
              <Tooltip title={t("quoteReply")}>
                <IconButton
                  size="small"
                  onClick={() => {
                    const cleanBody = comment.content
                      .trim()
                      .split("\n")
                      .map((l) => `> ${l}`)
                      .join("\n");
                    onQuote(`${cleanBody}\n\n@${comment.author.username} `);
                  }}
                  sx={{ color: tokens.textSecondary, p: 0.6 }}
                >
                  <Quote size={14} />
                </IconButton>
              </Tooltip>

              {!isNested && (
                <Tooltip title={t("reply")}>
                  <IconButton
                    size="small"
                    onClick={() => setIsReplying(!isReplying)}
                    sx={{ color: tokens.textSecondary, p: 0.6 }}
                  >
                    <Reply size={14} />
                  </IconButton>
                </Tooltip>
              )}

              {canModify && (
                <>
                  <Tooltip title={t("editComment")}>
                    <IconButton
                      size="small"
                      onClick={() => setIsEditing(!isEditing)}
                      sx={{ color: tokens.textSecondary, p: 0.6 }}
                    >
                      <Edit2 size={14} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t("deleteComment")}>
                    <IconButton
                      size="small"
                      onClick={handleDelete}
                      sx={{ color: tokens.textSecondary, p: 0.6 }}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </Tooltip>
                </>
              )}
              {canModerate && (
                <>
                  <Tooltip title={t("moderateComment")}>
                    <IconButton
                      size="small"
                      onClick={(event) => setModerationAnchor(event.currentTarget)}
                      sx={{ color: tokens.textSecondary, p: 0.6 }}
                    >
                      <MoreHorizontal size={15} />
                    </IconButton>
                  </Tooltip>
                  <Menu
                    anchorEl={moderationAnchor}
                    open={Boolean(moderationAnchor)}
                    onClose={() => setModerationAnchor(null)}
                    PaperProps={{
                      sx: {
                        minWidth: 190,
                        borderRadius: "8px",
                        backgroundColor: tokens.surface,
                        border: `1px solid ${tokens.border}`,
                      },
                    }}
                  >
                    {comment.isHidden ? (
                      <MenuItem onClick={() => handleVisibility(false)}>
                        <EyeOff size={15} style={{ marginRight: 8 }} /> {t("showComment")}
                      </MenuItem>
                    ) : (
                      HIDE_REASONS.map((reason) => (
                        <MenuItem key={reason} onClick={() => handleVisibility(true, reason)}>
                          <Flag size={15} style={{ marginRight: 8 }} /> {hideReasonLabel(reason)}
                        </MenuItem>
                      ))
                    )}
                  </Menu>
                </>
              )}
            </Box>
          )}
        </Box>

        <Box sx={{ p: { xs: 1.5, sm: 2 }, minWidth: 0, maxWidth: "100%", overflow: "hidden", boxSizing: "border-box" }}>
          {comment.isDeleted ? (
            <Typography
              variant="body2"
              sx={{ fontStyle: "italic", color: tokens.textSecondary }}
            >
              [{t("commentDeleted")}]
            </Typography>
          ) : comment.isHidden ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                color: tokens.textSecondary,
                fontSize: "0.84rem",
              }}
            >
              <EyeOff size={16} />
              <span>{t("commentHiddenAs")} {hideReasonLabel(comment.hiddenReason)}.</span>
            </Box>
          ) : isEditing ? (
            <Box>
              <MarkdownEditor
                value={editContent}
                onChange={setEditContent}
                targetType={comment.targetType}
                targetId={comment.targetId}
                minRows={3}
              />
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  mt: 1.5,
                  justifyContent: "flex-end",
                }}
              >
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setIsEditing(false)}
                >
                  {t("cancelBtn")}
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleSaveEdit}
                >
                  {t("saveBtn")}
                </Button>
              </Box>
            </Box>
          ) : isLongComment && !isExpanded ? (
            <Box>
              <Box sx={{ position: "relative", maxHeight: 300, overflow: "hidden" }}>
                <MarkdownRenderer content={comment.content} />
                <Box
                  aria-hidden
                  sx={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: 72,
                    background: `linear-gradient(transparent, ${tokens.surface})`,
                    pointerEvents: "none",
                  }}
                />
              </Box>
              <Button
                size="small"
                onClick={() => setIsExpanded(true)}
                endIcon={<ChevronDown size={14} />}
                sx={{ mt: 1, textTransform: "none", fontWeight: 700 }}
              >
                {t("showMore")}
              </Button>
            </Box>
          ) : (
            <>
              <MarkdownRenderer content={comment.content} />
              {isLongComment && (
                <Button
                  size="small"
                  onClick={() => setIsExpanded(false)}
                  endIcon={<ChevronUp size={14} />}
                  sx={{ mt: 1, textTransform: "none", fontWeight: 700 }}
                >
                  {t("showLess")}
                </Button>
              )}
            </>
          )}
        </Box>

        {!comment.isDeleted && !comment.isHidden && !readOnly && (
          <Box
            sx={{
              px: 2,
              pb: 1.5,
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 0.6,
            }}
          >
            {comment.reactions &&
              comment.reactions.map((r) => (
                <Tooltip
                  key={r.reaction}
                  title={`${r.users.map((u) => u.displayName).join(", ")} (${r.reaction})`}
                >
                  <Box
                    onClick={() => handleToggleReaction(r.reaction)}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.5,
                      px: 0.8,
                      py: 0.25,
                      borderRadius: "12px",
                      backgroundColor: r.hasReacted
                        ? tokens.selected
                        : tokens.surfaceSecondary,
                      border: `1px solid ${r.hasReacted ? tokens.primary : tokens.border}`,
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      userSelect: "none",
                      transition: "all 0.12s ease",
                      "&:hover": {
                        backgroundColor: tokens.hover,
                        borderColor: tokens.primary,
                      },
                    }}
                  >
                    <span>{REACTION_EMOJIS[r.reaction]}</span>
                    <span
                      style={{
                        color: r.hasReacted
                          ? tokens.primary
                          : tokens.textSecondary,
                        fontSize: "0.72rem",
                      }}
                    >
                      {r.count}
                    </span>
                  </Box>
                </Tooltip>
              ))}

            <Tooltip title={t("addReaction")}>
              <Box
                onClick={(e) => setReactionAnchor(e.currentTarget)}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.4,
                  px: 0.8,
                  py: 0.25,
                  borderRadius: "12px",
                  backgroundColor: "transparent",
                  border: `1px dashed ${tokens.border}`,
                  cursor: "pointer",
                  fontSize: "0.72rem",
                  color: tokens.textSecondary,
                  userSelect: "none",
                  transition: "all 0.15s ease",
                  "&:hover": {
                    borderColor: tokens.primary,
                    color: tokens.primary,
                    backgroundColor: tokens.hover,
                  },
                }}
              >
                <Smile size={13} />
                <span>{t("react")}</span>
              </Box>
            </Tooltip>

            <Menu
              anchorEl={reactionAnchor}
              open={Boolean(reactionAnchor)}
              onClose={() => setReactionAnchor(null)}
              PaperProps={{
                sx: {
                  p: 0.5,
                  borderRadius: "12px",
                  backgroundColor: tokens.surface,
                  border: `1px solid ${tokens.border}`,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
                },
              }}
              transformOrigin={{ horizontal: "left", vertical: "top" }}
              anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(6, 1fr)",
                  gap: 0.5,
                  p: 0.5,
                }}
              >
                {AVAILABLE_REACTIONS.map((item) => (
                  <Tooltip key={item.type} title={reactionLabel(item.type)}>
                    <Box
                      onClick={() => handleToggleReaction(item.type)}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 34,
                        height: 34,
                        fontSize: "1.25rem",
                        borderRadius: "8px",
                        cursor: "pointer",
                        transition: "transform 0.1s, background-color 0.1s",
                        "&:hover": {
                          backgroundColor: tokens.hover,
                          transform: "scale(1.2)",
                        },
                      }}
                    >
                      {item.emoji}
                    </Box>
                  </Tooltip>
                ))}
              </Box>
            </Menu>
          </Box>
        )}
      </Box>

      {isReplying && !readOnly && (
        <Box sx={{ mt: 1.5, ml: { xs: 1, sm: 3 } }}>
          <MarkdownEditor
            value={replyContent}
            onChange={setReplyContent}
            targetType={comment.targetType}
            targetId={comment.targetId}
            placeholder={`${t("replyTo")} @${comment.author.username}...`}
            minRows={2}
            onSubmit={handleSubmitReply}
          />
          <Box
            sx={{ display: "flex", gap: 1, mt: 1, justifyContent: "flex-end" }}
          >
            <Button
              size="small"
              variant="text"
              onClick={() => setIsReplying(false)}
            >
              {t("cancelBtn")}
            </Button>
            <Button
              size="small"
              variant="contained"
              onClick={handleSubmitReply}
            >
              {t("submitReply")}
            </Button>
          </Box>
        </Box>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <Box sx={{ mt: 1 }}>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onRefresh={onRefresh}
              onQuote={onQuote}
              isNested={true}
              readOnly={readOnly}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export const CommentItem = React.memo(CommentItemComponent);
