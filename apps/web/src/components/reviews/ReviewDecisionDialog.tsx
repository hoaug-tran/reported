import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  Paper,
} from "@mui/material";
import {
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
  Info,
} from "lucide-react";
import { ReviewerDecision } from "@reported/contracts";
import { apiFetch } from "../../api/client";
import { useThemeContext } from "../../contexts/ThemeContext";
import { useI18n } from "../../contexts/I18nContext";

interface ReviewDecisionDialogProps {
  open: boolean;
  reviewId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ReviewDecisionDialog: React.FC<ReviewDecisionDialogProps> = ({
  open,
  reviewId,
  onClose,
  onSuccess,
}) => {
  const { tokens, mode } = useThemeContext();
  const { language } = useI18n();
  const isVi = language === "vi";
  const isDark = mode === "dark";

  const [decision, setDecision] = useState<ReviewerDecision>(
    ReviewerDecision.APPROVED,
  );
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await apiFetch(`/reviews/${reviewId}/decision`, {
        method: "PATCH",
        body: JSON.stringify({
          decision,
          decisionNote: note || undefined,
        }),
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ||
            "Failed to submit review decision";
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const options = [
    {
      value: ReviewerDecision.APPROVED,
      title: isVi ? "Chấp thuận (Approve)" : "Approve",
      desc: isVi
        ? "Đồng ý với các thay đổi và cho phép merge/triển khai code."
        : "Submit feedback and approve merging or implementation.",
      icon: CheckCircle2,
      color: tokens.success,
      activeBg: isDark ? "rgba(63, 185, 80, 0.12)" : "rgba(46, 160, 67, 0.08)",
      activeBorder: tokens.success,
    },
    {
      value: ReviewerDecision.CHANGES_REQUESTED,
      title: isVi ? "Yêu cầu chỉnh sửa (Request Changes)" : "Request Changes",
      desc: isVi
        ? "Yêu cầu tác giả phải sửa các lỗi/vấn đề trước khi được duyệt."
        : "Submit feedback that must be addressed before approval.",
      icon: AlertCircle,
      color: tokens.error,
      activeBg: isDark ? "rgba(248, 81, 73, 0.12)" : "rgba(218, 54, 51, 0.08)",
      activeBorder: tokens.error,
    },
    {
      value: ReviewerDecision.COMMENTED,
      title: isVi ? "Chỉ bình luận (Comment)" : "Comment",
      desc: isVi
        ? "Chỉ nhận xét/góp ý thông thường mà không chặn/chấp thuận."
        : "Submit general feedback without explicit approval or rejection.",
      icon: MessageSquare,
      color: tokens.textSecondary,
      activeBg: isDark ? "rgba(56, 139, 253, 0.12)" : "rgba(9, 105, 218, 0.08)",
      activeBorder: tokens.primary,
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      PaperProps={{
        sx: {
          maxWidth: 480,
          borderRadius: "8px",
          backgroundColor: tokens.surface,
          backgroundImage: "none",
          border: `1px solid ${tokens.border}`,
          boxShadow: isDark
            ? "0 16px 36px rgba(0,0,0,0.5)"
            : "0 10px 25px rgba(0,0,0,0.1)",
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle
        sx={{ p: 2.5, pb: 2, borderBottom: `1px solid ${tokens.borderSubtle}` }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                fontSize: "0.98rem",
                color: tokens.textPrimary,
                lineHeight: 1.2,
              }}
            >
              {isVi ? "Gửi quyết định Review" : "Submit Review Decision"}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: tokens.textSecondary, fontSize: "0.76rem" }}
            >
              {isVi
                ? "Cập nhật tiến độ review nội bộ và gửi thông báo cho tác giả"
                : "Update internal review status and notify the author"}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 2.5, pt: "20px !important" }}>
        {error && (
          <Alert
            severity="error"
            sx={{ mb: 2, borderRadius: "6px", py: 0.5 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1.25,
            mt: 1.5,
            mb: 2.5,
          }}
        >
          {options.map((opt) => {
            const isSelected = decision === opt.value;
            const IconComponent = opt.icon;

            return (
              <Paper
                key={opt.value}
                onClick={() => setDecision(opt.value)}
                elevation={0}
                sx={{
                  p: 1.25,
                  px: 1.5,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1.25,
                  cursor: "pointer",
                  borderRadius: "6px",
                  transition: "all 0.15s ease",
                  backgroundColor: isSelected
                    ? opt.activeBg
                    : tokens.surfaceSecondary,
                  border: `1px solid ${isSelected ? opt.activeBorder : tokens.borderSubtle}`,
                  "&:hover": {
                    borderColor: isSelected ? opt.activeBorder : tokens.border,
                    backgroundColor: isSelected ? opt.activeBg : tokens.hover,
                  },
                }}
              >
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `1.5px solid ${isSelected ? opt.activeBorder : tokens.textMuted}`,
                    mt: 0.35,
                    flexShrink: 0,
                  }}
                >
                  {isSelected && (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: opt.activeBorder,
                      }}
                    />
                  )}
                </Box>

                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                    color: opt.color,
                    flexShrink: 0,
                  }}
                >
                  <IconComponent size={16} />
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: isSelected ? 700 : 600,
                      color: tokens.textPrimary,
                      fontSize: "0.86rem",
                      lineHeight: 1.3,
                    }}
                  >
                    {opt.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      color: tokens.textSecondary,
                      fontSize: "0.74rem",
                      mt: 0.25,
                      lineHeight: 1.35,
                    }}
                  >
                    {opt.desc}
                  </Typography>
                </Box>
              </Paper>
            );
          })}
        </Box>

        <TextField
          fullWidth
          multiline
          rows={2.5}
          label={
            isVi
              ? "Ghi chú quyết định (Không bắt buộc)"
              : "Decision Note (Optional)"
          }
          placeholder={
            isVi
              ? "Tóm tắt nhận xét hoặc giải thích lý do cho quyết định..."
              : "Leave a short note or summary of your decision..."
          }
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mt: 1.5,
            p: 1,
            px: 1.25,
            borderRadius: "6px",
            backgroundColor: isDark
              ? "rgba(56, 139, 253, 0.08)"
              : "rgba(9, 105, 218, 0.05)",
            border: `1px solid ${isDark ? "rgba(56, 139, 253, 0.15)" : "rgba(9, 105, 218, 0.12)"}`,
          }}
        >
          <Info size={14} color={tokens.primary} style={{ flexShrink: 0 }} />
          <Typography
            variant="caption"
            sx={{
              color: tokens.textSecondary,
              fontSize: "0.73rem",
              lineHeight: 1.35,
            }}
          >
            {isVi
              ? "Quyết định này áp dụng nội bộ trên Reported (không tự động merge PR trên GitHub)."
              : "This decision applies internally on Reported (it does not auto-merge the PR on GitHub)."}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 2.5,
          py: 2,
          borderTop: `1px solid ${tokens.borderSubtle}`,
          gap: 1.25,
        }}
      >
        <Button
          onClick={onClose}
          color="inherit"
          disabled={isSubmitting}
          sx={{
            textTransform: "none",
            px: 2.5,
            py: 0.85,
            borderRadius: "6px",
            fontWeight: 500,
            color: tokens.textSecondary,
          }}
        >
          {isVi ? "Hủy" : "Cancel"}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            px: 2.5,
            py: 0.85,
            borderRadius: "6px",
            minWidth: 125,
            boxShadow: "none",
            backgroundColor:
              decision === ReviewerDecision.APPROVED
                ? tokens.success
                : decision === ReviewerDecision.CHANGES_REQUESTED
                  ? tokens.error
                  : tokens.primary,
            "&:hover": {
              backgroundColor:
                decision === ReviewerDecision.APPROVED
                  ? tokens.success
                  : decision === ReviewerDecision.CHANGES_REQUESTED
                    ? tokens.error
                    : tokens.primary,
              boxShadow: "none",
              filter: "brightness(0.92)",
            },
          }}
        >
          {isSubmitting
            ? isVi
              ? "Đang gửi..."
              : "Submitting..."
            : decision === ReviewerDecision.APPROVED
              ? isVi
                ? "Chấp thuận Review"
                : "Approve Review"
              : decision === ReviewerDecision.CHANGES_REQUESTED
                ? isVi
                  ? "Yêu cầu sửa đổi"
                  : "Request Changes"
                : isVi
                  ? "Gửi nhận xét"
                  : "Submit Comment"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
