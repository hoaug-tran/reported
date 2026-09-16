import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Box,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  TextField,
  Paper,
  List,
  ListItemButton,
  ListItemAvatar,
  ListItemText,
  Typography,
  LinearProgress,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListSubheader,
  Divider,
  Button,
} from "@mui/material";
import {
  Heading,
  Bold,
  Italic,
  Code,
  Quote,
  CheckSquare,
  FileCode,
  Link as LinkIcon,
  Undo2,
  Redo2,
  Image as ImageIcon,
  Paperclip,
  Mic,
  X,
  Plus,
  Wand2,
  Table as TableIcon,
  Sigma,
  GitBranch,
  Sparkles,
  ChevronDown,
  Layers,
  FileText,
  Upload,
} from "lucide-react";
import { MarkdownRenderer } from "../markdown/MarkdownRenderer";
import { UserAvatar } from "../common/UserAvatar";
import { UserSummaryDto } from "@reported/contracts";
import { useThemeContext } from "../../contexts/ThemeContext";
import { apiFetch } from "../../api/client";
import { uploadFileWithChunking } from "../../utils/chunkedUpload";
import { VoiceRecorder } from "../common/VoiceRecorder";
import { cleanMarkdownContent } from "../../utils/markdownUtils";

interface HistoryEntry {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minRows?: number;
  onSubmit?: () => void;
  targetType?: string;
  targetId?: string;
}

const MAX_HISTORY = 100;

const MarkdownEditorComponent: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = "Leave a comment or description (Markdown supported)...",
  minRows = 4,
  onSubmit,
  targetType,
  targetId,
}) => {
  const { tokens, resolvedMode } = useThemeContext();
  const [tabIndex, setTabIndex] = useState<"write" | "preview" | "split">("write");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState<number>(-1);
  const [suggestedUsers, setSuggestedUsers] = useState<UserSummaryDto[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [editorHeight, setEditorHeight] = useState<number | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [localValue, setLocalValue] = useState(value);
  const localValueRef = useRef(value);
  useEffect(() => {
    localValueRef.current = localValue;
  }, [localValue]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [debouncedPreviewValue, setDebouncedPreviewValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPreviewValue(localValue);
    }, 350);
    return () => clearTimeout(timer);
  }, [localValue]);

  const [insertAnchorEl, setInsertAnchorEl] = useState<null | HTMLElement>(null);
  const isInsertMenuOpen = Boolean(insertAnchorEl);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [uploadingFileSize, setUploadingFileSize] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const drawioInputRef = useRef<HTMLInputElement | null>(null);

  const insertAtCursor = (insertStr: string) => {
    const currentVal = localValueRef.current || "";
    const textarea = textareaRef.current;
    let cursor = currentVal.length;
    if (
      textarea &&
      typeof textarea.selectionStart === "number" &&
      document.activeElement === textarea
    ) {
      cursor = textarea.selectionStart;
    }
    const textBefore = currentVal.substring(0, cursor);
    const textAfter = currentVal.substring(cursor);
    const nextValue = textBefore + insertStr + textAfter;
    setLocalValue(nextValue);
    localValueRef.current = nextValue;
    onChange(nextValue);
    pushHistory(
      nextValue,
      cursor + insertStr.length,
      cursor + insertStr.length,
    );
  };

  const insertBlock = (template: string) => {
    const current = localValueRef.current || "";
    const prefix =
      current.length === 0
        ? ""
        : current.endsWith("\n\n")
          ? ""
          : current.endsWith("\n")
            ? "\n"
            : "\n\n";
    insertAtCursor(`${prefix}${template}\n`);
    setInsertAnchorEl(null);
  };

  const handleCleanContent = () => {
    const current = localValueRef.current || "";
    const cleaned = cleanMarkdownContent(current);
    setLocalValue(cleaned);
    localValueRef.current = cleaned;
    onChange(cleaned);
    pushHistory(cleaned, 0, 0);
  };

  const handleUploadFile = async (file: File, isImg: boolean) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadingFileName(file.name);
    const sizeStr =
      file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(1)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    setUploadingFileSize(sizeStr);

    try {
      const res = await uploadFileWithChunking(file, file.name, {
        targetType,
        targetId,
        onProgress: (pct) => setUploadProgress(pct),
      });
      const isImage = isImg || file.type.startsWith("image/");
      const isVideo =
        file.type.startsWith("video/") ||
        /\.(mp4|mov|webm|mkv|avi)$/i.test(file.name);

      if (isImage) {
        insertAtCursor(`\n![${file.name}](${res.inlineUrl})\n`);
      } else if (isVideo) {
        insertAtCursor(`\n[Video: ${file.name}](${res.inlineUrl})\n`);
      } else {
        insertAtCursor(`\n[File: ${file.name}](${res.url})\n`);
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Tải lên tệp thất bại";
      setUploadError(msg);
    } finally {
      setIsUploading(false);
      setUploadingFileName(null);
      setUploadingFileSize(null);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const files = e.clipboardData?.files;
    if (files && files.length > 0) {
      const file = files[0];
      e.preventDefault();
      handleUploadFile(file, file.type.startsWith("image/"));
      return;
    }
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === "file") {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleUploadFile(file, file.type.startsWith("image/"));
          return;
        }
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      handleUploadFile(file, file.type.startsWith("image/"));
    }
  };

  const handleUploadDrawioFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        insertBlock(`\`\`\`drawio\n${content.trim()}\n\`\`\``);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
    setInsertAnchorEl(null);
  };

  useEffect(() => {
    if (!isComposingRef.current && value !== localValue) {
      setLocalValue(value);
      localValueRef.current = value;
    }
  }, [value]);

  const historyRef = useRef<HistoryEntry[]>([
    { value, selectionStart: 0, selectionEnd: 0 },
  ]);
  const historyIndexRef = useRef<number>(0);
  const isSuppressingHistoryRef = useRef(false);
  const isComposingRef = useRef(false);

  const pushHistory = useCallback(
    (newValue: string, selStart: number, selEnd: number) => {
      if (isSuppressingHistoryRef.current) return;
      const stack = historyRef.current;
      const current = stack[historyIndexRef.current];
      if (current?.value === newValue) return;

      historyRef.current = stack.slice(0, historyIndexRef.current + 1);
      historyRef.current.push({
        value: newValue,
        selectionStart: selStart,
        selectionEnd: selEnd,
      });
      if (historyRef.current.length > MAX_HISTORY) {
        historyRef.current.shift();
      } else {
        historyIndexRef.current = historyRef.current.length - 1;
      }
    },
    [],
  );

  const applyHistoryEntry = useCallback(
    (entry: HistoryEntry) => {
      isSuppressingHistoryRef.current = true;
      setLocalValue(entry.value);
      onChange(entry.value);
      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(entry.selectionStart, entry.selectionEnd);
        }
        isSuppressingHistoryRef.current = false;
      });
    },
    [onChange],
  );

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    applyHistoryEntry(historyRef.current[historyIndexRef.current]);
  }, [applyHistoryEntry]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    applyHistoryEntry(historyRef.current[historyIndexRef.current]);
  }, [applyHistoryEntry]);

  useEffect(() => {
    if (mentionQuery === null) {
      setSuggestedUsers([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const results = await apiFetch<UserSummaryDto[]>(
          `/users/mentions?q=${encodeURIComponent(mentionQuery)}`,
        );
        setSuggestedUsers(results);
        setSelectedSuggestionIndex(0);
      } catch {
        setSuggestedUsers([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [mentionQuery]);

  const insertText = (prefix: string, suffix = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = localValue.substring(start, end);
    const replacement = prefix + (selected || "text") + suffix;
    const newValue =
      localValue.substring(0, start) + replacement + localValue.substring(end);

    setLocalValue(newValue);
    onChange(newValue);
    const newCursorPos = start + prefix.length + (selected.length || 4);
    pushHistory(newValue, start + prefix.length, newCursorPos);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selected.length || 4),
      );
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isComposingRef.current || e.nativeEvent.isComposing) return;

    if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }
    if (
      (e.ctrlKey || e.metaKey) &&
      (e.key === "y" || (e.key === "z" && e.shiftKey))
    ) {
      e.preventDefault();
      redo();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      onSubmit?.();
      return;
    }

    if (suggestedUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestionIndex(
          (prev) => (prev + 1) % suggestedUsers.length,
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestionIndex(
          (prev) => (prev - 1 + suggestedUsers.length) % suggestedUsers.length,
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(suggestedUsers[selectedSuggestionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === "b") {
      e.preventDefault();
      insertText("**", "**");
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "i") {
      e.preventDefault();
      insertText("*", "*");
      return;
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setLocalValue(text);
    onChange(text);

    const cursorPos = e.target.selectionStart;
    pushHistory(text, cursorPos, cursorPos);

    const textBeforeCursor = text.substring(0, cursorPos);
    const lastAtPos = textBeforeCursor.lastIndexOf("@");

    if (lastAtPos !== -1) {
      const query = textBeforeCursor.substring(lastAtPos + 1);
      if (!query.includes(" ") && !query.includes("\n")) {
        setMentionQuery(query);
        setMentionIndex(lastAtPos);
        return;
      }
    }
    setMentionQuery(null);
  };

  const insertMention = (user: UserSummaryDto) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const currentVal = localValue;
    const textBeforeMention = currentVal.substring(0, mentionIndex);
    const textAfterCursor = currentVal.substring(textarea.selectionStart);
    const mentionTag = `@${user.username} `;

    const newValue = textBeforeMention + mentionTag + textAfterCursor;
    setLocalValue(newValue);
    onChange(newValue);
    pushHistory(
      newValue,
      textBeforeMention.length + mentionTag.length,
      textBeforeMention.length + mentionTag.length,
    );
    setMentionQuery(null);

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        const pos = textBeforeMention.length + mentionTag.length;
        textarea.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const handleTabChange = (
    _: React.SyntheticEvent,
    newTab: "write" | "preview" | "split",
  ) => {
    if (newTab === "preview" || newTab === "split") {
      const h =
        textareaRef.current?.offsetHeight || containerRef.current?.offsetHeight;
      if (h && h > 120) {
        setEditorHeight(h);
      }
    }
    setTabIndex(newTab);
  };

  return (
    <Box
      sx={{
        border: `1px solid ${tokens.border}`,
        borderRadius: "8px",
        backgroundColor: resolvedMode === "dark" ? tokens.surface : "#ffffff",
        position: "relative",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${tokens.border}`,
          px: 1,
          backgroundColor: resolvedMode === "dark" ? "#161b22" : "#f6f8fa",
          borderTopLeftRadius: "7px",
          borderTopRightRadius: "7px",
          overflowX: "auto",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
          gap: 1,
        }}
      >
        <Tabs
          value={tabIndex}
          onChange={handleTabChange}
          sx={{
            minHeight: 36,
            flexShrink: 0,
            "& .MuiTab-root": {
              minHeight: 36,
              py: 0.5,
              px: { xs: 1, sm: 1.5 },
              fontSize: "0.8125rem",
              fontWeight: 600,
            },
          }}
        >
          <Tab value="write" label="Write" />
          <Tab value="preview" label="Preview" />
          <Tab value="split" label="Split View" sx={{ display: { xs: "none", md: "inline-flex" } }} />
        </Tabs>

        {(tabIndex === "write" || tabIndex === "split") && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.25,
              flexShrink: 0,
              py: 0.2,
              "& .MuiIconButton-root": {
                p: 0.6,
                flexShrink: 0,
              },
              "& .MuiButton-root": {
                flexShrink: 0,
              },
            }}
          >
            <Tooltip title="Undo (Ctrl+Z)">
              <span>
                <IconButton
                  size="small"
                  onClick={undo}
                  disabled={!canUndo}
                  sx={{ color: canUndo ? tokens.textSecondary : tokens.border }}
                >
                  <Undo2 size={15} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Redo (Ctrl+Y)">
              <span>
                <IconButton
                  size="small"
                  onClick={redo}
                  disabled={!canRedo}
                  sx={{ color: canRedo ? tokens.textSecondary : tokens.border }}
                >
                  <Redo2 size={15} />
                </IconButton>
              </span>
            </Tooltip>

            <Box sx={{ width: "1px", minWidth: "1px", maxWidth: "1px", height: 16, backgroundColor: tokens.border, mx: 0.5, flexShrink: 0 }} />

            <Tooltip title="Chèn Sơ đồ, Bảng, Alerts & Công thức toán">
              <Button
                size="small"
                variant="outlined"
                onClick={(e) => setInsertAnchorEl(e.currentTarget)}
                startIcon={<Plus size={14} />}
                endIcon={<ChevronDown size={12} />}
                sx={{
                  py: 0.2,
                  px: 1,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  textTransform: "none",
                  borderColor: tokens.border,
                  color: tokens.textPrimary,
                  "&:hover": {
                    borderColor: tokens.primary,
                    backgroundColor: tokens.hover,
                  },
                }}
              >
                Chèn
              </Button>
            </Tooltip>

            <Tooltip title="Dọn dẹp dòng trống thừa & Chuẩn hóa khoảng cách">
              <IconButton
                size="small"
                onClick={handleCleanContent}
                sx={{ color: tokens.textSecondary }}
              >
                <Wand2 size={15} />
              </IconButton>
            </Tooltip>

            <Box sx={{ width: "1px", minWidth: "1px", maxWidth: "1px", height: 16, backgroundColor: tokens.border, mx: 0.5, flexShrink: 0 }} />

            <Tooltip title="Tiêu đề (Heading)">
              <IconButton
                size="small"
                onClick={() => insertText("### ")}
                sx={{ color: tokens.textSecondary }}
              >
                <Heading size={15} />
              </IconButton>
            </Tooltip>
            <Tooltip title="In đậm (Ctrl+B)">
              <IconButton
                size="small"
                onClick={() => insertText("**", "**")}
                sx={{ color: tokens.textSecondary }}
              >
                <Bold size={15} />
              </IconButton>
            </Tooltip>
            <Tooltip title="In nghiêng (Ctrl+I)">
              <IconButton
                size="small"
                onClick={() => insertText("*", "*")}
                sx={{ color: tokens.textSecondary }}
              >
                <Italic size={15} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Mã nội dòng (Inline Code)">
              <IconButton
                size="small"
                onClick={() => insertText("`", "`")}
                sx={{ color: tokens.textSecondary }}
              >
                <Code size={15} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Trích dẫn (Quote)">
              <IconButton
                size="small"
                onClick={() => insertText("> ")}
                sx={{ color: tokens.textSecondary }}
              >
                <Quote size={15} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Danh sách công việc (Checklist)">
              <IconButton
                size="small"
                onClick={() => insertText("- [ ] ")}
                sx={{ color: tokens.textSecondary }}
              >
                <CheckSquare size={15} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Khối code (Code Block)">
              <IconButton
                size="small"
                onClick={() => insertText("```ts\n", "\n```")}
                sx={{ color: tokens.textSecondary }}
              >
                <FileCode size={15} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Đường dẫn (Link)">
              <IconButton
                size="small"
                onClick={() => insertText("[", "](url)")}
                sx={{ color: tokens.textSecondary }}
              >
                <LinkIcon size={15} />
              </IconButton>
            </Tooltip>

            <Box sx={{ width: "1px", minWidth: "1px", maxWidth: "1px", height: 16, backgroundColor: tokens.border, mx: 0.5, flexShrink: 0 }} />

            <Tooltip title="Chèn ảnh">
              <IconButton
                size="small"
                onClick={() => imageInputRef.current?.click()}
                disabled={isUploading}
                sx={{ color: tokens.textSecondary }}
              >
                <ImageIcon size={15} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Đính kèm tệp tin">
              <IconButton
                size="small"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                sx={{ color: tokens.textSecondary }}
              >
                <Paperclip size={15} />
              </IconButton>
            </Tooltip>

            <Tooltip title="Ghi âm tin nhắn thoại">
              <IconButton
                size="small"
                onClick={() => setIsRecordingVoice((prev) => !prev)}
                sx={{
                  color: isRecordingVoice ? tokens.error : tokens.textSecondary,
                }}
              >
                <Mic size={15} />
              </IconButton>
            </Tooltip>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadFile(file, true);
                e.target.value = "";
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadFile(file, false);
                e.target.value = "";
              }}
            />
            <input
              ref={drawioInputRef}
              type="file"
              accept=".drawio,.xml"
              style={{ display: "none" }}
              onChange={handleUploadDrawioFile}
            />
          </Box>
        )}
      </Box>

      <Menu
        anchorEl={insertAnchorEl}
        open={isInsertMenuOpen}
        onClose={() => setInsertAnchorEl(null)}
        PaperProps={{
          sx: {
            maxHeight: 460,
            width: 290,
            backgroundColor: tokens.surface,
            border: `1px solid ${tokens.border}`,
            boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
          },
        }}
      >
        <ListSubheader
          disableSticky
          sx={{
            backgroundColor: tokens.surface,
            fontWeight: 700,
            fontSize: "0.75rem",
            color: "#f97316",
            lineHeight: "28px",
          }}
        >
          SƠ ĐỒ DRAW.IO (DIAGRAMS.NET)
        </ListSubheader>

        <MenuItem
          onClick={() =>
            insertBlock(
              "```drawio\n<mxfile host=\"app.diagrams.net\">\n  <diagram name=\"Trang 1\" id=\"p1\">\n    <mxGraphModel dx=\"1422\" dy=\"794\" grid=\"1\" gridSize=\"10\" guides=\"1\" tooltips=\"1\" connect=\"1\" arrows=\"1\" fold=\"1\" page=\"1\" pageScale=\"1\" pageWidth=\"827\" pageHeight=\"1169\">\n      <root>\n        <mxCell id=\"0\" />\n        <mxCell id=\"1\" parent=\"0\" />\n        <mxCell id=\"2\" value=\"Frontend Client\" style=\"rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;\" vertex=\"1\" parent=\"1\">\n          <mxGeometry x=\"120\" y=\"120\" width=\"140\" height=\"60\" as=\"geometry\" />\n        </mxCell>\n        <mxCell id=\"3\" value=\"Reported Backend API\" style=\"rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;\" vertex=\"1\" parent=\"1\">\n          <mxGeometry x=\"340\" y=\"120\" width=\"160\" height=\"60\" as=\"geometry\" />\n        </mxCell>\n        <mxCell id=\"4\" value=\"Database\" style=\"shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#ffe6cc;strokeColor=#d79b00;\" vertex=\"1\" parent=\"1\">\n          <mxGeometry x=\"580\" y=\"110\" width=\"100\" height=\"80\" as=\"geometry\" />\n        </mxCell>\n        <mxCell id=\"5\" style=\"edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;\" edge=\"1\" parent=\"1\" source=\"2\" target=\"3\">\n          <mxGeometry relative=\"1\" as=\"geometry\" />\n        </mxCell>\n        <mxCell id=\"6\" style=\"edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;\" edge=\"1\" parent=\"1\" source=\"3\" target=\"4\">\n          <mxGeometry relative=\"1\" as=\"geometry\" />\n        </mxCell>\n      </root>\n    </mxGraphModel>\n  </diagram>\n</mxfile>\n```",
            )
          }
        >
          <ListItemIcon sx={{ minWidth: 28, color: "#f97316" }}>
            <FileCode size={15} />
          </ListItemIcon>
          <ListItemText
            primary="Khối mã Draw.io (XML Template)"
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>

        <MenuItem
          onClick={() =>
            insertBlock(
              "[Sơ đồ Kiến trúc Hệ thống (Draw.io)](https://example.com/diagram.drawio)",
            )
          }
        >
          <ListItemIcon sx={{ minWidth: 28, color: "#f97316" }}>
            <LinkIcon size={15} />
          </ListItemIcon>
          <ListItemText
            primary="Liên kết tệp Draw.io (.drawio)"
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>

        <MenuItem
          onClick={() => drawioInputRef.current?.click()}
        >
          <ListItemIcon sx={{ minWidth: 28, color: "#f97316" }}>
            <Upload size={15} />
          </ListItemIcon>
          <ListItemText
            primary="Nạp tệp .drawio từ máy..."
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>

        <Divider />

        <ListSubheader
          disableSticky
          sx={{
            backgroundColor: tokens.surface,
            fontWeight: 700,
            fontSize: "0.75rem",
            color: tokens.primary,
            lineHeight: "28px",
          }}
        >
          SƠ ĐỒ ĐỒ HỌA (MERMAID)
        </ListSubheader>

        <MenuItem
          onClick={() =>
            insertBlock(
              "```mermaid\nflowchart TD\n    A[Bắt đầu] --> B{Điều kiện}\n    B -->|Đúng| C[Xử lý thành công]\n    B -->|Sai| D[Thử lại]\n```",
            )
          }
        >
          <ListItemIcon sx={{ minWidth: 28, color: tokens.textSecondary }}>
            <Layers size={15} />
          </ListItemIcon>
          <ListItemText
            primary="Flowchart (Lưu đồ quy trình)"
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>

        <MenuItem
          onClick={() =>
            insertBlock(
              "```mermaid\nsequenceDiagram\n    actor User\n    participant Web as Frontend\n    participant API as Backend\n    participant DB as Database\n    User->>Web: Bấm nút hành động\n    Web->>API: POST /api/v1/resource\n    API->>DB: Ghi dữ liệu\n    DB-->>API: Phản hồi 200 OK\n    API-->>Web: Dữ liệu JSON\n    Web-->>User: Hiển thị kết quả\n```",
            )
          }
        >
          <ListItemIcon sx={{ minWidth: 28, color: tokens.textSecondary }}>
            <Layers size={15} />
          </ListItemIcon>
          <ListItemText
            primary="Sequence (Luồng tương tác API)"
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>

        <MenuItem
          onClick={() =>
            insertBlock(
              "```mermaid\nclassDiagram\n    class Issue {\n        +string id\n        +string title\n        +string status\n        +assign(user)\n        +close()\n    }\n    class User {\n        +string id\n        +string username\n        +string email\n    }\n    Issue --> User : người thực hiện\n```",
            )
          }
        >
          <ListItemIcon sx={{ minWidth: 28, color: tokens.textSecondary }}>
            <Layers size={15} />
          </ListItemIcon>
          <ListItemText
            primary="Class Diagram (Sơ đồ lớp OOP)"
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>

        <MenuItem
          onClick={() =>
            insertBlock(
              "```mermaid\nstateDiagram-v2\n    [*] --> KhởiTạo\n    KhởiTạo --> ĐangXửLý : Bắt đầu\n    ĐangXửLý --> ChờDuyệt : Tạo Pull Request\n    ChờDuyệt --> HoànThành : Phê duyệt\n    HoànThành --> [*]\n```",
            )
          }
        >
          <ListItemIcon sx={{ minWidth: 28, color: tokens.textSecondary }}>
            <Layers size={15} />
          </ListItemIcon>
          <ListItemText
            primary="State Machine (Vòng đời trạng thái)"
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>

        <MenuItem
          onClick={() =>
            insertBlock(
              "```mermaid\nerDiagram\n    USERS ||--o{ ISSUES : creates\n    USERS {\n        string id PK\n        string username\n        string email\n    }\n    ISSUES {\n        string id PK\n        string title\n        string author_id FK\n    }\n```",
            )
          }
        >
          <ListItemIcon sx={{ minWidth: 28, color: tokens.textSecondary }}>
            <Layers size={15} />
          </ListItemIcon>
          <ListItemText
            primary="ERD (Cơ sở dữ liệu quan hệ)"
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>

        <MenuItem
          onClick={() =>
            insertBlock(
              '```mermaid\ngitGraph\n    commit id: "Initial"\n    branch feature/diagrams\n    checkout feature/diagrams\n    commit id: "Add Mermaid"\n    commit id: "Add KaTeX"\n    checkout main\n    merge feature/diagrams id: "Merge PR #42"\n    commit id: "Release v1.2"\n```',
            )
          }
        >
          <ListItemIcon sx={{ minWidth: 28, color: tokens.textSecondary }}>
            <GitBranch size={15} />
          </ListItemIcon>
          <ListItemText
            primary="Git Graph (Mô hình nhánh Git)"
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>

        <MenuItem
          onClick={() =>
            insertBlock(
              "```mermaid\ngantt\n    title Kế hoạch Sprint\n    dateFormat YYYY-MM-DD\n    section Thiết kế\n        Nghiên cứu kiến trúc :des1, 2026-09-01, 7d\n    section Phát triển\n        Triển khai Components :dev1, after des1, 10d\n        Tích hợp API :dev2, after des1, 8d\n    section Kiểm thử\n        Kiểm thử chức năng :test1, after dev1, 5d\n```",
            )
          }
        >
          <ListItemIcon sx={{ minWidth: 28, color: tokens.textSecondary }}>
            <Layers size={15} />
          </ListItemIcon>
          <ListItemText
            primary="Gantt Chart (Lộ trình Roadmap)"
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>

        <MenuItem
          onClick={() =>
            insertBlock(
              "```mermaid\nmindmap\n  root((Hệ thống))\n    Tính năng\n      Quản lý lỗi\n      Review mã nguồn\n      Thảo luận nhóm\n    Đồ họa\n      Mermaid Suite\n      KaTeX Math\n    Bảo mật\n      Strict Sanitization\n      RBAC\n```",
            )
          }
        >
          <ListItemIcon sx={{ minWidth: 28, color: tokens.textSecondary }}>
            <Sparkles size={15} />
          </ListItemIcon>
          <ListItemText
            primary="Mindmap (Sơ đồ tư duy)"
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>

        <MenuItem
          onClick={() =>
            insertBlock(
              '```mermaid\npie title Phân bổ trạng thái công việc\n    "Đã hoàn thành" : 65\n    "Đang xử lý" : 25\n    "Chờ giải quyết" : 10\n```',
            )
          }
        >
          <ListItemIcon sx={{ minWidth: 28, color: tokens.textSecondary }}>
            <Layers size={15} />
          </ListItemIcon>
          <ListItemText
            primary="Pie Chart (Biểu đồ tròn tỷ lệ)"
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>

        <MenuItem
          onClick={() =>
            insertBlock(
              "```mermaid\ntimeline\n    title Dòng thời gian dự án\n    2026 Q1 : Khởi tạo kiến trúc : Thiết kế Monorepo\n    2026 Q2 : Tính năng cộng tác : Thảo luận thời gian thực : Tin nhắn thoại\n    2026 Q3 : Full Markdown & Diagrams : Mermaid Suite : KaTeX Math\n```",
            )
          }
        >
          <ListItemIcon sx={{ minWidth: 28, color: tokens.textSecondary }}>
            <Layers size={15} />
          </ListItemIcon>
          <ListItemText
            primary="Timeline (Dòng thời gian mốc)"
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>

        <Divider />

        <ListSubheader
          disableSticky
          sx={{
            backgroundColor: tokens.surface,
            fontWeight: 700,
            fontSize: "0.75rem",
            color: tokens.primary,
            lineHeight: "28px",
          }}
        >
          TOÁN HỌC & CÔNG THỨC (KATEX)
        </ListSubheader>

        <MenuItem onClick={() => insertBlock("$E = mc^2$")}>
          <ListItemIcon sx={{ minWidth: 28, color: tokens.textSecondary }}>
            <Sigma size={15} />
          </ListItemIcon>
          <ListItemText
            primary="Công thức nội dòng ($...$)"
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>

        <MenuItem
          onClick={() =>
            insertBlock(
              "$$\nf(x) = \\int_{-\\infty}^{\\infty} \\hat{f}(\\xi)\\,e^{2 \\pi i \\xi x}\\,d\\xi\n$$",
            )
          }
        >
          <ListItemIcon sx={{ minWidth: 28, color: tokens.textSecondary }}>
            <Sigma size={15} />
          </ListItemIcon>
          <ListItemText
            primary="Khối công thức toán ($$...$$)"
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>

        <Divider />

        <ListSubheader
          disableSticky
          sx={{
            backgroundColor: tokens.surface,
            fontWeight: 700,
            fontSize: "0.75rem",
            color: tokens.primary,
            lineHeight: "28px",
          }}
        >
          HỘP CHÚ THÍCH (GITHUB ALERTS)
        </ListSubheader>

        <MenuItem onClick={() => insertBlock("> [!NOTE]\n> Thông tin cần lưu ý ở đây...")}>
          <ListItemText
            primary="[!NOTE] - Chú ý thông tin"
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>
        <MenuItem onClick={() => insertBlock("> [!TIP]\n> Mẹo hay giúp tối ưu hiệu năng...")}>
          <ListItemText
            primary="[!TIP] - Gợi ý / Mẹo hay"
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>
        <MenuItem onClick={() => insertBlock("> [!IMPORTANT]\n> Yêu cầu kiến trúc quan trọng...")}>
          <ListItemText
            primary="[!IMPORTANT] - Quan trọng"
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>
        <MenuItem onClick={() => insertBlock("> [!WARNING]\n> Cảnh báo thay đổi phá vỡ tương thích...")}>
          <ListItemText
            primary="[!WARNING] - Cảnh báo"
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>
        <MenuItem onClick={() => insertBlock("> [!CAUTION]\n> Thao tác nguy hiểm có thể mất dữ liệu...")}>
          <ListItemText
            primary="[!CAUTION] - Rủi ro cao"
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>

        <Divider />

        <ListSubheader
          disableSticky
          sx={{
            backgroundColor: tokens.surface,
            fontWeight: 700,
            fontSize: "0.75rem",
            color: tokens.primary,
            lineHeight: "28px",
          }}
        >
          CẤU TRÚC & BẢNG BIỂU
        </ListSubheader>

        <MenuItem
          onClick={() =>
            insertBlock(
              "| Tiêu đề 1 | Tiêu đề 2 (giữa) | Tiêu đề 3 (phải) |\n| :--- | :---: | ---: |\n| Dữ liệu A | Trung tâm | 100,000 đ |\n| Dữ liệu B | Hoàn thành | 250,000 đ |",
            )
          }
        >
          <ListItemIcon sx={{ minWidth: 28, color: tokens.textSecondary }}>
            <TableIcon size={15} />
          </ListItemIcon>
          <ListItemText
            primary="Bảng 3x3 kèm căn lề"
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>

        <MenuItem
          onClick={() =>
            insertBlock(
              "<details>\n<summary>Bấm để xem chi tiết</summary>\n\nNội dung mở rộng nằm ở đây...\n\n</details>",
            )
          }
        >
          <ListItemIcon sx={{ minWidth: 28, color: tokens.textSecondary }}>
            <FileText size={15} />
          </ListItemIcon>
          <ListItemText
            primary="Khối thu gọn (Details/Summary)"
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>

        <MenuItem onClick={() => insertBlock("<kbd>Ctrl</kbd> + <kbd>C</kbd>")}>
          <ListItemText
            primary="Phím tắt bàn phím (<kbd>)"
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>

        <MenuItem onClick={() => insertBlock("<mark>văn bản nổi bật</mark>")}>
          <ListItemText
            primary="Đánh dấu nổi bật (<mark>)"
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>

        <Divider />

        <ListSubheader
          disableSticky
          sx={{
            backgroundColor: tokens.surface,
            fontWeight: 700,
            fontSize: "0.75rem",
            color: tokens.primary,
            lineHeight: "28px",
          }}
        >
          MÃ NGUỒN CÓ HIGHLIGHT (CODE BLOCKS)
        </ListSubheader>

        <MenuItem
          onClick={() =>
            insertBlock(
              "```typescript\ninterface UserProfile {\n  id: string;\n  name: string;\n  role: \"ADMIN\" | \"USER\";\n}\n```",
            )
          }
        >
          <ListItemIcon sx={{ minWidth: 28, color: tokens.textSecondary }}>
            <FileCode size={15} />
          </ListItemIcon>
          <ListItemText
            primary="TypeScript / JavaScript"
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>

        <MenuItem
          onClick={() =>
            insertBlock(
              "```python\ndef calculate_metrics(data: list[float]) -> dict[str, float]:\n    return {\"mean\": sum(data) / len(data)}\n```",
            )
          }
        >
          <ListItemIcon sx={{ minWidth: 28, color: tokens.textSecondary }}>
            <FileCode size={15} />
          </ListItemIcon>
          <ListItemText
            primary="Python"
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>

        <MenuItem
          onClick={() =>
            insertBlock(
              "```sql\nSELECT u.id, u.username, COUNT(i.id) AS total_issues\nFROM users u\nLEFT JOIN issues i ON i.author_id = u.id\nGROUP BY u.id;\n```",
            )
          }
        >
          <ListItemIcon sx={{ minWidth: 28, color: tokens.textSecondary }}>
            <FileCode size={15} />
          </ListItemIcon>
          <ListItemText
            primary="SQL Query"
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>

        <MenuItem
          onClick={() =>
            insertBlock(
              "```json\n{\n  \"status\": \"success\",\n  \"data\": {\n    \"id\": \"issue-123\",\n    \"priority\": \"HIGH\"\n  }\n}\n```",
            )
          }
        >
          <ListItemIcon sx={{ minWidth: 28, color: tokens.textSecondary }}>
            <FileCode size={15} />
          </ListItemIcon>
          <ListItemText
            primary="JSON Payload"
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>

        <MenuItem
          onClick={() =>
            insertBlock(
              "```bash\npnpm install\npnpm dev\n```",
            )
          }
        >
          <ListItemIcon sx={{ minWidth: 28, color: tokens.textSecondary }}>
            <FileCode size={15} />
          </ListItemIcon>
          <ListItemText
            primary="Bash / Shell"
            primaryTypographyProps={{ fontSize: "0.8125rem" }}
          />
        </MenuItem>
      </Menu>

      {isUploading && (
        <Box
          sx={{
            px: 2,
            py: 1.2,
            backgroundColor: `${tokens.primary}0c`,
            borderBottom: `1px solid ${tokens.border}`,
            display: "flex",
            flexDirection: "column",
            gap: 0.8,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
              <CircularProgress size={14} thickness={5} sx={{ color: tokens.primary, flexShrink: 0 }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: tokens.textPrimary, fontSize: "0.8125rem" }} noWrap>
                Đang tải lên: {uploadingFileName || "tệp tin"}
              </Typography>
              {uploadingFileSize && (
                <Typography variant="caption" sx={{ color: tokens.textSecondary, flexShrink: 0 }}>
                  ({uploadingFileSize})
                </Typography>
              )}
            </Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: tokens.primary, ml: 1, flexShrink: 0 }}>
              {uploadProgress}%
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 4, borderRadius: 2 }} />
        </Box>
      )}

      {uploadError && (
        <Box
          sx={{
            px: 2,
            py: 1,
            backgroundColor: `${tokens.error}10`,
            borderBottom: `1px solid ${tokens.error}30`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: tokens.error,
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            {uploadError}
          </Typography>
          <IconButton size="small" onClick={() => setUploadError(null)} sx={{ p: 0.2, color: tokens.error }}>
            <X size={14} />
          </IconButton>
        </Box>
      )}

      {isRecordingVoice && (
        <Box sx={{ px: 1.5, pt: 1 }}>
          <VoiceRecorder
            targetType={targetType}
            targetId={targetId}
            onRecorded={(res) => {
              insertAtCursor(`\n[Audio: Tin nhắn thoại](${res.url})\n`);
              setIsRecordingVoice(false);
            }}
            onCancel={() => setIsRecordingVoice(false)}
          />
        </Box>
      )}

      {tabIndex === "split" ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            minHeight: editorHeight || 320,
          }}
        >
          <Box
            ref={containerRef}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            sx={{
              flex: 1,
              p: 1.5,
              position: "relative",
              borderRight: { md: `1px solid ${tokens.border}` },
              borderBottom: { xs: `1px solid ${tokens.border}`, md: "none" },
            }}
          >
            <TextField
              inputRef={textareaRef}
              multiline
              minRows={minRows}
              fullWidth
              value={localValue}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              onCompositionStart={() => {
                isComposingRef.current = true;
              }}
              onCompositionEnd={(e) => {
                isComposingRef.current = false;
                const target = e.target as HTMLTextAreaElement;
                const text = target.value;
                setLocalValue(text);
                onChange(text);
                pushHistory(text, target.selectionStart, target.selectionEnd);
              }}
              placeholder={placeholder}
              variant="standard"
              InputProps={{
                disableUnderline: true,
                sx: {
                  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  fontSize: "0.875rem",
                  lineHeight: 1.65,
                },
              }}
            />
          </Box>

          <Box
            sx={{
              flex: 1,
              p: 2,
              overflowY: "auto",
              maxHeight: editorHeight ? Math.max(editorHeight, 460) : 560,
              backgroundColor: resolvedMode === "dark" ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.015)",
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: "block",
                mb: 1,
                color: tokens.textSecondary,
                fontWeight: 700,
                textTransform: "uppercase",
                fontSize: "0.6875rem",
                letterSpacing: "0.05em",
              }}
            >
              Xem trước trực tiếp (Live Preview)
            </Typography>
            {debouncedPreviewValue ? (
              <MarkdownRenderer content={debouncedPreviewValue} />
            ) : (
              <Typography variant="body2" sx={{ color: tokens.textSecondary, fontStyle: "italic", fontSize: "0.8125rem" }}>
                Nhập nội dung ở khung bên trái để xem trước sơ đồ và định dạng...
              </Typography>
            )}
          </Box>
        </Box>
      ) : tabIndex === "write" ? (
        <Box
          ref={containerRef}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          sx={{ p: 1.5, position: "relative" }}
        >
          <TextField
            inputRef={textareaRef}
            multiline
            minRows={minRows}
            fullWidth
            value={localValue}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onCompositionStart={() => {
              isComposingRef.current = true;
            }}
            onCompositionEnd={(e) => {
              isComposingRef.current = false;
              const target = e.target as HTMLTextAreaElement;
              const text = target.value;
              setLocalValue(text);
              onChange(text);
              pushHistory(text, target.selectionStart, target.selectionEnd);
            }}
            placeholder={placeholder}
            variant="standard"
            InputProps={{
              disableUnderline: true,
              sx: {
                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: "0.875rem",
                lineHeight: 1.65,
                letterSpacing: "normal",
                "& textarea": {
                  letterSpacing: "normal !important",
                },
                "& code": {
                  fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
                },
              },
            }}
          />

          {suggestedUsers.length > 0 && (
            <Paper
              elevation={4}
              sx={{
                position: "absolute",
                top: 50,
                left: 20,
                width: 240,
                maxHeight: 200,
                overflowY: "auto",
                zIndex: 100,
                backgroundColor: tokens.surface,
                border: `1px solid ${tokens.border}`,
                borderRadius: "6px",
              }}
            >
              <List dense sx={{ py: 0.5 }}>
                {suggestedUsers.map((u, i) => (
                  <ListItemButton
                    key={u.id}
                    selected={i === selectedSuggestionIndex}
                    onClick={() => insertMention(u)}
                    sx={{
                      py: 0.5,
                      "&.Mui-selected": { backgroundColor: tokens.hover },
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 30 }}>
                      <UserAvatar user={u} size={22} showTooltip={false} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={u.displayName}
                      secondary={`@${u.username}`}
                      primaryTypographyProps={{
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                      }}
                      secondaryTypographyProps={{ fontSize: "0.75rem" }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          )}
        </Box>
      ) : (
        <Box sx={{ p: 2, minHeight: editorHeight || 120, boxSizing: "border-box" }}>
          {localValue ? (
            <MarkdownRenderer content={localValue} />
          ) : (
            <Typography variant="body2" sx={{ color: tokens.textSecondary, fontStyle: "italic" }}>
              Chưa có nội dung để xem trước.
            </Typography>
          )}
        </Box>
      )}

      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          px: 1.5,
          py: 0.5,
          borderTop: `1px solid ${tokens.border}`,
          fontSize: "0.6875rem",
          color: tokens.textSecondary,
        }}
      >
        <span>
          <code>Ctrl+Z</code> hoàn tác · <code>Ctrl+Enter</code> gửi bài
        </span>
      </Box>
    </Box>
  );
};

export const MarkdownEditor = React.memo(MarkdownEditorComponent);
