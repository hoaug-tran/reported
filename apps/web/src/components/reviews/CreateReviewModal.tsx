import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Alert,
  Chip,
} from "@mui/material";
import { Eye, GitPullRequest, Lock, Globe } from "lucide-react";
import {
  ReviewType,
  CreateReviewDto,
  RepositoryDto,
  UserSummaryDto,
} from "@reported/contracts";
import { MarkdownEditor } from "../editor/MarkdownEditor";
import { useThemeContext } from "../../contexts/ThemeContext";
import { useAuthContext } from "../../contexts/AuthContext";
import { useI18n } from "../../contexts/I18nContext";
import { ContextualCodeHostingNotice } from "../common/ConnectedAccountNotice";
import { apiFetch } from "../../api/client";
import { buttonSx, inputSx } from "../../theme/ui";
import { UserAvatar } from "../common/UserAvatar";

interface CreateReviewModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (number: number) => void;
}

export const CreateReviewModal: React.FC<CreateReviewModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const { tokens } = useThemeContext();
  const { hasCodeHostingConnected } = useAuthContext();
  const { language } = useI18n();
  const isVi = language === "vi";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reviewType, setReviewType] = useState<ReviewType>(ReviewType.CODE);
  const [deadline, setDeadline] = useState("");

  const [repositories, setRepositories] = useState<RepositoryDto[]>([]);
  const [selectedRepoId, setSelectedRepoId] = useState<string>("");
  const [prUrl, setPrUrl] = useState("");

  const [allUsers, setAllUsers] = useState<UserSummaryDto[]>([]);
  const [selectedReviewerIds, setSelectedReviewerIds] = useState<string[]>([]);
  const [labels, setLabels] = useState<string[]>(["review"]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    try {
      const draftJson = sessionStorage.getItem("reported_review_draft");
      if (draftJson) {
        const draft = JSON.parse(draftJson);
        if (draft.title) setTitle(draft.title);
        if (draft.description) setDescription(draft.description);
        if (draft.reviewType) setReviewType(draft.reviewType);
        if (draft.prUrl) setPrUrl(draft.prUrl);
      }
    } catch {}
  }, [open]);

  const preserveDraft = () => {
    sessionStorage.setItem(
      "reported_review_draft",
      JSON.stringify({
        title,
        description,
        reviewType,
        prUrl,
        selectedRepoId,
      }),
    );
  };

  useEffect(() => {
    if (!open) return;
    apiFetch<UserSummaryDto[]>("/users").then(setAllUsers).catch(console.error);
    apiFetch<RepositoryDto[]>("/github/repositories")
      .then(setRepositories)
      .catch(console.error);
  }, [open]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError(isVi ? "Vui lòng nhập tiêu đề review" : "Title is required");
      return;
    }
    if (selectedReviewerIds.length === 0) {
      setError(
        isVi
          ? "Vui lòng chọn ít nhất một reviewer"
          : "Please assign at least one reviewer",
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload: CreateReviewDto = {
        title,
        description: description || title,
        reviewType,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        repositoryId: selectedRepoId || null,
        prUrl: prUrl || null,
        reviewerIds: selectedReviewerIds,
        labels,
      };

      const res = await apiFetch<{ id: string; number: number }>("/reviews", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      sessionStorage.removeItem("reported_review_draft");
      onSuccess(res.number);
      onClose();
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ||
            "Failed to create review request";
      setError(errMsg);
    } finally {
      setIsSubmitting(false);
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
          backgroundColor: tokens.surface,
          borderRadius: "8px",
          border: `1px solid ${tokens.border}`,
        },
      }}
    >
      <DialogTitle
        sx={{
          borderBottom: `1px solid ${tokens.border}`,
          pb: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Eye size={20} color="#a855f7" />
        <Typography
          variant="h6"
          sx={{
            fontSize: "1.05rem",
            fontWeight: 700,
            color: tokens.textPrimary,
          }}
        >
          {isVi ? "Yêu cầu Review mới" : "New Review Request"}
        </Typography>
      </DialogTitle>

      <DialogContent
        sx={{ pt: 2.5, display: "flex", flexDirection: "column", gap: 2 }}
      >
        {error && (
          <Alert
            severity="error"
            sx={{ borderRadius: "8px" }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        <TextField
          autoFocus
          fullWidth
          label={isVi ? "Tiêu đề cuộc Review *" : "Review Title *"}
          placeholder={
            isVi
              ? "Ví dụ: Auth refresh token rotation & reuse detection"
              : "e.g. Auth refresh token rotation & reuse detection"
          }
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          sx={inputSx(tokens)}
        />

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 1.5,
          }}
        >
          <FormControl size="small" fullWidth>
            <InputLabel>{isVi ? "Loại Review" : "Review Type"}</InputLabel>
            <Select
              value={reviewType}
              label={isVi ? "Loại Review" : "Review Type"}
              onChange={(e) => setReviewType(e.target.value as ReviewType)}
              sx={inputSx(tokens)}
            >
              <MenuItem value={ReviewType.CODE}>
                {isVi ? "Code Review" : "Code Review"}
              </MenuItem>
              <MenuItem value={ReviewType.ARCHITECTURE}>
                {isVi ? "Kiến trúc RFC" : "Architecture RFC"}
              </MenuItem>
              <MenuItem value={ReviewType.DATABASE}>
                {isVi ? "Schema Database" : "Database Schema"}
              </MenuItem>
              <MenuItem value={ReviewType.API}>
                {isVi ? "Thiết kế API" : "API Design"}
              </MenuItem>
              <MenuItem value={ReviewType.SECURITY}>
                {isVi ? "Bảo mật" : "Security"}
              </MenuItem>
              <MenuItem value={ReviewType.UI}>
                {isVi ? "UI / UX" : "UI / UX"}
              </MenuItem>
              <MenuItem value={ReviewType.DOCUMENTATION}>
                {isVi ? "Tài liệu kỹ thuật" : "Documentation"}
              </MenuItem>
              <MenuItem value={ReviewType.PR}>
                {isVi ? "Pull Request" : "Pull Request"}
              </MenuItem>
            </Select>
          </FormControl>

          <TextField
            size="small"
            fullWidth
            type="date"
            label={isVi ? "Hạn hoàn thành (Deadline)" : "Review Deadline"}
            InputLabelProps={{ shrink: true }}
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            sx={inputSx(tokens)}
          />
        </Box>

        <Box>
          <Typography
            variant="caption"
            sx={{
              color: tokens.textSecondary,
              mb: 0.5,
              display: "block",
              fontWeight: 600,
            }}
          >
            {isVi
              ? "BỐI CẢNH & HƯỚNG DẪN REVIEW (Markdown)"
              : "OBJECTIVES & CONTEXT (Markdown)"}
          </Typography>
          <MarkdownEditor
            value={description}
            onChange={setDescription}
            placeholder={
              isVi
                ? "Nêu rõ bối cảnh, các điểm cần kiểm chứng kỹ, rủi ro tiềm ẩn hoặc file quan trọng cần inspect..."
                : "Explain what needs review, background motivation, key architectural trade-offs, and files to inspect..."
            }
            minRows={4}
          />
        </Box>

        {!hasCodeHostingConnected && (
          <ContextualCodeHostingNotice
            onPreserveDraft={preserveDraft}
            returnPath="/reviews"
          />
        )}

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 1.5,
          }}
        >
          <FormControl size="small" fullWidth>
            <InputLabel>
              {isVi ? "Repository liên kết" : "Repository"}
            </InputLabel>
            <Select
              value={selectedRepoId}
              label={isVi ? "Repository liên kết" : "Repository"}
              onChange={(e) => setSelectedRepoId(e.target.value)}
              sx={inputSx(tokens)}
            >
              <MenuItem value="">{isVi ? "Không liên kết" : "None"}</MenuItem>
              {repositories.map((repo) => (
                <MenuItem key={repo.id} value={repo.id}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {repo.isPrivate ? <Lock size={14} /> : <Globe size={14} />}
                    <span>{repo.fullName}</span>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            fullWidth
            label={
              isVi ? "Link PR GitHub (tùy chọn)" : "GitHub PR URL (optional)"
            }
            placeholder="https://github.com/.../pull/28"
            value={prUrl}
            onChange={(e) => setPrUrl(e.target.value)}
            InputProps={{
              startAdornment: (
                <GitPullRequest
                  size={16}
                  style={{ marginRight: 8, color: tokens.textSecondary }}
                />
              ),
            }}
            sx={inputSx(tokens)}
          />
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
            gap: 1.5,
          }}
        >
          <Autocomplete
            multiple
            size="small"
            options={allUsers}
            getOptionLabel={(option) =>
              `${option.displayName} (@${option.username})`
            }
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <UserAvatar user={option} size={20} showTooltip={false} />
                  <span>
                    {option.displayName} (@{option.username})
                  </span>
                </Box>
              </li>
            )}
            onChange={(_, vals) =>
              setSelectedReviewerIds(vals.map((v) => v.id))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label={isVi ? "Chỉ định Reviewer *" : "Reviewers *"}
                placeholder={
                  isVi ? "Gõ để tìm đồng nghiệp..." : "Assign reviewers..."
                }
                sx={inputSx(tokens)}
              />
            )}
          />

          <Autocomplete
            multiple
            freeSolo
            size="small"
            options={[
              "architecture",
              "security",
              "database",
              "api",
              "perf",
              "frontend",
              "review",
            ]}
            value={labels}
            onChange={(_, vals) => setLabels(vals)}
            renderTags={(val, getTagProps) =>
              val.map((option, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={option}
                  label={option}
                  size="small"
                  sx={{ height: 20, fontSize: "0.72rem" }}
                />
              ))
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label={isVi ? "Nhãn (Labels)" : "Labels"}
                placeholder={isVi ? "Thêm nhãn..." : "Add labels..."}
                sx={inputSx(tokens)}
              />
            )}
          />
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          p: 2,
          borderTop: `1px solid ${tokens.border}`,
          justifyContent: "space-between",
        }}
      >
        <Button
          onClick={onClose}
          sx={{ textTransform: "none", color: tokens.textSecondary }}
        >
          {isVi ? "Hủy" : "Cancel"}
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={
            isSubmitting || !title.trim() || selectedReviewerIds.length === 0
          }
          sx={buttonSx(tokens)}
        >
          {isSubmitting
            ? isVi
              ? "Đang gửi..."
              : "Submitting..."
            : isVi
              ? "Gửi yêu cầu Review"
              : "Request Review"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
