import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  Tooltip,
} from "@mui/material";
import { X, FolderGit2 } from "lucide-react";
import { GitHubIcon, GitLabIcon } from "./BrandIcons";
import { useThemeContext } from "../../contexts/ThemeContext";
import { useAuthContext } from "../../contexts/AuthContext";
import { apiFetch } from "../../api/client";

export const DashboardCodeHostingBanner: React.FC = () => {
  const { tokens } = useThemeContext();
  const { hasCodeHostingConnected, user } = useAuthContext();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!user) return;
    const isDismissed = localStorage.getItem(
      `reported_code_hosting_banner_dismissed_${user.id}`,
    );
    setDismissed(Boolean(isDismissed));
  }, [user?.id]);

  if (hasCodeHostingConnected || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    if (user) {
      localStorage.setItem(
        `reported_code_hosting_banner_dismissed_${user.id}`,
        "true",
      );
    }
    setDismissed(true);
  };

  const handleConnect = async (provider: "github" | "gitlab") => {
    try {
      const extraScopes = provider === "github" ? "repo,read:org" : "read_api";
      const res = await apiFetch<{ url: string }>(
        `/auth/oauth/${provider}/authorize?intent=link&returnTo=/&scopes=${extraScopes}`,
      );
      window.location.href = res.url;
    } catch (err) {
      console.error("Failed to initiate connect:", err);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 3,
        p: 2,
        borderRadius: "8px",
        backgroundColor: tokens.surfaceSecondary,
        border: `1px solid ${tokens.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "6px",
            backgroundColor: `${tokens.primary}20`,
            color: tokens.primary,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FolderGit2 size={20} />
        </Box>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Liên kết tài khoản GitHub hoặc GitLab
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
            Kết nối mã nguồn để chọn Repository, Pull Request/Merge Request,
            Branch và Commit trực tiếp trong thảo luận.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<GitHubIcon />}
          onClick={() => handleConnect("github")}
          sx={{ fontSize: "0.75rem", py: 0.4 }}
        >
          Kết nối GitHub
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<GitLabIcon />}
          onClick={() => handleConnect("gitlab")}
          sx={{ fontSize: "0.75rem", py: 0.4 }}
        >
          Kết nối GitLab
        </Button>
        <Tooltip title="Đóng lời nhắc">
          <IconButton
            size="small"
            onClick={handleDismiss}
            sx={{ color: tokens.textSecondary, p: 0.5 }}
          >
            <X size={16} />
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
};

export const ContextualCodeHostingNotice: React.FC<{
  onPreserveDraft?: () => void;
  returnPath?: string;
}> = ({ onPreserveDraft, returnPath = "/" }) => {
  const { tokens } = useThemeContext();
  const { hasCodeHostingConnected, isLoadingAccounts } = useAuthContext();

  if (hasCodeHostingConnected || isLoadingAccounts) {
    return null;
  }

  const handleConnect = async (provider: "github" | "gitlab") => {
    if (onPreserveDraft) {
      onPreserveDraft();
    }
    try {
      const extraScopes = provider === "github" ? "repo,read:org" : "read_api";
      const res = await apiFetch<{ url: string }>(
        `/auth/oauth/${provider}/authorize?intent=link&returnTo=${encodeURIComponent(returnPath)}&scopes=${extraScopes}`,
      );
      window.location.href = res.url;
    } catch (err) {
      console.error("Failed to initiate contextual connect:", err);
    }
  };

  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: "6px",
        backgroundColor: `${tokens.primary}10`,
        border: `1px solid ${tokens.primary}30`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 1.5,
        my: 1.5,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <FolderGit2 size={18} color={tokens.primary} />
        <Typography
          variant="body2"
          sx={{ fontSize: "0.8125rem", color: tokens.textPrimary }}
        >
          <strong>Chưa kết nối mã nguồn:</strong> Liên kết GitHub hoặc GitLab để
          tự động chọn Repository, PR/MR, Branch và Commit.
        </Typography>
      </Box>

      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          size="small"
          variant="contained"
          startIcon={<GitHubIcon />}
          onClick={() => handleConnect("github")}
          sx={{ fontSize: "0.72rem", py: 0.3, px: 1 }}
        >
          Liên kết GitHub
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<GitLabIcon />}
          onClick={() => handleConnect("gitlab")}
          sx={{ fontSize: "0.72rem", py: 0.3, px: 1 }}
        >
          Liên kết GitLab
        </Button>
      </Box>
    </Box>
  );
};
