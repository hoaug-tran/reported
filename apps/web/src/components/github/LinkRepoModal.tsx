import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  Chip,
} from "@mui/material";
import {
  FolderGit2,
  Search,
  Lock,
  Globe,
  RefreshCw,
  Check,
  ShieldCheck,
} from "lucide-react";
import { useThemeContext } from "../../contexts/ThemeContext";
import { useI18n } from "../../contexts/I18nContext";
import { useAuthContext } from "../../contexts/AuthContext";
import { apiFetch } from "../../api/client";
import { RepositoryDto } from "@reported/contracts";

interface GitHubRepoItem {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  ownerAvatar?: string;
  isPrivate: boolean;
  defaultBranch: string;
  htmlUrl: string;
  description?: string;
  updatedAt?: string;
}

interface UserReposResponse {
  linked: boolean;
  repos: GitHubRepoItem[];
  error?: string;
}

interface LinkRepoModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (repo: RepositoryDto) => void;
}

export const LinkRepoModal: React.FC<LinkRepoModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { tokens } = useThemeContext();
  const { language } = useI18n();
  const { connectedAccounts } = useAuthContext();
  const isVi = language === "vi";
  const githubAccount = connectedAccounts.find(
    (account) => account.provider.toLowerCase() === "github",
  );
  const hasRepoScope = githubAccount?.scopes?.includes("repo");
  const [loading, setLoading] = useState(false);
  const [fetchingRepos, setFetchingRepos] = useState(false);
  const [repos, setRepos] = useState<GitHubRepoItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepoItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualOwner, setManualOwner] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualBranch, setManualBranch] = useState("main");
  const [manualIsPrivate, setManualIsPrivate] = useState(false);

  const fetchUserRepos = async () => {
    setFetchingRepos(true);
    setError(null);
    try {
      const data = await apiFetch<UserReposResponse>("/github/user-repos");
      if (data.linked && data.repos) {
        setRepos(data.repos);
        if (!hasRepoScope) {
          setError(
            isVi
              ? "GitHub đang thiếu quyền repo. Cấp lại quyền để thấy private repo."
              : "GitHub is missing repo scope. Reconnect to show private repositories.",
          );
        }
      } else {
        if (data.error) {
          setError(data.error);
        }
        setIsManualMode(true);
      }
    } catch {
      setIsManualMode(true);
    } finally {
      setFetchingRepos(false);
    }
  };

  useEffect(() => {
    if (open) {
      setSelectedRepo(null);
      setError(null);
      fetchUserRepos();
    }
  }, [open]);

  const handleLinkSelected = async (repoToLink: GitHubRepoItem) => {
    setLoading(true);
    setError(null);

    try {
      const created = await apiFetch<RepositoryDto>("/github/repositories", {
        method: "POST",
        body: JSON.stringify({
          owner: repoToLink.owner,
          name: repoToLink.name,
          defaultBranch: repoToLink.defaultBranch || "main",
          isPrivate: repoToLink.isPrivate,
          webUrl: repoToLink.htmlUrl,
        }),
      });

      onSuccess(created);
      onClose();
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ||
            (isVi
              ? "Không thể liên kết repository."
              : "Failed to connect repository.");
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualOwner.trim() || !manualName.trim()) {
      setError(
        isVi
          ? "Cần nhập owner và tên repository."
          : "Owner and repository name are required.",
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const created = await apiFetch<RepositoryDto>("/github/repositories", {
        method: "POST",
        body: JSON.stringify({
          owner: manualOwner.trim(),
          name: manualName.trim(),
          defaultBranch: manualBranch.trim() || "main",
          isPrivate: manualIsPrivate,
        }),
      });

      onSuccess(created);
      onClose();
      setManualOwner("");
      setManualName("");
      setManualBranch("main");
      setManualIsPrivate(false);
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ||
            (isVi
              ? "Không thể liên kết repository."
              : "Failed to connect repository.");
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const filteredRepos = repos.filter(
    (r) =>
      r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description &&
        r.description.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const reconnectGitHub = async () => {
    const res = await apiFetch<{ url: string }>(
      "/auth/oauth/github/authorize?intent=link&returnTo=/repositories&scopes=repo,read:org",
    );
    window.location.href = res.url;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <FolderGit2 size={22} color={tokens.primary} />
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1.1rem" }}>
            {isVi ? "Liên kết repository GitHub" : "Link GitHub Repository"}
          </Typography>
        </Box>
        {repos.length > 0 && (
          <Button
            size="small"
            onClick={() => setIsManualMode(!isManualMode)}
            sx={{
              textTransform: "none",
              fontSize: "0.8rem",
              color: tokens.textSecondary,
            }}
          >
            {isManualMode
              ? isVi
                ? "Chọn từ GitHub"
                : "Select from GitHub"
              : isVi
                ? "Nhập thủ công"
                : "Enter manually"}
          </Button>
        )}
      </DialogTitle>

      <DialogContent
        dividers
        sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}
      >
        {error && (
          <Alert
            severity={hasRepoScope === false ? "warning" : "error"}
            onClose={() => setError(null)}
            action={
              hasRepoScope === false ? (
                <Button color="inherit" size="small" onClick={reconnectGitHub}>
                  {isVi ? "Cấp quyền repo" : "Grant repo scope"}
                </Button>
              ) : undefined
            }
          >
            {error}
          </Alert>
        )}

        {!isManualMode ? (
          <>
            {repos.length > 0 && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.8,
                  px: 0.5,
                  mb: -1,
                }}
              >
                <Lock size={13} color={tokens.textSecondary} />
                <Typography
                  variant="caption"
                  sx={{ color: tokens.textSecondary, fontSize: "0.75rem" }}
                >
                  Cả repo <strong>public</strong> và <strong>private</strong>{" "}
                  đều hiển thị. Tìm và chọn để liên kết.
                </Typography>
              </Box>
            )}
            <Box sx={{ display: "flex", gap: 1 }}>
              <TextField
                placeholder="Search your GitHub repositories..."
                size="small"
                fullWidth
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={16} color={tokens.textSecondary} />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={fetchUserRepos}
                disabled={fetchingRepos}
                sx={{ minWidth: 40, px: 1.5 }}
              >
                <RefreshCw
                  size={16}
                  className={fetchingRepos ? "animate-spin" : ""}
                />
              </Button>
            </Box>

            {fetchingRepos ? (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  py: 5,
                  gap: 1.5,
                }}
              >
                <CircularProgress size={28} />
                <Typography
                  variant="body2"
                  sx={{ color: tokens.textSecondary }}
                >
                  {isVi
                    ? "Đang tải repository từ GitHub..."
                    : "Loading repositories from GitHub..."}
                </Typography>
              </Box>
            ) : filteredRepos.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 5 }}>
                <Typography
                  variant="body2"
                  sx={{ color: tokens.textSecondary }}
                >
                  {repos.length === 0
                    ? isVi
                      ? "Không tìm thấy repository nào trong tài khoản GitHub."
                      : "No repositories found on your GitHub account."
                    : isVi
                      ? "Không có repository khớp từ khóa."
                      : "No matching repositories found."}
                </Typography>
                <Button
                  size="small"
                  onClick={() => setIsManualMode(true)}
                  sx={{ mt: 1.5, textTransform: "none" }}
                >
                  {isVi
                    ? "Nhập repository thủ công"
                    : "Enter repository manually"}
                </Button>
              </Box>
            ) : (
              <Box
                sx={{
                  maxHeight: 340,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                  pr: 0.5,
                }}
              >
                {filteredRepos.map((repo) => {
                  const isSelected = selectedRepo?.id === repo.id;
                  return (
                    <Box
                      key={repo.id}
                      onClick={() => setSelectedRepo(repo)}
                      sx={{
                        p: 1.5,
                        borderRadius: 1.5,
                        border: `1.5px solid ${isSelected ? tokens.primary : tokens.border}`,
                        bgcolor: isSelected ? tokens.primary : tokens.surface,
                        color: isSelected ? "#ffffff" : tokens.textPrimary,
                        cursor: "pointer",
                        transition: "all 0.15s ease-in-out",
                        "&:hover": {
                          borderColor: tokens.primary,
                          bgcolor: isSelected
                            ? tokens.primaryHover
                            : tokens.hover,
                        },
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1.5,
                      }}
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          {repo.isPrivate ? (
                            <Lock
                              size={14}
                              color={
                                isSelected ? "#ffffff" : tokens.textSecondary
                              }
                            />
                          ) : (
                            <Globe
                              size={14}
                              color={
                                isSelected ? "#ffffff" : tokens.textSecondary
                              }
                            />
                          )}
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              color: isSelected
                                ? "#ffffff !important"
                                : "inherit",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {repo.fullName}
                          </Typography>
                          <Chip
                            icon={
                              repo.isPrivate ? (
                                <Lock size={12} />
                              ) : (
                                <Globe size={12} />
                              )
                            }
                            label={repo.isPrivate ? "Private" : "Public"}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              backgroundColor: repo.isPrivate
                                ? "#dc2626"
                                : "#16a34a",
                              color: "#ffffff",
                            }}
                          />
                          <Typography
                            variant="caption"
                            sx={{
                              px: 0.75,
                              py: 0.2,
                              borderRadius: "6px",
                              bgcolor: isSelected
                                ? "rgba(255,255,255,0.25)"
                                : tokens.border,
                              color: isSelected
                                ? "#ffffff !important"
                                : tokens.textSecondary,
                              fontSize: "0.7rem",
                            }}
                          >
                            {repo.defaultBranch}
                          </Typography>
                        </Box>
                        {repo.description && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: isSelected
                                ? "rgba(255,255,255,0.85) !important"
                                : tokens.textSecondary,
                              display: "-webkit-box",
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              mt: 0.5,
                            }}
                          >
                            {repo.description}
                          </Typography>
                        )}
                      </Box>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: "6px",
                          bgcolor: isSelected
                            ? "rgba(255,255,255,0.22)"
                            : tokens.primary,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {isSelected ? (
                          <Check size={14} color="#fff" />
                        ) : (
                          <ShieldCheck size={14} color="#fff" />
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </>
        ) : (
          <Box
            component="form"
            onSubmit={handleManualSubmit}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
              {isVi
                ? "Nhập owner và tên repository. Chỉ dùng khi GitHub không trả danh sách repo."
                : "Connect a GitHub repository by entering its owner and name."}
            </Typography>

            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
              <TextField
                label="Owner / Organization"
                placeholder="e.g. facebook"
                size="small"
                value={manualOwner}
                onChange={(e) => setManualOwner(e.target.value)}
                required
                fullWidth
              />
              <TextField
                label="Repository Name"
                placeholder="e.g. react"
                size="small"
                value={manualName}
                onChange={(e) => setManualName(e.target.value)}
                required
                fullWidth
              />
            </Box>

            <TextField
              label="Default Branch"
              placeholder="main"
              size="small"
              value={manualBranch}
              onChange={(e) => setManualBranch(e.target.value)}
              fullWidth
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{ p: 2, display: "flex", justifyContent: "space-between" }}
      >
        <Button
          onClick={onClose}
          disabled={loading}
          sx={{ textTransform: "none" }}
        >
          {isVi ? "Hủy" : "Cancel"}
        </Button>
        {!isManualMode ? (
          <Button
            variant="contained"
            disabled={!selectedRepo || loading}
            onClick={() => selectedRepo && handleLinkSelected(selectedRepo)}
            sx={{ textTransform: "none", minWidth: 140 }}
          >
            {loading
              ? isVi
                ? "Đang liên kết..."
                : "Connecting..."
              : selectedRepo
                ? isVi
                  ? `Liên kết ${selectedRepo.name}`
                  : `Link ${selectedRepo.name}`
                : isVi
                  ? "Chọn repository"
                  : "Select a Repository"}
          </Button>
        ) : (
          <Button
            variant="contained"
            disabled={loading}
            onClick={handleManualSubmit}
            sx={{ textTransform: "none" }}
          >
            {loading
              ? isVi
                ? "Đang liên kết..."
                : "Connecting..."
              : isVi
                ? "Liên kết repository"
                : "Connect Repository"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
