import React from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  IconButton,
  Link as MuiLink,
  Typography,
} from "@mui/material";
import { Mail, X, FolderGit2, Sparkles, Layers, Shield, Code2 } from "lucide-react";
import { useThemeContext } from "../../contexts/ThemeContext";
import { useI18n } from "../../contexts/I18nContext";
import { BrandLogo } from "./BrandLogo";
import { APP_CONFIG, AUTHOR_CONFIG } from "../../constants/index";

interface AboutReportedModalProps {
  open: boolean;
  onClose: () => void;
}

export const AboutReportedModal: React.FC<AboutReportedModalProps> = ({
  open,
  onClose,
}) => {
  const { tokens } = useThemeContext();
  const { language } = useI18n();

  const isVi = language === "vi";

  const features = [
    {
      icon: <FolderGit2 size={16} color={tokens.primary} style={{ marginTop: 2, flexShrink: 0 }} />,
      title: isVi ? "Tích hợp GitHub sâu rộng" : "Deep GitHub Integration",
      description: isVi
        ? "Đồng bộ Pull Request tức thời, trạng thái CI check suite và liên kết trực tiếp mã nguồn."
        : "Live PR sync, check suite status, and direct code linkage.",
    },
    {
      icon: <Code2 size={16} color={tokens.accent} style={{ marginTop: 2, flexShrink: 0 }} />,
      title: isVi ? "Markdown & Callouts kỹ thuật" : "Technical Markdown & Callouts",
      description: isVi
        ? "Hỗ trợ GitHub Alerts, bảng dữ liệu, syntax highlight và nhận diện ngôn ngữ thông minh."
        : "GitHub Alert callouts, tables, syntax highlighting, and persistent language selection.",
    },
    {
      icon: <Layers size={16} color={tokens.success} style={{ marginTop: 2, flexShrink: 0 }} />,
      title: isVi ? "Kiến trúc Multi-Workspace" : "Multi-Workspace Architecture",
      description: isVi
        ? "Cô lập dữ liệu an toàn theo từng không gian làm việc, chuyển đổi mượt mà không rò rỉ."
        : "Isolated workspace data with seamless, real-time zero-leak switching.",
    },
    {
      icon: <Shield size={16} color={tokens.warning} style={{ marginTop: 2, flexShrink: 0 }} />,
      title: isVi ? "Bảo mật & Phân quyền" : "Enterprise Security",
      description: isVi
        ? "Đăng nhập OAuth GitHub, xác thực Passkey WebAuthn và phân quyền chặt chẽ theo vai trò."
        : "GitHub OAuth, WebAuthn Passkeys, and fine-grained role-based access control.",
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "12px",
          backgroundColor: tokens.surface,
          border: `1px solid ${tokens.border}`,
          overflow: "hidden",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 3,
          py: 2.25,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            minWidth: 0,
          }}
        >
          <BrandLogo size="small" />

          <Box sx={{ minWidth: 0 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  lineHeight: 1.2,
                }}
              >
                {APP_CONFIG.name}
              </Typography>

              <Chip
                label={`v${APP_CONFIG.version}`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  backgroundColor: tokens.surfaceSecondary,
                  color: tokens.textSecondary,
                  border: `1px solid ${tokens.borderSubtle}`,
                }}
              />
            </Box>

            <Typography
              variant="caption"
              sx={{
                display: "block",
                mt: 0.35,
                color: tokens.textSecondary,
              }}
            >
              {isVi ? APP_CONFIG.taglineVi : APP_CONFIG.taglineEn}
            </Typography>
          </Box>
        </Box>

        <IconButton
          size="small"
          onClick={onClose}
          aria-label={isVi ? "Đóng" : "Close"}
          sx={{
            ml: 2,
            color: tokens.textSecondary,
          }}
        >
          <X size={18} />
        </IconButton>
      </Box>

      <Divider />

      <DialogContent
        sx={{
          px: 3,
          py: 2.5,
          display: "flex",
          flexDirection: "column",
          gap: 2.5,
        }}
      >
        <Box
          sx={{
            p: 2,
            borderRadius: "8px",
            backgroundColor: tokens.surfaceSecondary,
            border: `1px solid ${tokens.border}`,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Sparkles size={16} color={tokens.primary} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              {isVi ? "Mục đích & Tầm nhìn" : "Purpose & Vision"}
            </Typography>
          </Box>
          <Typography
            variant="body2"
            sx={{
              color: tokens.textSecondary,
              lineHeight: 1.65,
            }}
          >
            {isVi ? APP_CONFIG.descriptionVi : APP_CONFIG.descriptionEn}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
            }}
          >
            {isVi ? "Tính năng cốt lõi" : "Core Features"}
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "1fr 1fr",
              },
              gap: 1.5,
            }}
          >
            {features.map((feature) => (
              <Box
                key={feature.title}
                sx={{
                  p: 1.5,
                  borderRadius: "6px",
                  border: `1px solid ${tokens.borderSubtle}`,
                  backgroundColor: tokens.surfaceSecondary,
                  display: "flex",
                  gap: 1.2,
                  alignItems: "flex-start",
                }}
              >
                {feature.icon}
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      display: "block",
                      mb: 0.25,
                    }}
                  >
                    {feature.title}
                  </Typography>

                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      color: tokens.textSecondary,
                      fontSize: "0.75rem",
                      lineHeight: 1.5,
                    }}
                  >
                    {feature.description}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        <Box
          sx={{
            p: 2,
            borderRadius: "8px",
            backgroundColor: tokens.surfaceSecondary,
            border: `1px solid ${tokens.border}`,
            display: "flex",
            flexDirection: "column",
            gap: 1.25,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
            }}
          >
            {isVi ? "Tác giả & Thông tin liên hệ" : "Author & Contact"}
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexDirection: {
                xs: "column",
                sm: "row",
              },
              alignItems: {
                xs: "flex-start",
                sm: "center",
              },
              justifyContent: "space-between",
              gap: 1.5,
            }}
          >
            <Box>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                }}
              >
                {AUTHOR_CONFIG.name}
              </Typography>

              <Typography
                variant="caption"
                sx={{
                  color: tokens.textSecondary,
                }}
              >
                @{AUTHOR_CONFIG.username}
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <MuiLink
                href={AUTHOR_CONFIG.githubUrl}
                target="_blank"
                rel="noreferrer"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.65,
                  color: tokens.textSecondary,
                  textDecoration: "none",
                  fontSize: "0.8125rem",
                  transition: "color 0.15s ease",
                  "&:hover": {
                    color: tokens.primary,
                  },
                }}
              >
                <FolderGit2 size={14} />
                GitHub
              </MuiLink>

              <MuiLink
                href={`mailto:${AUTHOR_CONFIG.email}`}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.65,
                  color: tokens.textSecondary,
                  textDecoration: "none",
                  fontSize: "0.8125rem",
                  transition: "color 0.15s ease",
                  "&:hover": {
                    color: tokens.primary,
                  },
                }}
              >
                <Mail size={14} />
                {AUTHOR_CONFIG.email}
              </MuiLink>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <Divider />

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          justifyContent: "space-between",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: tokens.textMuted,
          }}
        >
          {APP_CONFIG.copyright}
        </Typography>

        <Button
          onClick={onClose}
          variant="contained"
          size="small"
          sx={{
            px: 2.5,
            borderRadius: "6px",
            textTransform: "none",
            backgroundColor: tokens.primary,
            color: "#ffffff !important",
            boxShadow: "none",
            "&:hover": {
              backgroundColor: tokens.primaryHover,
              boxShadow: "none",
            },
          }}
        >
          {isVi ? "Đóng" : "Close"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};