import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  TextField,
  Alert,
  Paper,
  Divider,
} from "@mui/material";
import { Send, RefreshCw, Mail } from "lucide-react";
import { apiFetch } from "../../api/client";
import { useThemeContext } from "../../contexts/ThemeContext";
import { useAuthContext } from "../../contexts/AuthContext";

interface EmailJobItem {
  id: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  status: string;
  template: string;
  htmlBody: string;
  textBody?: string | null;
  createdAt: string;
}

interface EmailInspectorModalProps {
  open: boolean;
  onClose: () => void;
}

export const EmailInspectorModal: React.FC<EmailInspectorModalProps> = ({
  open,
  onClose,
}) => {
  const { tokens } = useThemeContext();
  const { user } = useAuthContext();
  const [emails, setEmails] = useState<EmailJobItem[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailJobItem | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [targetEmail, setTargetEmail] = useState("");
  const [sendResultAlert, setSendResultAlert] = useState<{
    type: "success" | "info" | "error";
    message: string;
  } | null>(null);

  const fetchEmails = async () => {
    try {
      const data = await apiFetch<EmailJobItem[]>("/emails");
      setEmails(data);
      if (data.length > 0 && !selectedEmail) {
        setSelectedEmail(data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (open) {
      if (user?.email) {
        setTargetEmail(user.email);
      }
      setSendResultAlert(null);
      fetchEmails();
    }
  }, [open, user?.email]);

  const handleSendTest = async () => {
    setIsSendingTest(true);
    setSendResultAlert(null);
    try {
      const res = await apiFetch<{
        deliveryResult?: { success: boolean; mode: string };
      }>("/emails/send-test", {
        method: "POST",
        body: JSON.stringify({
          recipientEmail: targetEmail.trim() || undefined,
        }),
      });
      await fetchEmails();
      if (
        res?.deliveryResult?.success &&
        res?.deliveryResult?.mode === "resend"
      ) {
        setSendResultAlert({
          type: "success",
          message: "Email đã được gửi thành công qua Resend API!",
        });
      } else if (
        res?.deliveryResult?.success &&
        res?.deliveryResult?.mode === "smtp"
      ) {
        setSendResultAlert({
          type: "success",
          message: "Email đã được gửi thành công qua máy chủ SMTP!",
        });
      } else if (
        res?.deliveryResult?.success &&
        res?.deliveryResult?.mode === "simulated"
      ) {
        setSendResultAlert({
          type: "info",
          message:
            "Email đã ghi vào Outbox (chế độ SIMULATED do chưa cấu hình Resend hoặc SMTP).",
        });
      } else {
        setSendResultAlert({
          type: "error",
          message: "Gửi email thất bại. Đã ghi nhận lỗi vào hệ thống.",
        });
      }
    } catch (err) {
      console.error(err);
      setSendResultAlert({
        type: "error",
        message: "Gửi email thử nghiệm thất bại.",
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const getStatusChip = (status: string) => {
    if (status === "SENT") {
      return (
        <Chip
          label="SENT (SMTP)"
          size="small"
          sx={{
            height: 18,
            fontSize: "0.625rem",
            backgroundColor: "rgba(63, 185, 80, 0.15)",
            color: tokens.success,
            fontWeight: 600,
          }}
        />
      );
    }
    if (status === "SIMULATED") {
      return (
        <Chip
          label="SIMULATED"
          size="small"
          sx={{
            height: 18,
            fontSize: "0.625rem",
            backgroundColor: "rgba(56, 139, 253, 0.15)",
            color: tokens.primary,
            fontWeight: 600,
          }}
        />
      );
    }
    return (
      <Chip
        label={status}
        size="small"
        sx={{
          height: 18,
          fontSize: "0.625rem",
          backgroundColor: "rgba(248, 81, 73, 0.15)",
          color: tokens.error,
          fontWeight: 600,
        }}
      />
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          borderBottom: `1px solid ${tokens.border}`,
          pb: 1.5,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="h4" sx={{ fontSize: "1rem", fontWeight: 600 }}>
              Transactional Outbox & Email Delivery Inspector
            </Typography>
            <Chip
              label="Dev / Outbox"
              size="small"
              sx={{ height: 20, fontSize: "0.6875rem" }}
            />
          </Box>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshCw size={15} />}
              onClick={fetchEmails}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap",
          }}
        >
          <TextField
            size="small"
            placeholder="Nhập email nhận thử nghiệm (VD: your@gmail.com)"
            value={targetEmail}
            onChange={(e) => setTargetEmail(e.target.value)}
            sx={{
              minWidth: 320,
              "& .MuiInputBase-input": { fontSize: "0.8125rem", py: 0.75 },
            }}
          />
          <Button
            size="small"
            variant="contained"
            startIcon={<Send size={15} />}
            onClick={handleSendTest}
            disabled={isSendingTest}
            sx={{ textTransform: "none", px: 2 }}
          >
            {isSendingTest ? "Đang gửi..." : "Gửi Email thử nghiệm"}
          </Button>
        </Box>

        {sendResultAlert && (
          <Alert
            severity={sendResultAlert.type}
            sx={{ py: 0, px: 1.5, fontSize: "0.8125rem" }}
          >
            {sendResultAlert.message}
          </Alert>
        )}
      </DialogTitle>

      <DialogContent
        sx={{ p: 0, display: "flex", minHeight: 450, maxHeight: 600 }}
      >
        <Box
          sx={{
            width: "38%",
            borderRight: `1px solid ${tokens.border}`,
            overflowY: "auto",
          }}
        >
          {emails.length === 0 ? (
            <Box
              sx={{
                p: 3,
                textAlign: "center",
                color: tokens.textSecondary,
                fontSize: "0.875rem",
              }}
            >
              No email jobs dispatched yet. Click "Send Test Notification" above
              to test the outbox!
            </Box>
          ) : (
            <List dense sx={{ py: 0 }}>
              {emails.map((m) => (
                <ListItemButton
                  key={m.id}
                  selected={selectedEmail?.id === m.id}
                  onClick={() => setSelectedEmail(m)}
                  sx={{
                    py: 1,
                    px: 1.5,
                    borderBottom: `1px solid ${tokens.divider}`,
                    "&.Mui-selected": { backgroundColor: tokens.hover },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          mb: 0.3,
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, fontSize: "0.8125rem" }}
                          noWrap
                        >
                          {m.recipientName}
                        </Typography>
                        {getStatusChip(m.status)}
                      </Box>
                    }
                    secondary={
                      <>
                        <Typography
                          variant="caption"
                          sx={{
                            color: tokens.textPrimary,
                            display: "block",
                            fontWeight: 500,
                          }}
                          noWrap
                        >
                          {m.subject}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: tokens.textSecondary,
                            fontSize: "0.6875rem",
                          }}
                        >
                          {new Date(m.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Typography>
                      </>
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </Box>

        <Box sx={{ width: "62%", p: 2.5, overflowY: "auto" }}>
          {selectedEmail ? (
            <Box>
              <Box
                sx={{
                  mb: 2,
                  pb: 1.5,
                  borderBottom: `1px solid ${tokens.border}`,
                }}
              >
                <Typography variant="h3" sx={{ fontSize: "1.1rem", mb: 1 }}>
                  {selectedEmail.subject}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: tokens.textSecondary, fontSize: "0.8125rem" }}
                >
                  <strong>To:</strong> {selectedEmail.recipientName} &lt;
                  {selectedEmail.recipientEmail}&gt;
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: tokens.textSecondary, fontSize: "0.8125rem" }}
                >
                  <strong>Dispatched:</strong>{" "}
                  {new Date(selectedEmail.createdAt).toLocaleString()}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ color: tokens.textSecondary, fontSize: "0.8125rem" }}
                >
                  <strong>Template:</strong>{" "}
                  <code>{selectedEmail.template}</code>
                </Typography>
              </Box>

              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  backgroundColor: "#ffffff",
                  color: "#1f2328",
                  borderRadius: 1.5,
                  border: "1px solid #d0d7de",
                }}
              >
                <div
                  dangerouslySetInnerHTML={{ __html: selectedEmail.htmlBody }}
                />
              </Paper>
            </Box>
          ) : (
            <Box
              sx={{ py: 8, textAlign: "center", color: tokens.textSecondary }}
            >
              Select an email from the left to view rendered content.
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 1.5, borderTop: `1px solid ${tokens.border}` }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
