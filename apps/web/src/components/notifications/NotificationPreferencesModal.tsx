import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  Typography,
  Box,
  Alert,
  Chip,
  Divider,
} from "@mui/material";
import { NotificationType, NotificationChannel } from "@reported/contracts";
import { Bell, Monitor, Send, CheckCircle2 } from "lucide-react";
import { apiFetch } from "../../api/client";
import { useThemeContext } from "../../contexts/ThemeContext";
import { useI18n } from "../../contexts/I18nContext";
import {
  isDesktopNotificationSupported,
  getDesktopNotificationPermission,
  requestDesktopNotificationPermission,
  showDesktopNotification,
} from "../../utils/desktopNotification";

interface NotificationPreferencesModalProps {
  open: boolean;
  onClose: () => void;
}

const EVENT_LABELS: Record<string, { vi: string; en: string }> = {
  [NotificationType.MENTIONED]: {
    vi: "Khi ai đó nhắc đến (@mention) bạn trong bài viết hoặc bình luận",
    en: "When someone @mentions you in an issue, review, or comment",
  },
  [NotificationType.ASSIGNED]: {
    vi: "Khi bạn được phân công xử lý một issue hoặc nhiệm vụ",
    en: "When you are assigned to an issue or task",
  },
  [NotificationType.REVIEW_REQUESTED]: {
    vi: "Khi ai đó yêu cầu bạn xem xét mã nguồn (Review Request)",
    en: "When someone requests your review on code or architecture",
  },
  [NotificationType.COMMENTED]: {
    vi: "Khi có bình luận mới trong bài viết hoặc review bạn tham gia",
    en: "When someone comments on your issue or review request",
  },
  [NotificationType.ISSUE_STATUS_CHANGED]: {
    vi: "Khi trạng thái vấn đề thay đổi (Mở → Đang xử lý → Đã giải quyết)",
    en: "When the status of your issue changes (Open → In Progress → Resolved)",
  },
  [NotificationType.REVIEW_STATUS_CHANGED]: {
    vi: "Khi có quyết định review mới (Phê duyệt / Yêu cầu sửa đổi)",
    en: "When review request decision is submitted (Approved / Changes Requested)",
  },
};

const CHANNEL_LABELS: Record<NotificationChannel, { vi: string; en: string }> =
  {
    [NotificationChannel.IN_APP]: {
      vi: "Chỉ trong ứng dụng",
      en: "In-App Only",
    },
    [NotificationChannel.EMAIL]: { vi: "Chỉ qua Email", en: "Email Only" },
    [NotificationChannel.BOTH]: {
      vi: "Cả ứng dụng & Email",
      en: "Both (App & Email)",
    },
    [NotificationChannel.DISABLED]: { vi: "Tắt thông báo", en: "Disabled" },
  };

export const NotificationPreferencesModal: React.FC<
  NotificationPreferencesModalProps
> = ({ open, onClose }) => {
  const { tokens } = useThemeContext();
  const { language } = useI18n();
  const isVi = language === "vi";

  const [preferences, setPreferences] = useState<
    Record<string, NotificationChannel>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [desktopPermission, setDesktopPermission] = useState<string>(
    getDesktopNotificationPermission(),
  );

  useEffect(() => {
    if (!open) return;
    setDesktopPermission(getDesktopNotificationPermission());
    apiFetch<Record<string, NotificationChannel>>("/notifications/preferences")
      .then(setPreferences)
      .catch(console.error);
  }, [open]);

  const handleChannelChange = (
    eventType: string,
    channel: NotificationChannel,
  ) => {
    setPreferences((prev) => ({ ...prev, [eventType]: channel }));
  };

  const handleEnableDesktop = async () => {
    const perm = await requestDesktopNotificationPermission();
    setDesktopPermission(perm);
  };

  const handleTestDesktopNotification = () => {
    showDesktopNotification(
      isVi ? "Reported - Thông báo thử nghiệm" : "Reported - Test Notification",
      {
        body: isVi
          ? "Hệ thống thông báo đẩy trên máy tính đang hoạt động chính xác!"
          : "Desktop push notifications are working properly!",
      },
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiFetch("/notifications/preferences", {
        method: "PUT",
        body: JSON.stringify({ preferences }),
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

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
          fontWeight: 700,
          borderBottom: `1px solid ${tokens.border}`,
          pb: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Bell size={20} color={tokens.primary} />
        {isVi
          ? "Cài đặt Thông báo & Kênh gửi tin"
          : "Notification & Email Preferences"}
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5 }}>
        <Box
          sx={{
            p: 2,
            mb: 2.5,
            borderRadius: "8px",
            border: `1px solid ${tokens.border}`,
            backgroundColor: tokens.surfaceSecondary,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Monitor size={20} color={tokens.primary} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {isVi
                  ? "Thông báo màn hình máy tính (Desktop Notification)"
                  : "Desktop Push Notifications"}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: tokens.textSecondary }}
              >
                {desktopPermission === "granted"
                  ? isVi
                    ? "Đã cho phép thông báo màn hình khi có cập nhật mới"
                    : "Permission granted for desktop alerts"
                  : isVi
                    ? "Chưa bật quyền nhận thông báo trên máy tính"
                    : "Permission not yet granted"}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {desktopPermission !== "granted" ? (
              <Button
                size="small"
                variant="contained"
                onClick={handleEnableDesktop}
                sx={{ textTransform: "none", borderRadius: "6px", height: 32 }}
              >
                {isVi ? "Bật thông báo" : "Enable"}
              </Button>
            ) : (
              <>
                <Chip
                  icon={<CheckCircle2 size={13} />}
                  label={isVi ? "Đang hoạt động" : "Active"}
                  size="small"
                  sx={{
                    backgroundColor: "rgba(63, 185, 80, 0.15)",
                    color: tokens.success,
                    height: 24,
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                  }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Send size={13} />}
                  onClick={handleTestDesktopNotification}
                  sx={{
                    textTransform: "none",
                    borderRadius: "6px",
                    height: 32,
                  }}
                >
                  {isVi ? "Gửi thử" : "Test"}
                </Button>
              </>
            )}
          </Box>
        </Box>

        <Typography variant="body2" sx={{ color: tokens.textSecondary, mb: 2 }}>
          {isVi
            ? "Cấu hình cách Reported gửi thông báo cho bạn theo từng sự kiện. Email được điều phối tự động qua hàng đợi Outbox."
            : "Configure how Reported notifies you for different collaboration triggers. Emails are dispatched asynchronously via the Transactional Outbox."}
        </Typography>

        {savedSuccess && (
          <Alert severity="success" sx={{ mb: 2, borderRadius: "6px" }}>
            {isVi
              ? "Đã lưu cài đặt thông báo thành công!"
              : "Notification preferences saved successfully!"}
          </Alert>
        )}

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  fontWeight: 700,
                  color: tokens.textPrimary,
                  borderBottom: `1px solid ${tokens.border}`,
                }}
              >
                {isVi ? "Sự kiện kích hoạt" : "Trigger Event"}
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 700,
                  color: tokens.textPrimary,
                  width: 200,
                  borderBottom: `1px solid ${tokens.border}`,
                }}
              >
                {isVi ? "Kênh nhận tin" : "Channel"}
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(EVENT_LABELS).map(([eventType, labelObj]) => (
              <TableRow key={eventType}>
                <TableCell
                  sx={{
                    fontSize: "0.84rem",
                    py: 1.2,
                    borderBottom: `1px solid ${tokens.border}`,
                  }}
                >
                  {isVi ? labelObj.vi : labelObj.en}
                </TableCell>
                <TableCell
                  sx={{ py: 1.2, borderBottom: `1px solid ${tokens.border}` }}
                >
                  <Select
                    size="small"
                    fullWidth
                    value={preferences[eventType] || NotificationChannel.BOTH}
                    onChange={(e) =>
                      handleChannelChange(
                        eventType,
                        e.target.value as NotificationChannel,
                      )
                    }
                    sx={{ fontSize: "0.8125rem", height: 34 }}
                  >
                    <MenuItem value={NotificationChannel.IN_APP}>
                      {
                        CHANNEL_LABELS[NotificationChannel.IN_APP][
                          isVi ? "vi" : "en"
                        ]
                      }
                    </MenuItem>
                    <MenuItem value={NotificationChannel.EMAIL}>
                      {
                        CHANNEL_LABELS[NotificationChannel.EMAIL][
                          isVi ? "vi" : "en"
                        ]
                      }
                    </MenuItem>
                    <MenuItem value={NotificationChannel.BOTH}>
                      {
                        CHANNEL_LABELS[NotificationChannel.BOTH][
                          isVi ? "vi" : "en"
                        ]
                      }
                    </MenuItem>
                    <MenuItem value={NotificationChannel.DISABLED}>
                      {
                        CHANNEL_LABELS[NotificationChannel.DISABLED][
                          isVi ? "vi" : "en"
                        ]
                      }
                    </MenuItem>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: `1px solid ${tokens.border}` }}>
        <Button
          onClick={onClose}
          color="inherit"
          sx={{ textTransform: "none", borderRadius: "6px" }}
        >
          {isVi ? "Hủy" : "Cancel"}
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={isSaving}
          sx={{ textTransform: "none", borderRadius: "6px" }}
        >
          {isSaving
            ? isVi
              ? "Đang lưu..."
              : "Saving..."
            : isVi
              ? "Lưu thay đổi"
              : "Save Preferences"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
