import React, { useState, useEffect, useRef } from 'react';
import {
  Box, IconButton, Typography, Button, Tooltip, Menu, MenuItem, Divider,
  Drawer, useMediaQuery, useTheme, Chip, Breadcrumbs, Link as MuiLink,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert
} from '@mui/material';
import {
  Menu as MenuIcon,
  Bug,
  Eye,
  FolderGit2,
  Search,
  Plus,
  Moon,
  Sun,
  Users,
  LogOut,
  User,
  ChevronDown,
  ChevronsUpDown,
  Mail,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Globe,
  Briefcase,
  X,
  Check,
  MessageSquare,
  Inbox,
  HelpCircle
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useAuthContext } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { UserAvatar } from '../common/UserAvatar';
import { BrandLogo } from '../common/BrandLogo';
import { NewPostModal } from '../common/NewPostModal';
import { OnboardingTour } from '../common/OnboardingTour';
import { CommandPalette } from '../search/CommandPalette';
import { NotificationCenter } from '../notifications/NotificationCenter';
import { NotificationPreferencesModal } from '../notifications/NotificationPreferencesModal';
import { EmailInspectorModal } from '../notifications/EmailInspectorModal';
import { LinkRepoModal } from '../github/LinkRepoModal';
import { DashboardCodeHostingBanner } from '../common/ConnectedAccountNotice';
import { showDesktopNotification } from '../../utils/desktopNotification';
import { apiFetch } from '../../api/client';
import { NotificationDto, RepositoryDto } from '@reported/contracts';

interface SavedViewItem {
  id: string;
  name: string;
  targetType: 'ISSUE' | 'REVIEW';
  filterState: Record<string, unknown>;
  createdAt: string;
}

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tokens, mode, resolvedMode, setMode } = useThemeContext();
  const { user, logout } = useAuthContext();
  const { language, setLanguage, t } = useI18n();
  const { workspaces, activeWorkspace, setActiveWorkspace, projects, activeProject, setActiveProject, createWorkspace } = useWorkspace();
  const [location, setLocation] = useLocation();

  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const workspaceRoleLabel = (role?: string | null) => {
    if (role === 'OWNER') return language === 'vi' ? 'Chủ sở hữu' : 'Owner';
    if (role === 'ADMIN') return language === 'vi' ? 'Quản trị' : 'Admin';
    return language === 'vi' ? 'Thành viên' : 'Member';
  };
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('reported_sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('reported_sidebar_collapsed', String(next));
      return next;
    });
  };

  const [cmdOpen, setCmdOpen] = useState(false);
  const [linkRepoOpen, setLinkRepoOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [emailInspectorOpen, setEmailInspectorOpen] = useState(false);
  const [newPostModalOpen, setNewPostModalOpen] = useState(false);
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceSlug, setWorkspaceSlug] = useState('');
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);

  const [newMenuAnchor, setNewMenuAnchor] = useState<null | HTMLElement>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [workspaceMenuAnchor, setWorkspaceMenuAnchor] = useState<null | HTMLElement>(null);
  const [langMenuAnchor, setLangMenuAnchor] = useState<null | HTMLElement>(null);

  const [counts, setCounts] = useState({ issues: 0, reviews: 0, repos: 0 });
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [savedViewsList, setSavedViewsList] = useState<SavedViewItem[]>([]);

  const prevNotificationIdsRef = useRef<Set<string>>(new Set());
  const isInitialFetchRef = useRef<boolean>(true);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await apiFetch<{ notifications: NotificationDto[]; unreadCount: number }>('/notifications');
      const list = res.notifications || [];

      if (!isInitialFetchRef.current) {
        const newUnread = list.filter(n => !n.isRead && !prevNotificationIdsRef.current.has(n.id));
        newUnread.forEach(n => {
          showDesktopNotification(n.title, {
            body: n.message,
            tag: n.id,
            onClick: () => {
              setLocation(n.link);
            }
          });
        });
      } else {
        isInitialFetchRef.current = false;
      }

      prevNotificationIdsRef.current = new Set(list.map(n => n.id));
      setNotifications(list);
      setUnreadCount(res.unreadCount);
    } catch {
    }
  };

  const fetchSidebarStats = async () => {
    try {
      const [issRes, revRes, repoRes] = await Promise.all([
        apiFetch<{ total: number }>('/issues?limit=1'),
        apiFetch<{ total: number }>('/reviews?limit=1'),
        apiFetch<RepositoryDto[]>('/github/repositories')
      ]);
      setCounts({
        issues: issRes.total || 0,
        reviews: revRes.total || 0,
        repos: repoRes.length || 0
      });
    } catch {
    }
  };

  const fetchSavedViews = async () => {
    if (!user) return;
    try {
      const res = await apiFetch<SavedViewItem[]>('/saved-views');
      setSavedViewsList(res || []);
    } catch {
      setSavedViewsList([]);
    }
  };

  const handleDeleteSavedView = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await apiFetch(`/saved-views/${id}`, { method: 'DELETE' });
      setSavedViewsList(prev => prev.filter(v => v.id !== id));
      window.dispatchEvent(new Event('saved-views-updated'));
    } catch {
    }
  };

  const handleApplySavedView = (view: SavedViewItem) => {
    const query = new URLSearchParams();
    if (view.filterState) {
      Object.entries(view.filterState).forEach(([k, v]) => {
        if (Array.isArray(v)) {
          v.forEach(item => query.append(k, String(item)));
        } else if (v !== undefined && v !== null) {
          query.set(k, String(v));
        }
      });
    }
    const targetPath = view.targetType === 'REVIEW' ? '/reviews' : '/issues';
    const fullUrl = query.toString() ? `${targetPath}?${query.toString()}` : targetPath;
    setLocation(fullUrl);
    if (isMobile) setMobileDrawerOpen(false);
  };

  const handleCreateWorkspace = async () => {
    const name = workspaceName.trim();
    const slug = workspaceSlug.trim().toLowerCase();
    if (!name || !slug) {
      setWorkspaceError(language === 'vi' ? 'Tên và slug bắt buộc nhập.' : 'Name and slug are required.');
      return;
    }
    setCreatingWorkspace(true);
    setWorkspaceError(null);
    try {
      await createWorkspace({ name, slug });
      setWorkspaceName('');
      setWorkspaceSlug('');
      setCreateWorkspaceOpen(false);
      setWorkspaceMenuAnchor(null);
    } catch (err) {
      setWorkspaceError(err instanceof Error ? err.message : 'Failed to create workspace');
    } finally {
      setCreatingWorkspace(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchSidebarStats();
    fetchSavedViews();

    const handleFocus = () => {
      if (!document.hidden) {
        fetchNotifications();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchNotifications();
      }
    }, 60000);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [user?.id, activeWorkspace?.id]);

  useEffect(() => {
    const handleSavedViewsUpdated = () => {
      fetchSavedViews();
    };
    const handleStatsChanged = () => {
      fetchSidebarStats();
    };
    window.addEventListener('saved-views-updated', handleSavedViewsUpdated);
    window.addEventListener('reported:repo-changed', handleStatsChanged);
    window.addEventListener('reported:issue-changed', handleStatsChanged);
    window.addEventListener('reported:review-changed', handleStatsChanged);
    return () => {
      window.removeEventListener('saved-views-updated', handleSavedViewsUpdated);
      window.removeEventListener('reported:repo-changed', handleStatsChanged);
      window.removeEventListener('reported:issue-changed', handleStatsChanged);
      window.removeEventListener('reported:review-changed', handleStatsChanged);
    };
  }, [user, activeWorkspace?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCmdOpen(prev => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navItems = [
    { label: t('inbox'), path: '/', icon: <Inbox size={18} /> },
    { label: t('posts'), path: '/posts', icon: <MessageSquare size={18} /> },
    { label: t('issues'), path: '/issues', icon: <Bug size={18} />, count: counts.issues },
    { label: t('reviews'), path: '/reviews', icon: <Eye size={18} />, count: counts.reviews },
    { label: t('repositories'), path: '/repositories', icon: <FolderGit2 size={18} />, count: counts.repos },
    { label: t('projects'), path: '/projects', icon: <Briefcase size={18} /> },
    { label: t('members'), path: '/members', icon: <Users size={18} /> }
  ];

  const getBreadcrumbs = () => {
    const parts = location.split('?')[0].split('/').filter(Boolean);
    if (parts.length === 0) {
      return [{ label: t('inbox'), path: '/' }];
    }
    const crumbs = [{ label: t('inbox'), path: '/' }];
    let currentPath = '';
    parts.forEach((p, idx) => {
      currentPath += `/${p}`;
      let label = p.charAt(0).toUpperCase() + p.slice(1);
      if (p === 'posts') label = t('posts');
      if (p === 'issues') label = t('issues');
      if (p === 'reviews') label = t('reviews');
      if (p === 'repositories') label = t('repositories');
      if (p === 'projects') label = t('projects');
      if (p === 'members') label = t('members');
      if (p === 'settings') label = t('settings');
      if (p === 'connected-accounts') label = t('connectedAccounts');
      if (p === 'new') label = (parts[0] === 'issues' ? t('newPost') : t('askForReview'));
      if (parts[0] === 'issues' && idx === 1 && p !== 'new') label = `#${p}`;
      if (parts[0] === 'reviews' && idx === 1 && p !== 'new') label = `Review #${p}`;
      crumbs.push({ label, path: currentPath });
    });
    return crumbs;
  };

  const sidebarWidth = sidebarCollapsed ? 68 : 270;

  const sidebarContent = (
    <Box
      sx={{
        width: sidebarWidth,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: tokens.surface,
        borderRight: `1px solid ${tokens.border}`,
        transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <Box
        sx={{
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          px: sidebarCollapsed ? 1 : 2,
          borderBottom: `1px solid ${tokens.divider}`,
          flexShrink: 0
        }}
      >
        <Box onClick={() => setLocation('/')} sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <BrandLogo size="medium" showText={!sidebarCollapsed} />
        </Box>
      </Box>

      {sidebarCollapsed ? (
        <Tooltip
          title={`${activeWorkspace?.name || t('workspace')} (@${activeWorkspace?.slug || 'ws'})`}
          placement="right"
        >
          <Box
            onClick={(e) => setWorkspaceMenuAnchor(e.currentTarget)}
            sx={{
              py: 1.4,
              display: 'flex',
              justifyContent: 'center',
              borderBottom: `1px solid ${tokens.divider}`,
              backgroundColor: tokens.surfaceSecondary,
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
              '&:hover': { backgroundColor: tokens.hover }
            }}
          >
            <ChevronsUpDown size={18} color={tokens.textSecondary} />
          </Box>
        </Tooltip>
      ) : (
        <Box
          id="tour-workspace"
          onClick={(e) => setWorkspaceMenuAnchor(e.currentTarget)}
          sx={{
            px: 2,
            py: 1.25,
            borderBottom: `1px solid ${tokens.divider}`,
            backgroundColor: tokens.surfaceSecondary,
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
            '&:hover': { backgroundColor: tokens.hover }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  color: tokens.textPrimary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {activeWorkspace?.name || t('noWorkspace')}
              </Typography>
            </Box>
            <ChevronsUpDown size={15} color={tokens.textSecondary} />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.5 }}>
            <Typography variant="caption" sx={{ color: tokens.textSecondary, fontSize: '0.72rem' }} noWrap>
              @{activeWorkspace?.slug || 'workspace'}
            </Typography>
          </Box>
        </Box>
      )}

      <Menu
        anchorEl={workspaceMenuAnchor}
        open={Boolean(workspaceMenuAnchor)}
        onClose={() => setWorkspaceMenuAnchor(null)}
        PaperProps={{ sx: { minWidth: 260, p: 0.5 } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: tokens.textSecondary, letterSpacing: '0.04em' }}>
            {t('workspaces').toUpperCase()}
          </Typography>
        </Box>
        <Divider />
        {workspaces.map((ws) => {
          const isSelected = ws.id === activeWorkspace?.id;
          return (
            <MenuItem
              key={ws.id}
              selected={isSelected}
              onClick={() => {
                setActiveWorkspace(ws);
                setWorkspaceMenuAnchor(null);
              }}
              sx={{ display: 'flex', justifyContent: 'space-between', py: 1.2 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: isSelected ? 700 : 500 }}>
                    {ws.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
                    @{ws.slug}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <Chip label={workspaceRoleLabel(ws.role)} size="small" sx={{ height: 18, fontSize: '0.625rem', fontWeight: 600 }} />
                {isSelected && <Check size={16} color={tokens.primary} />}
              </Box>
            </MenuItem>
          );
        })}
        <Divider />
        <MenuItem onClick={() => { setWorkspaceMenuAnchor(null); setCreateWorkspaceOpen(true); }}>
          <Plus size={16} style={{ marginRight: 12, color: tokens.primary }} />
          <Typography variant="body2">{language === 'vi' ? 'Tạo workspace' : 'Create workspace'}</Typography>
        </MenuItem>
        <MenuItem onClick={() => { setWorkspaceMenuAnchor(null); setLocation('/settings/workspace'); }}>
          <Typography variant="body2">{language === 'vi' ? 'Cài đặt Workspace' : 'Workspace Settings'}</Typography>
        </MenuItem>
      </Menu>

      <Box id="tour-sidebar" sx={{ p: 1, flex: 1, overflowY: 'auto' }}>
        {!sidebarCollapsed && (
          <Typography variant="caption" sx={{ px: 1.2, py: 0.5, display: 'block', color: tokens.textSecondary, fontWeight: 700, letterSpacing: '0.05em' }}>
            {t('coreViews')}
          </Typography>
        )}

        {navItems.map((item) => {
          const isActive = location === item.path || (item.path !== '/' && location.startsWith(item.path));
          return (
            <Tooltip key={item.path} title={sidebarCollapsed ? item.label : ''} placement="right">
              <Box
                onClick={() => {
                  setLocation(item.path);
                  if (isMobile) setMobileDrawerOpen(false);
                }}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: sidebarCollapsed ? 'center' : 'space-between',
                  px: 1.2,
                  py: 0.85,
                  my: 0.3,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.84rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? tokens.textPrimary : tokens.textSecondary,
                  backgroundColor: isActive ? 'rgba(110, 118, 129, 0.14)' : 'transparent',
                  borderLeft: isActive ? `3px solid ${tokens.primary}` : '3px solid transparent',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    backgroundColor: isActive ? 'rgba(110, 118, 129, 0.2)' : tokens.hover,
                    color: tokens.textPrimary
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, color: isActive ? tokens.primary : 'inherit' }}>
                  {item.icon}
                  {!sidebarCollapsed && <span style={{ color: isActive ? tokens.textPrimary : 'inherit' }}>{item.label}</span>}
                </Box>
                {!sidebarCollapsed && item.count !== undefined && item.count > 0 && (
                  <Chip
                    label={item.count}
                    size="small"
                    sx={{
                      height: 18,
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      backgroundColor: tokens.surfaceSecondary,
                      color: isActive ? tokens.textPrimary : tokens.textSecondary,
                      border: `1px solid ${tokens.border}`
                    }}
                  />
                )}
              </Box>
            </Tooltip>
          );
        })}

        {!sidebarCollapsed && projects.length > 0 && (
          <>
            <Divider sx={{ my: 1.4 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.2, py: 0.4 }}>
              <Typography variant="caption" sx={{ color: tokens.textSecondary, fontWeight: 700, letterSpacing: '0.05em' }}>
                {t('projects').toUpperCase()}
              </Typography>
              <Typography
                onClick={() => setLocation('/projects')}
                variant="caption"
                sx={{
                  color: tokens.primary,
                  cursor: 'pointer',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                + {t('projects')}
              </Typography>
            </Box>

            {projects.map((proj) => {
              const isSelected = activeProject?.id === proj.id;
              return (
                <Box
                  key={proj.id}
                  onClick={() => {
                    if (isSelected) {
                      setActiveProject(null);
                    } else {
                      setActiveProject(proj);
                    }
                    if (isMobile) setMobileDrawerOpen(false);
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: 1.2,
                    py: 0.65,
                    my: 0.2,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: isSelected ? 600 : 500,
                    backgroundColor: isSelected ? tokens.primary : 'transparent',
                    color: isSelected ? '#ffffff' : tokens.textSecondary,
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      backgroundColor: isSelected ? tokens.primaryHover : tokens.hover,
                      color: isSelected ? '#ffffff' : tokens.textPrimary
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    <Box
                      sx={{
                        px: 0.6,
                        py: 0.1,
                        borderRadius: '4px',
                        backgroundColor: isSelected ? 'rgba(255,255,255,0.18)' : tokens.surfaceSecondary,
                        fontSize: '0.625rem',
                        fontWeight: 700,
                        color: isSelected ? '#fff' : tokens.textSecondary,
                        border: `1px solid ${isSelected ? 'rgba(255,255,255,0.28)' : tokens.border}`
                      }}
                    >
                      {proj.key}
                    </Box>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', color: isSelected ? '#fff' : 'inherit' }} noWrap>
                      {proj.name}
                    </Typography>
                  </Box>
                  {isSelected && (
                    <Chip
                      label="Đang lọc"
                      size="small"
                      sx={{ height: 16, fontSize: '0.5625rem', fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.18)', color: '#ffffff' }}
                    />
                  )}
                </Box>
              );
            })}
          </>
        )}

        {!sidebarCollapsed && savedViewsList.length > 0 && (
          <>
            <Divider sx={{ my: 1.4 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.2, py: 0.4 }}>
              <Typography variant="caption" sx={{ color: tokens.textSecondary, fontWeight: 700, letterSpacing: '0.05em' }}>
                {t('savedViews')}
              </Typography>
            </Box>

            {savedViewsList.map((sv) => (
              <Box
                key={sv.id}
                onClick={() => handleApplySavedView(sv)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 1.2,
                  py: 0.65,
                  my: 0.2,
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  color: tokens.textSecondary,
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    backgroundColor: tokens.hover,
                    color: tokens.textPrimary,
                    '& .delete-view-btn': { opacity: 1 }
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: sv.targetType === 'REVIEW' ? '#a855f7' : (sv.filterState?.priority === 'P0' ? '#ef4444' : '#6366f1'),
                      flexShrink: 0
                    }}
                  />
                  <Typography variant="body2" sx={{ fontSize: '0.8rem' }} noWrap>
                    {sv.name}
                  </Typography>
                </Box>
                <IconButton
                  className="delete-view-btn"
                  size="small"
                  onClick={(e) => handleDeleteSavedView(e, sv.id)}
                  sx={{
                    p: 0.2,
                    opacity: 0,
                    transition: 'opacity 0.15s ease',
                    color: tokens.textSecondary,
                    '&:hover': { color: tokens.error }
                  }}
                >
                  <X size={14} />
                </IconButton>
              </Box>
            ))}
          </>
        )}

      </Box>

      {user && (
        <Box sx={{ p: 1.5, borderTop: `1px solid ${tokens.divider}`, backgroundColor: tokens.surfaceSecondary }}>
          <Box
            id="tour-user-menu"
            onClick={(e) => setUserMenuAnchor(e.currentTarget)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarCollapsed ? 'center' : 'space-between',
              gap: 1,
              cursor: 'pointer',
              p: 0.5,
              borderRadius: '6px',
              '&:hover': { backgroundColor: tokens.hover }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden' }}>
              <UserAvatar user={user} size={28} showTooltip={false} />
              {!sidebarCollapsed && (
                <Box sx={{ overflow: 'hidden' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem' }} noWrap>
                    {user.displayName}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" sx={{ color: tokens.textSecondary, fontSize: '0.6875rem' }} noWrap>
                      @{user.username}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Box>
            {!sidebarCollapsed && <ChevronDown size={15} color={tokens.textSecondary} />}
          </Box>

          <Menu
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={() => setUserMenuAnchor(null)}
            PaperProps={{ sx: { minWidth: 210 } }}
          >
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{user.displayName}</Typography>
              <Typography variant="caption" sx={{ color: tokens.textSecondary }}>{user.email}</Typography>
            </Box>
            <Divider />
            <MenuItem onClick={() => { setUserMenuAnchor(null); setLocation(`/users/${user.username}`); }}>
              <User size={16} style={{ marginRight: 12, color: tokens.primary }} /> {t('profile')}
            </MenuItem>
            <MenuItem onClick={() => { setUserMenuAnchor(null); setLocation('/settings/connected-accounts'); }}>
              <GitBranch size={16} style={{ marginRight: 12, color: tokens.primary }} /> {t('connectedAccounts')}
            </MenuItem>
            <MenuItem onClick={() => { setUserMenuAnchor(null); setPreferencesOpen(true); }}>
              {t('notificationPrefs')}
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { setUserMenuAnchor(null); logout(); setLocation('/login'); }}>
              <LogOut size={16} style={{ marginRight: 12, color: tokens.error }} /> {t('logout')}
            </MenuItem>
          </Menu>
        </Box>
      )}

      {!isMobile && (
        <Box
          onClick={toggleSidebar}
          sx={{
            height: 44,
            minHeight: 44,
            borderTop: `1px solid ${tokens.divider}`,
            backgroundColor: tokens.surfaceSecondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            px: sidebarCollapsed ? 0 : 2,
            cursor: 'pointer',
            color: tokens.textSecondary,
            fontSize: '0.8125rem',
            fontWeight: 600,
            userSelect: 'none',
            transition: 'all 0.15s ease',
            '&:hover': {
              backgroundColor: tokens.hover,
              color: tokens.textPrimary
            }
          }}
        >
          <Tooltip title={sidebarCollapsed ? `${t('expandSidebar')} (Ctrl+B)` : ''} placement="right">
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, width: '100%', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
              {sidebarCollapsed ? (
                <ChevronRight size={18} />
              ) : (
                <>
                  <ChevronLeft size={16} />
                  <span>{t('collapseSidebar')}</span>
                </>
              )}
            </Box>
          </Tooltip>
        </Box>
      )}
    </Box>
  );

  const breadcrumbs = getBreadcrumbs();

  return (
    <Box sx={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: tokens.background }}>
      {!isMobile && sidebarContent}

      {isMobile && (
        <Drawer
          anchor="left"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
        >
          {sidebarContent}
        </Drawer>
      )}

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', overflow: 'hidden' }}>
        <Box
          sx={{
            height: 60,
            minHeight: 60,
            px: { xs: 2, md: 3 },
            borderBottom: `1px solid ${tokens.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: tokens.surface,
            backdropFilter: 'blur(16px)',
            flexShrink: 0,
            zIndex: 10
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minWidth: 0 }}>
            {isMobile && (
              <IconButton size="small" onClick={() => setMobileDrawerOpen(true)}>
                <MenuIcon size={22} />
              </IconButton>
            )}

            <Breadcrumbs
              separator={<ChevronRight size={14} color={tokens.textSecondary} />}
              aria-label="breadcrumb"
              sx={{ display: { xs: 'none', sm: 'flex' } }}
            >
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return isLast ? (
                  <Typography
                    key={crumb.path}
                    sx={{
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: tokens.textPrimary,
                      maxWidth: 280,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {crumb.label}
                  </Typography>
                ) : (
                  <MuiLink
                    key={crumb.path}
                    component="button"
                    underline="hover"
                    onClick={() => setLocation(crumb.path)}
                    sx={{
                      fontSize: '0.875rem',
                      color: tokens.textSecondary,
                      cursor: 'pointer'
                    }}
                  >
                    {crumb.label}
                  </MuiLink>
                );
              })}
            </Breadcrumbs>
          </Box>

          <Box
            id="tour-search"
            onClick={() => setCmdOpen(true)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              px: 2,
              py: 0.8,
              height: 40,
              boxSizing: 'border-box',
              borderRadius: '8px',
              backgroundColor: tokens.surfaceSecondary,
              border: `1px solid ${tokens.border}`,
              cursor: 'pointer',
              color: tokens.textSecondary,
              fontSize: '0.875rem',
              width: { xs: 160, sm: 300, md: 420 },
              transition: 'all 0.15s ease',
              '&:hover': {
                borderColor: tokens.primary,
                backgroundColor: tokens.hover
              }
            }}
          >
            <Search size={16} color={tokens.textSecondary} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t('searchPlaceholder')}
            </span>
          </Box>

          <Box id="tour-theme-lang" sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Tooltip title={language === 'vi' ? 'Xem tour hướng dẫn sử dụng tính năng' : 'Take an interactive product tour'}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => window.dispatchEvent(new CustomEvent('reported-start-tour'))}
                startIcon={<HelpCircle size={15} color={tokens.primary} />}
                sx={{
                  height: 38,
                  px: 1.6,
                  fontSize: '0.84rem',
                  fontWeight: 600,
                  borderColor: tokens.border,
                  color: tokens.textPrimary,
                  borderRadius: '8px',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: tokens.primary,
                    backgroundColor: tokens.hover
                  }
                }}
              >
                {language === 'vi' ? 'Hướng dẫn' : 'Tour'}
              </Button>
            </Tooltip>

            <Button
              size="small"
              variant="outlined"
              onClick={(e) => setLangMenuAnchor(e.currentTarget)}
              startIcon={<Globe size={16} />}
              sx={{
                height: 38,
                px: 1.8,
                fontSize: '0.84rem',
                fontWeight: 600,
                borderColor: tokens.border,
                color: tokens.textPrimary,
                borderRadius: '8px',
                textTransform: 'none'
              }}
            >
              {language === 'vi' ? 'Tiếng Việt' : 'English'}
            </Button>

            <Menu
              anchorEl={langMenuAnchor}
              open={Boolean(langMenuAnchor)}
              onClose={() => setLangMenuAnchor(null)}
            >
              <MenuItem
                selected={language === 'vi'}
                onClick={() => {
                  setLanguage('vi');
                  setLangMenuAnchor(null);
                }}
              >
                Tiếng Việt
              </MenuItem>
              <MenuItem
                selected={language === 'en'}
                onClick={() => {
                  setLanguage('en');
                  setLangMenuAnchor(null);
                }}
              >
                English
              </MenuItem>
            </Menu>

            <Button
              size="small"
              variant="contained"
              startIcon={<Plus size={16} />}
              onClick={() => setNewPostModalOpen(true)}
              sx={{
                height: 38,
                px: 2,
                fontSize: '0.84rem',
                fontWeight: 600,
                backgroundColor: tokens.primary,
                borderRadius: '8px',
                textTransform: 'none',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)',
                '&:hover': {
                  backgroundColor: tokens.primaryHover
                }
              }}
            >
              {t('newPost')}
            </Button>

            <Box id="tour-notifications" sx={{ display: 'inline-flex', alignItems: 'center' }}>
              <NotificationCenter
                notifications={notifications}
                unreadCount={unreadCount}
                onRefresh={fetchNotifications}
                onOpenPreferences={() => setPreferencesOpen(true)}
                onOpenEmailInspector={() => setEmailInspectorOpen(true)}
              />
            </Box>

            <Tooltip title={`Giao diện: ${mode}`}>
              <IconButton
                size="small"
                onClick={() => setMode(resolvedMode === 'dark' ? 'light' : 'dark')}
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '8px',
                  border: `1px solid ${tokens.border}`,
                  color: tokens.textSecondary
                }}
              >
                {resolvedMode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box
          component="main"
          sx={{
            flex: 1,
            p: { xs: 2, sm: 3, md: 3.5 },
            overflowY: 'auto',
            overflowX: 'hidden',
            width: '100%',
            height: 'calc(100vh - 60px)'
          }}
        >
          {location === '/' && <DashboardCodeHostingBanner />}
          {children}
        </Box>
      </Box>

      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onOpenCreateIssue={() => setLocation('/issues/new')}
        onOpenCreateReview={() => setLocation('/reviews/new')}
      />

      <LinkRepoModal
        open={linkRepoOpen}
        onClose={() => setLinkRepoOpen(false)}
        onSuccess={() => {
          fetchSidebarStats();
          setLocation('/repositories');
        }}
      />



      <NotificationPreferencesModal
        open={preferencesOpen}
        onClose={() => setPreferencesOpen(false)}
      />

      <EmailInspectorModal
        open={emailInspectorOpen}
        onClose={() => setEmailInspectorOpen(false)}
      />

      <Dialog
        open={createWorkspaceOpen}
        onClose={() => !creatingWorkspace && setCreateWorkspaceOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '8px',
            backgroundColor: tokens.surface,
            border: `1px solid ${tokens.border}`,
            backgroundImage: 'none'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>{language === 'vi' ? 'Tạo không gian làm việc mới' : 'Create New Workspace'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
          {workspaceError && <Alert severity="error" sx={{ borderRadius: '6px' }} onClose={() => setWorkspaceError(null)}>{workspaceError}</Alert>}
          <TextField
            label={language === 'vi' ? 'Tên workspace' : 'Workspace name'}
            value={workspaceName}
            onChange={(e) => {
              const val = e.target.value;
              setWorkspaceName(val);
              setWorkspaceSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
            }}
            placeholder="Engineering, Design Team..."
            required
            fullWidth
            size="small"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
          />
          <TextField
            label="Slug"
            value={workspaceSlug}
            onChange={(e) => setWorkspaceSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="engineering"
            helperText={language === 'vi' ? 'Dùng trong URL, chỉ gồm chữ thường, số và dấu gạch nối' : 'Used in URLs, only lowercase alphanumeric and dashes'}
            required
            fullWidth
            size="small"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '6px' } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setCreateWorkspaceOpen(false)}
            disabled={creatingWorkspace}
            sx={{ borderRadius: '6px', color: tokens.textSecondary }}
          >
            {language === 'vi' ? 'Hủy' : 'Cancel'}
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateWorkspace}
            disabled={creatingWorkspace}
            sx={{ borderRadius: '6px', minWidth: 90 }}
          >
            {creatingWorkspace ? (language === 'vi' ? 'Đang tạo...' : 'Creating...') : (language === 'vi' ? 'Tạo' : 'Create')}
          </Button>
        </DialogActions>
      </Dialog>

      <NewPostModal
        open={newPostModalOpen}
        onClose={() => setNewPostModalOpen(false)}
      />

      <OnboardingTour />
    </Box>
  );
};

