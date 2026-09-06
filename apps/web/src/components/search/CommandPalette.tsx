import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, TextField, InputAdornment, List, ListItemButton,
  ListItemIcon, ListItemText, Typography, Box, Chip
} from '@mui/material';
import { Search, Bug, Eye, Sun, User, FolderGit2, FolderKanban, MessageSquare } from 'lucide-react';
import { useLocation } from 'wouter';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useI18n } from '../../contexts/I18nContext';
import { apiFetch } from '../../api/client';
import { SearchResultItemDto } from '@reported/contracts';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onOpenCreateIssue: () => void;
  onOpenCreateReview: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onClose,
  onOpenCreateIssue,
  onOpenCreateReview
}) => {
  const { tokens, mode, setMode } = useThemeContext();
  const { language } = useI18n();
  const isVi = language === 'vi';
  const [, setLocation] = useLocation();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItemDto[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch<SearchResultItemDto[]>(`/search?q=${encodeURIComponent(query)}`);
        setResults(res);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  const defaultActions = [
    {
      id: 'create-issue',
      title: isVi ? 'Tạo vấn đề / báo cáo lỗi mới' : 'Create Issue / Bug Report',
      icon: <Bug size={18} color={tokens.primary} />,
      action: () => {
        onClose();
        onOpenCreateIssue();
      }
    },
    {
      id: 'create-review',
      title: isVi ? 'Tạo yêu cầu xem xét mã nguồn' : 'Create Review Request',
      icon: <Eye size={18} color="#a371f7" />,
      action: () => {
        onClose();
        onOpenCreateReview();
      }
    },
    {
      id: 'toggle-theme',
      title: isVi ? `Chuyển đổi giao diện sáng/tối (Hiện tại: ${mode})` : `Toggle Theme (Current: ${mode})`,
      icon: <Sun size={18} color={tokens.warning} />,
      action: () => {
        setMode(mode === 'dark' ? 'light' : mode === 'light' ? 'system' : 'dark');
        onClose();
      }
    }
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const total = query ? results.length : defaultActions.length;
    if (total === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % total);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + total) % total);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!query) {
        defaultActions[selectedIndex]?.action();
      } else if (results[selectedIndex]) {
        setLocation(results[selectedIndex].link);
        onClose();
      }
    }
  };

  const typeBadgeConfig: Record<string, { label: string; color: string; bg: string }> = {
    ISSUE: { label: isVi ? 'Vấn đề' : 'Issue', color: '#f85149', bg: 'rgba(248, 81, 73, 0.15)' },
    REVIEW: { label: isVi ? 'Review' : 'Review', color: '#a371f7', bg: 'rgba(163, 113, 247, 0.15)' },
    PROJECT: { label: isVi ? 'Dự án' : 'Project', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
    COMMENT: { label: isVi ? 'Bình luận' : 'Comment', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
    USER: { label: isVi ? 'Thành viên' : 'User', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)' },
    REPOSITORY: { label: isVi ? 'Kho lưu trữ' : 'Repo', color: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: tokens.surface,
          backgroundImage: 'none',
          borderRadius: '8px',
          border: `1px solid ${tokens.border}`,
          overflow: 'hidden',
          mt: 8
        }
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 1.5, borderBottom: `1px solid ${tokens.border}` }}>
          <TextField
            autoFocus
            fullWidth
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isVi ? 'Tìm kiếm theo #mã, tên vấn đề, review, dự án, bình luận...' : 'Type a command or search #number, issues, reviews, projects, comments...'}
            variant="standard"
            InputProps={{
              disableUnderline: true,
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={20} color={tokens.textSecondary} />
                </InputAdornment>
              ),
              sx: { fontSize: '0.9375rem' }
            }}
          />
        </Box>

        <List dense sx={{ py: 1, maxHeight: 380, overflowY: 'auto' }}>
          {!query ? (
            <>
              <Typography variant="caption" sx={{ px: 2, py: 0.5, display: 'block', color: tokens.textSecondary, fontWeight: 600 }}>
                {isVi ? 'LỆNH NHANH' : 'QUICK ACTIONS'}
              </Typography>
              {defaultActions.map((action, idx) => (
                <ListItemButton
                  key={action.id}
                  selected={idx === selectedIndex}
                  onClick={action.action}
                  sx={{ px: 2, py: 1, '&.Mui-selected': { backgroundColor: tokens.hover } }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>{action.icon}</ListItemIcon>
                  <ListItemText primary={action.title} primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 500 }} />
                </ListItemButton>
              ))}
            </>
          ) : results.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center', color: tokens.textSecondary, fontSize: '0.875rem' }}>
              {isVi ? `Không tìm thấy kết quả phù hợp với "${query}".` : `No results found for "${query}".`}
            </Box>
          ) : (
            <>
              <Typography variant="caption" sx={{ px: 2, py: 0.5, display: 'block', color: tokens.textSecondary, fontWeight: 600 }}>
                {isVi ? `KẾT QUẢ TÌM KIẾM (${results.length})` : `SEARCH RESULTS (${results.length})`}
              </Typography>
              {results.map((item, idx) => {
                const badge = typeBadgeConfig[item.type] || { label: item.type, color: tokens.textSecondary, bg: tokens.hover };
                return (
                  <ListItemButton
                    key={item.id}
                    selected={idx === selectedIndex}
                    onClick={() => {
                      setLocation(item.link);
                      onClose();
                    }}
                    sx={{ px: 2, py: 0.75, '&.Mui-selected': { backgroundColor: tokens.hover } }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      {item.type === 'ISSUE' && <Bug size={18} color={tokens.primary} />}
                      {item.type === 'REVIEW' && <Eye size={18} color="#a371f7" />}
                      {item.type === 'PROJECT' && <FolderKanban size={18} color="#3b82f6" />}
                      {item.type === 'COMMENT' && <MessageSquare size={18} color="#10b981" />}
                      {item.type === 'USER' && <User size={18} color={tokens.textSecondary} />}
                      {item.type === 'REPOSITORY' && <FolderGit2 size={18} color={tokens.textSecondary} />}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                          <Chip
                            label={badge.label}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.625rem',
                              fontWeight: 700,
                              color: badge.color,
                              backgroundColor: badge.bg
                            }}
                          />
                          <span>{item.number ? `#${item.number} ` : ''}{item.title}</span>
                          {item.status && <Chip label={item.status} size="small" sx={{ height: 18, fontSize: '0.6875rem' }} />}
                        </Box>
                      }
                      secondary={item.snippet}
                      primaryTypographyProps={{ fontSize: '0.84rem', fontWeight: 600 }}
                      secondaryTypographyProps={{ fontSize: '0.75rem', noWrap: true }}
                    />
                  </ListItemButton>
                );
              })}
            </>
          )}
        </List>
      </DialogContent>
    </Dialog>
  );
};

