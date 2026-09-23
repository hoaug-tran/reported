import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  CircularProgress,
  IconButton,
  Divider,
} from "@mui/material";
import { History, X, Clock } from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { MarkdownRenderer } from "../markdown/MarkdownRenderer";
import { useThemeContext } from "../../contexts/ThemeContext";
import { useI18n } from "../../contexts/I18nContext";
import { apiFetch } from "../../api/client";
import { CommentEditHistoryDto } from "@reported/contracts";

interface CommentEditHistoryModalProps {
  open: boolean;
  onClose: () => void;
  commentId: string;
  currentContent: string;
}

export const CommentEditHistoryModal: React.FC<CommentEditHistoryModalProps> = ({
  open,
  onClose,
  commentId,
  currentContent,
}) => {
  const { tokens } = useThemeContext();
  const { language } = useI18n();
  const isVi = language === "vi";

  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<CommentEditHistoryDto[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!open || !commentId) return;
    setLoading(true);
    apiFetch<CommentEditHistoryDto[]>(`/comments/${commentId}/history`)
      .then((data) => {
        setHistory(data || []);
        if (data && data.length > 0) {
          setSelectedIndex(data.length - 1);
        }
      })
      .catch(() => {
        setHistory([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, commentId]);

  const selectedItem = history[selectedIndex];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "8px",
          backgroundColor: tokens.surface,
          border: `1px solid ${tokens.border}`,
          backgroundImage: "none",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 1.5,
          px: 2.5,
          borderBottom: `1px solid ${tokens.divider}`,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <History size={18} color={tokens.primary} />
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {isVi ? "Lịch sử chỉnh sửa bình luận" : "Comment Edit History"}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: tokens.textSecondary }}>
          <X size={16} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, minHeight: 320, maxHeight: 520, display: "flex" }}>
        {loading ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: 320,
            }}
          >
            <CircularProgress size={28} />
          </Box>
        ) : history.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              p: 4,
              color: tokens.textSecondary,
            }}
          >
            <Clock size={32} style={{ marginBottom: 12, opacity: 0.6 }} />
            <Typography variant="body2">
              {isVi
                ? "Không tìm thấy dữ liệu phiên bản cũ của bình luận này."
                : "No edit history records found for this comment."}
            </Typography>
            <Box
              sx={{
                mt: 2,
                p: 2,
                width: "100%",
                borderRadius: "6px",
                backgroundColor: tokens.surfaceSecondary,
                border: `1px solid ${tokens.border}`,
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 600, display: "block", mb: 1 }}>
                {isVi ? "Nội dung hiện tại:" : "Current content:"}
              </Typography>
              <MarkdownRenderer content={currentContent} />
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: "flex", width: "100%", height: "100%" }}>
            <Box
              sx={{
                width: 240,
                flexShrink: 0,
                borderRight: `1px solid ${tokens.divider}`,
                backgroundColor: tokens.surfaceSecondary,
                overflowY: "auto",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  px: 2,
                  py: 1.5,
                  display: "block",
                  fontWeight: 700,
                  color: tokens.textSecondary,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {isVi ? `Bản sửa (${history.length})` : `Revisions (${history.length})`}
              </Typography>
              <Divider />
              {history.map((rev, idx) => {
                const isSelected = idx === selectedIndex;
                const date = new Date(rev.createdAt);
                return (
                  <Box
                    key={rev.id}
                    onClick={() => setSelectedIndex(idx)}
                    sx={{
                      p: 1.5,
                      px: 2,
                      cursor: "pointer",
                      borderLeft: isSelected
                        ? `3px solid ${tokens.primary}`
                        : "3px solid transparent",
                      backgroundColor: isSelected ? tokens.hover : "transparent",
                      transition: "all 0.15s ease",
                      "&:hover": { backgroundColor: tokens.hover },
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                      <UserAvatar user={rev.editor} size={18} />
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 600,
                          color: tokens.textPrimary,
                          fontSize: "0.78rem",
                        }}
                        noWrap
                      >
                        {rev.editor.displayName}
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: tokens.textSecondary,
                        fontSize: "0.72rem",
                        display: "block",
                      }}
                    >
                      {isVi ? `Lần sửa #${idx + 1}` : `Revision #${idx + 1}`} •{" "}
                      {date.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Typography>
                  </Box>
                );
              })}
            </Box>

            <Box sx={{ flex: 1, p: 2.5, overflowY: "auto", minWidth: 0 }}>
              {selectedItem && (
                <Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      pb: 1.5,
                      mb: 2,
                      borderBottom: `1px solid ${tokens.divider}`,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <UserAvatar user={selectedItem.editor} size={22} />
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {selectedItem.editor.displayName}{" "}
                          <span style={{ color: tokens.textSecondary, fontWeight: 400 }}>
                            @{selectedItem.editor.username}
                          </span>
                        </Typography>
                        <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
                          {new Date(selectedItem.createdAt).toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        color: tokens.textSecondary,
                        display: "block",
                        mb: 1,
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                      }}
                    >
                      {isVi ? "Nội dung sau khi sửa:" : "Content after edit:"}
                    </Typography>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: "6px",
                        backgroundColor: tokens.surfaceSecondary,
                        border: `1px solid ${tokens.border}`,
                      }}
                    >
                      <MarkdownRenderer content={selectedItem.newContent} />
                    </Box>
                  </Box>

                  <Box>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        color: tokens.textSecondary,
                        display: "block",
                        mb: 1,
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                      }}
                    >
                      {isVi ? "Nội dung trước khi sửa:" : "Content before edit:"}
                    </Typography>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: "6px",
                        backgroundColor: tokens.surfaceSecondary,
                        border: `1px solid ${tokens.border}`,
                        opacity: 0.9,
                      }}
                    >
                      <MarkdownRenderer content={selectedItem.previousContent} />
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5, borderTop: `1px solid ${tokens.divider}` }}>
        <Button size="small" variant="outlined" onClick={onClose}>
          {isVi ? "Đóng" : "Close"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
