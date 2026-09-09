import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box, Tabs, Tab, IconButton, Tooltip, TextField, Paper, List, ListItemButton,
  ListItemAvatar, ListItemText, Typography, LinearProgress, CircularProgress
} from '@mui/material';
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
  X
} from 'lucide-react';
import { MarkdownRenderer } from '../markdown/MarkdownRenderer';
import { UserAvatar } from '../common/UserAvatar';
import { UserSummaryDto } from '@reported/contracts';
import { useThemeContext } from '../../contexts/ThemeContext';
import { apiFetch } from '../../api/client';
import { uploadFileWithChunking } from '../../utils/chunkedUpload';
import { VoiceRecorder } from '../common/VoiceRecorder';

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
const HISTORY_DEBOUNCE_MS = 400;

const MarkdownEditorComponent: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = 'Leave a comment or description (Markdown supported)...',
  minRows = 4,
  onSubmit,
  targetType,
  targetId
}) => {
  const { tokens, resolvedMode } = useThemeContext();
  const [tabIndex, setTabIndex] = useState<'write' | 'preview'>('write');
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

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [uploadingFileSize, setUploadingFileSize] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const insertAtCursor = (insertStr: string) => {
    const currentVal = localValueRef.current || '';
    const textarea = textareaRef.current;
    let cursor = currentVal.length;
    if (textarea && typeof textarea.selectionStart === 'number' && document.activeElement === textarea) {
      cursor = textarea.selectionStart;
    }
    const textBefore = currentVal.substring(0, cursor);
    const textAfter = currentVal.substring(cursor);
    const nextValue = textBefore + insertStr + textAfter;
    setLocalValue(nextValue);
    localValueRef.current = nextValue;
    onChange(nextValue);
    pushHistory(nextValue, cursor + insertStr.length, cursor + insertStr.length);
  };

  const handleUploadFile = async (file: File, isImg: boolean) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setUploadingFileName(file.name);
    const sizeStr = file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(1)} KB`
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    setUploadingFileSize(sizeStr);

    try {
      const res = await uploadFileWithChunking(file, file.name, {
        targetType,
        targetId,
        onProgress: (pct) => setUploadProgress(pct)
      });
      const isImage = isImg || file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|mkv|avi)$/i.test(file.name);

      if (isImage) {
        insertAtCursor(`\n![${file.name}](${res.inlineUrl})\n`);
      } else if (isVideo) {
        insertAtCursor(`\n[🎬 Video: ${file.name}](${res.inlineUrl})\n`);
      } else {
        insertAtCursor(`\n[📎 ${file.name}](${res.url})\n`);
      }
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Tải lên tệp thất bại';
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
      handleUploadFile(file, file.type.startsWith('image/'));
      return;
    }
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'file') {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          handleUploadFile(file, file.type.startsWith('image/'));
          return;
        }
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      handleUploadFile(file, file.type.startsWith('image/'));
    }
  };

  useEffect(() => {
    if (!isComposingRef.current && value !== localValue) {
      setLocalValue(value);
      localValueRef.current = value;
    }
  }, [value]);

  const historyRef = useRef<HistoryEntry[]>([{ value, selectionStart: 0, selectionEnd: 0 }]);
  const historyIndexRef = useRef<number>(0);
  const isSuppressingHistoryRef = useRef(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isComposingRef = useRef(false);

  const pushHistory = useCallback((newValue: string, selStart: number, selEnd: number) => {
    if (isSuppressingHistoryRef.current) return;
    const stack = historyRef.current;
    const current = stack[historyIndexRef.current];
    if (current?.value === newValue) return;

    historyRef.current = stack.slice(0, historyIndexRef.current + 1);
    historyRef.current.push({ value: newValue, selectionStart: selStart, selectionEnd: selEnd });
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current = historyRef.current.length - 1;
    }
  }, []);

  const applyHistoryEntry = useCallback((entry: HistoryEntry) => {
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
  }, [onChange]);

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
        const results = await apiFetch<UserSummaryDto[]>(`/users/mentions?q=${encodeURIComponent(mentionQuery)}`);
        setSuggestedUsers(results);
        setSelectedSuggestionIndex(0);
      } catch {
        setSuggestedUsers([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [mentionQuery]);

  const insertText = (prefix: string, suffix = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end);
    const replacement = prefix + (selected || 'text') + suffix;
    const newValue = value.substring(0, start) + replacement + value.substring(end);

    setLocalValue(newValue);
    onChange(newValue);
    const newCursorPos = start + prefix.length + (selected.length || 4);
    pushHistory(newValue, start + prefix.length, newCursorPos);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected.length || 4));
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isComposingRef.current || e.nativeEvent.isComposing) return;

    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      redo();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onSubmit?.();
      return;
    }

    if (suggestedUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev + 1) % suggestedUsers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev - 1 + suggestedUsers.length) % suggestedUsers.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(suggestedUsers[selectedSuggestionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setMentionQuery(null);
        return;
      }
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursor = e.target.selectionStart;
    setLocalValue(text);

    if (isComposingRef.current) return;

    onChange(text);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const textarea = textareaRef.current;
      const sel = textarea ? textarea.selectionStart : cursor;
      pushHistory(text, sel, sel);
    }, HISTORY_DEBOUNCE_MS);

    const textBeforeCursor = text.substring(0, cursor);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9_-]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionIndex(cursor - match[0].length);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (user: UserSummaryDto) => {
    if (mentionIndex === -1) return;
    const textarea = textareaRef.current;
    const cursor = textarea ? textarea.selectionStart : value.length;

    const textBeforeMention = value.substring(0, mentionIndex);
    const textAfterCursor = value.substring(cursor);
    const mentionTag = `@${user.username} `;
    const nextValue = textBeforeMention + mentionTag + textAfterCursor;

    onChange(nextValue);
    pushHistory(nextValue, textBeforeMention.length + mentionTag.length, textBeforeMention.length + mentionTag.length);
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

  const handleTabChange = (_: React.SyntheticEvent, newTab: 'write' | 'preview') => {
    if (newTab === 'preview') {
      const h = textareaRef.current?.offsetHeight || containerRef.current?.offsetHeight;
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
        borderRadius: '6px',
        backgroundColor: resolvedMode === 'dark' ? tokens.surface : '#ffffff',
        position: 'relative'
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${tokens.border}`,
          px: 1,
          backgroundColor: resolvedMode === 'dark' ? '#161b22' : '#f6f8fa',
          borderTopLeftRadius: '5px',
          borderTopRightRadius: '5px'
        }}
      >
        <Tabs
          value={tabIndex}
          onChange={handleTabChange}
          sx={{ minHeight: 36, '& .MuiTab-root': { minHeight: 36, py: 0.5, px: 1.5, fontSize: '0.8125rem' } }}
        >
          <Tab value="write" label="Write" />
          <Tab value="preview" label="Preview" />
        </Tabs>

        {tabIndex === 'write' && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2, overflowX: 'auto', maxWidth: '100%', py: 0.2 }}>
            <Tooltip title="Undo (Ctrl+Z)">
              <span>
                <IconButton size="small" onClick={undo} disabled={!canUndo} sx={{ color: canUndo ? tokens.textSecondary : tokens.border }}>
                  <Undo2 size={15} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Redo (Ctrl+Y)">
              <span>
                <IconButton size="small" onClick={redo} disabled={!canRedo} sx={{ color: canRedo ? tokens.textSecondary : tokens.border }}>
                  <Redo2 size={15} />
                </IconButton>
              </span>
            </Tooltip>
            <Box sx={{ width: 1, height: 16, backgroundColor: tokens.border, mx: 0.3 }} />
            <Tooltip title="Heading">
              <IconButton size="small" onClick={() => insertText('### ')} sx={{ color: tokens.textSecondary }}>
                <Heading size={15} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Bold (Ctrl+B)">
              <IconButton size="small" onClick={() => insertText('**', '**')} sx={{ color: tokens.textSecondary }}>
                <Bold size={15} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Italic (Ctrl+I)">
              <IconButton size="small" onClick={() => insertText('*', '*')} sx={{ color: tokens.textSecondary }}>
                <Italic size={15} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Inline Code">
              <IconButton size="small" onClick={() => insertText('`', '`')} sx={{ color: tokens.textSecondary }}>
                <Code size={15} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Quote">
              <IconButton size="small" onClick={() => insertText('> ')} sx={{ color: tokens.textSecondary }}>
                <Quote size={15} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Checklist">
              <IconButton size="small" onClick={() => insertText('- [ ] ')} sx={{ color: tokens.textSecondary }}>
                <CheckSquare size={15} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Code Block">
              <IconButton size="small" onClick={() => insertText('```ts\n', '\n```')} sx={{ color: tokens.textSecondary }}>
                <FileCode size={15} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Link">
              <IconButton size="small" onClick={() => insertText('[', '](url)')} sx={{ color: tokens.textSecondary }}>
                <LinkIcon size={15} />
              </IconButton>
            </Tooltip>

            <Box sx={{ width: 1, height: 16, backgroundColor: tokens.divider, mx: 0.5 }} />

            <Tooltip title="Chèn ảnh (hoặc dán Ctrl+V)">
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
                onClick={() => setIsRecordingVoice(prev => !prev)}
                sx={{ color: isRecordingVoice ? tokens.error : tokens.textSecondary }}
              >
                <Mic size={15} />
              </IconButton>
            </Tooltip>

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadFile(file, true);
                e.target.value = '';
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUploadFile(file, false);
                e.target.value = '';
              }}
            />
          </Box>
        )}
      </Box>

      {isUploading && (
        <Box
          sx={{
            px: 2,
            py: 1.2,
            backgroundColor: `${tokens.primary}0c`,
            borderBottom: `1px solid ${tokens.border}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.8
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              <CircularProgress size={14} thickness={5} sx={{ color: tokens.primary, flexShrink: 0 }} />
              <Typography variant="body2" sx={{ fontWeight: 600, color: tokens.textPrimary, fontSize: '0.8125rem' }} noWrap>
                Đang tải lên: {uploadingFileName || 'tệp tin'}
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: tokens.error
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
              insertAtCursor(`\n[🎙️ Tin nhắn thoại](${res.url})\n`);
              setIsRecordingVoice(false);
            }}
            onCancel={() => setIsRecordingVoice(false)}
          />
        </Box>
      )}

      {tabIndex === 'write' ? (
        <Box
          ref={containerRef}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          sx={{ p: 1.5, position: 'relative' }}
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
            onCompositionStart={() => { isComposingRef.current = true; }}
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
                fontSize: '0.875rem',
                lineHeight: 1.65,
                letterSpacing: 'normal',
                '& textarea': {
                  letterSpacing: 'normal !important'
                },
                '& code': { fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace' }
              }
            }}
          />

          {suggestedUsers.length > 0 && (
            <Paper
              elevation={4}
              sx={{
                position: 'absolute',
                top: 50,
                left: 20,
                width: 240,
                maxHeight: 200,
                overflowY: 'auto',
                zIndex: 100,
                backgroundColor: tokens.surface,
                border: `1px solid ${tokens.border}`,
                borderRadius: '6px'
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
                      '&.Mui-selected': { backgroundColor: tokens.hover }
                    }}
                  >
                    <ListItemAvatar sx={{ minWidth: 30 }}>
                      <UserAvatar user={u} size={22} showTooltip={false} />
                    </ListItemAvatar>
                    <ListItemText
                      primary={u.displayName}
                      secondary={`@${u.username}`}
                      primaryTypographyProps={{ fontSize: '0.8125rem', fontWeight: 600 }}
                      secondaryTypographyProps={{ fontSize: '0.75rem' }}
                    />
                  </ListItemButton>
                ))}
              </List>
            </Paper>
          )}
        </Box>
      ) : (
        <Box sx={{ p: 2, minHeight: editorHeight || 120, boxSizing: 'border-box' }}>
          {value ? (
            <MarkdownRenderer content={value} />
          ) : (
            <Typography variant="body2" sx={{ color: tokens.textSecondary, fontStyle: 'italic' }}>
              Nothing to preview.
            </Typography>
          )}
        </Box>
      )}

      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          px: 1.5,
          py: 0.5,
          borderTop: `1px solid ${tokens.border}`,
          fontSize: '0.6875rem',
          color: tokens.textSecondary
        }}
      >
        <span>Markdown supported · Type <code>@</code> to mention</span>
        <span><code>Ctrl+Z</code> undo · <code>Ctrl+Enter</code> submit</span>
      </Box>
    </Box>
  );
};

export const MarkdownEditor = React.memo(MarkdownEditorComponent);
