import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  IconButton,
  Typography,
  Button,
  Tooltip,
  Menu,
  MenuItem,
  Divider,
  Drawer,
  useMediaQuery,
  useTheme,
  Chip,
  Breadcrumbs,
  Link as MuiLink,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
} from "@mui/material";
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
  Bell,
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
  HelpCircle,
  Download,
  Settings,
} from "lucide-react";
import { usePwaInstall } from "../../hooks/usePwaInstall";
import { useLocation } from "wouter";
import { useThemeContext } from "../../contexts/ThemeContext";
import { useAuthContext } from "../../contexts/AuthContext";
import { useI18n } from "../../contexts/I18nContext";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { UserAvatar } from "../common/UserAvatar";
import { BrandLogo } from "../common/BrandLogo";
import { slugify } from "../../utils/slugify";

import { OnboardingTour } from "../common/OnboardingTour";
import { CommandPalette } from "../search/CommandPalette";
import { NotificationCenter } from "../notifications/NotificationCenter";
import { NotificationPreferencesModal } from "../notifications/NotificationPreferencesModal";
import { EmailInspectorModal } from "../notifications/EmailInspectorModal";
import { LinkRepoModal } from "../github/LinkRepoModal";
import { DashboardCodeHostingBanner } from "../common/ConnectedAccountNotice";
import { showDesktopNotification } from "../../utils/desktopNotification";
import { apiFetch } from "../../api/client";
import { NotificationDto, RepositoryDto } from "@reported/contracts";
import { toast } from "../../contexts/ToastContext";

interface SavedViewItem {
  id: string;
  name: string;
  targetType: "ISSUE" | "REVIEW";
  filterState: Record<string, unknown>;
  createdAt: string;
}

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { tokens, mode, resolvedMode, setMode } = useThemeContext();
  const { user, logout } = useAuthContext();
  const { language, setLanguage, t } = useI18n();
  const {
    workspaces,
    activeWorkspace,
    setActiveWorkspace,
    projects,
    activeProject,
    setActiveProject,
    createWorkspace,
  } = useWorkspace();
  const [location, setLocation] = useLocation();

  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));
  const { canInstall, installApp } = usePwaInstall();
  const workspaceRoleLabel = (role?: string | null) => {
    if (role === "OWNER") return language === "vi" ? "Chủ sở hữu" : "Owner";
    if (role === "ADMIN") return language === "vi" ? "Quản trị" : "Admin";
    return language === "vi" ? "Thành viên" : "Member";
  };
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem("reported_sidebar_collapsed") === "true";
  });

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    localStorage.setItem("reported_sidebar_collapsed", String(next));
    setSidebarCollapsed(next);
  };

  const [cmdOpen, setCmdOpen] = useState(false);
  const [linkRepoOpen, setLinkRepoOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [emailInspectorOpen, setEmailInspectorOpen] = useState(false);

  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);

  const [newMenuAnchor, setNewMenuAnchor] = useState<null | HTMLElement>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(
    null,
  );
  const [workspaceMenuAnchor, setWorkspaceMenuAnchor] =
    useState<null | HTMLElement>(null);
  const [langMenuAnchor, setLangMenuAnchor] = useState<null | HTMLElement>(
    null,
  );

  const [counts, setCounts] = useState({
    posts: 0,
    issues: 0,
    reviews: 0,
    repos: 0,
    members: 0,
  });
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [savedViewsList, setSavedViewsList] = useState<SavedViewItem[]>([]);

  const prevNotificationIdsRef = useRef<Set<string>>(new Set());
  const isInitialFetchRef = useRef<boolean>(true);
  const lastNotificationsFetchRef = useRef<number>(0);

  const fetchNotifications = async (force = false) => {
    if (!user) return;
    const now = Date.now();
    if (!force && now - lastNotificationsFetchRef.current < 4000) {
      return;
    }
    lastNotificationsFetchRef.current = now;
    try {
      const res = await apiFetch<{
        notifications: NotificationDto[];
        unreadCount: number;
      }>("/notifications", { skipCache: force });
      const list = res.notifications || [];

      if (!isInitialFetchRef.current) {
        const newUnread = list.filter(
          (n) => !n.isRead && !prevNotificationIdsRef.current.has(n.id),
        );
        newUnread.forEach((n) => {
          showDesktopNotification(n.title, {
            body: n.message,
            tag: n.id,
            onClick: () => {
              setLocation(n.link);
            },
          });
        });
      } else {
        isInitialFetchRef.current = false;
      }

      prevNotificationIdsRef.current = new Set(list.map((n) => n.id));
      setNotifications(list);
      setUnreadCount(res.unreadCount);
    } catch {}
  };

  const fetchSidebarStats = async () => {
    try {
      const calls: [
        Promise<{ total: number }>,
        Promise<{ total: number }>,
        Promise<RepositoryDto[]>,
        Promise<any[]> | Promise<never[]>,
      ] = [
        apiFetch<{ total: number }>("/issues?limit=1"),
        apiFetch<{ total: number }>("/reviews?limit=1"),
        apiFetch<RepositoryDto[]>("/github/repositories"),
        activeWorkspace?.id
          ? apiFetch<any[]>(`/workspaces/${activeWorkspace.id}/members`)
          : Promise.resolve([]),
      ];
      const [issRes, revRes, repoRes, membersRes] = await Promise.all(calls);
      const issTotal = issRes?.total || 0;
      const revTotal = revRes?.total || 0;
      setCounts({
        posts: issTotal + revTotal,
        issues: issTotal,
        reviews: revTotal,
        repos: repoRes?.length || 0,
        members: membersRes?.length || 0,
      });
    } catch {}
  };

  const fetchSavedViews = async () => {
    if (!user) return;
    try {
      const res = await apiFetch<SavedViewItem[]>("/saved-views");
      setSavedViewsList(res || []);
    } catch {
      setSavedViewsList([]);
    }
  };

  const handleDeleteSavedView = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await apiFetch(`/saved-views/${id}`, { method: "DELETE" });
      setSavedViewsList((prev) => prev.filter((v) => v.id !== id));
      window.dispatchEvent(new Event("saved-views-updated"));
    } catch {}
  };

  const handleApplySavedView = (view: SavedViewItem) => {
    const query = new URLSearchParams();
    if (view.filterState) {
      Object.entries(view.filterState).forEach(([k, v]) => {
        if (Array.isArray(v)) {
          v.forEach((item) => query.append(k, String(item)));
        } else if (v !== undefined && v !== null) {
          query.set(k, String(v));
        }
      });
    }
    const targetPath = view.targetType === "REVIEW" ? "/reviews" : "/issues";
    const fullUrl = query.toString()
      ? `${targetPath}?${query.toString()}`
      : targetPath;
    setLocation(fullUrl);
    if (isMobile) setMobileDrawerOpen(false);
  };

  const handleCreateWorkspace = async () => {
    const name = workspaceName.trim();
    const slug = workspaceSlug.trim().toLowerCase();
    if (!name || !slug) {
      setWorkspaceError(
        language === "vi"
          ? "Tên và slug bắt buộc nhập."
          : "Name and slug are required.",
      );
      return;
    }
    setCreatingWorkspace(true);
    setWorkspaceError(null);
    try {
      await createWorkspace({ name, slug });
      setWorkspaceName("");
      setWorkspaceSlug("");
      setCreateWorkspaceOpen(false);
      setWorkspaceMenuAnchor(null);
    } catch (err) {
      setWorkspaceError(
        err instanceof Error ? err.message : "Failed to create workspace",
      );
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
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchNotifications();
      }
    }, 60000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [user?.id, activeWorkspace?.id]);

  useEffect(() => {
    const handleSavedViewsUpdated = () => {
      fetchSavedViews();
    };
    const handleStatsChanged = () => {
      fetchSidebarStats();
    };
    window.addEventListener("saved-views-updated", handleSavedViewsUpdated);
    window.addEventListener("reported:repo-changed", handleStatsChanged);
    window.addEventListener("reported:issue-changed", handleStatsChanged);
    window.addEventListener("reported:review-changed", handleStatsChanged);
    return () => {
      window.removeEventListener(
        "saved-views-updated",
        handleSavedViewsUpdated,
      );
      window.removeEventListener("reported:repo-changed", handleStatsChanged);
      window.removeEventListener("reported:issue-changed", handleStatsChanged);
      window.removeEventListener("reported:review-changed", handleStatsChanged);
    };
  }, [user, activeWorkspace?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navItems = [
    { label: t("inbox"), path: "/", icon: <Inbox size={18} /> },
    {
      label: t("posts"),
      path: "/posts",
      icon: <MessageSquare size={18} />,
      count: counts.posts,
    },
    {
      label: t("issues"),
      path: "/issues",
      icon: <Bug size={18} />,
      count: counts.issues,
    },
    {
      label: t("reviews"),
      path: "/reviews",
      icon: <Eye size={18} />,
      count: counts.reviews,
    },
    {
      label: t("repositories"),
      path: "/repositories",
      icon: <FolderGit2 size={18} />,
      count: counts.repos,
    },
    {
      label: t("projects"),
      path: "/projects",
      icon: <Briefcase size={18} />,
      count: projects.length,
    },
    {
      label: t("members"),
      path: "/members",
      icon: <Users size={18} />,
      count: counts.members,
    },
  ];

  useEffect(() => {
    const handleOnline = () => {
      toast.success(
        language === "vi"
          ? "Đã khôi phục kết nối mạng"
          : "Internet connection restored",
      );
      fetchSidebarStats();
      fetchNotifications();
    };
    const handleOffline = () => {
      toast.warning(
        language === "vi"
          ? "Bạn đang ở chế độ ngoại tuyến (Offline)"
          : "You are currently offline",
      );
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [language]);

  const getBreadcrumbs = () => {
    const parts = location.split("?")[0].split("/").filter(Boolean);
    if (parts.length === 0) {
      return [{ label: t("inbox"), path: "/" }];
    }
    const crumbs = [{ label: t("inbox"), path: "/" }];
    let currentPath = "";
    parts.forEach((p, idx) => {
      currentPath += `/${p}`;
      let label = p.charAt(0).toUpperCase() + p.slice(1);
      if (p === "posts") label = t("posts");
      if (p === "issues") label = t("issues");
      if (p === "reviews") label = t("reviews");
      if (p === "repositories") label = t("repositories");
      if (p === "projects") label = t("projects");
      if (p === "members") label = t("members");
      if (p === "settings") label = t("settings");
      if (p === "connected-accounts") label = t("connectedAccounts");
      if (p === "new")
        label = parts[0] === "issues" ? t("newPost") : t("askForReview");
      if (parts[0] === "issues" && idx === 1 && p !== "new") label = `#${p}`;
      if (parts[0] === "reviews" && idx === 1 && p !== "new")
        label = `Review #${p}`;
      crumbs.push({ label, path: currentPath });
    });
    return crumbs;
  };

  const renderSidebarContent = (isDrawer: boolean = false) => {
    const isCollapsed = isDrawer ? false : sidebarCollapsed;
    const width = isDrawer ? 280 : sidebarCollapsed ? 68 : 270;

    return (
      <Box
        sx={{
          width,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: tokens.surface,
          borderRight: `1px solid ${tokens.border}`,
          transition: "width 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <Box
          sx={{
            height: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "flex-start",
            px: isCollapsed ? 1 : 2,
            borderBottom: `1px solid ${tokens.divider}`,
            flexShrink: 0,
          }}
        >
          <Box
            onClick={() => setLocation("/")}
            sx={{ cursor: "pointer", display: "flex", alignItems: "center" }}
          >
            <BrandLogo size="medium" showText={!isCollapsed} />
          </Box>
        </Box>

        {isCollapsed ? (
          <Tooltip
            title={`${activeWorkspace?.name || t("workspace")} (@${activeWorkspace?.slug || "ws"})`}
            placement="right"
          >
            <Box
              onClick={(e) => setWorkspaceMenuAnchor(e.currentTarget)}
              sx={{
                py: 1.4,
                display: "flex",
                justifyContent: "center",
                borderBottom: `1px solid ${tokens.divider}`,
                backgroundColor: tokens.surfaceSecondary,
                cursor: "pointer",
                transition: "background-color 0.15s ease",
                "&:hover": { backgroundColor: tokens.hover },
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
              cursor: "pointer",
              transition: "background-color 0.15s ease",
              "&:hover": { backgroundColor: tokens.hover },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    color: tokens.textPrimary,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {activeWorkspace?.name || t("noWorkspace")}
                </Typography>
              </Box>
              <ChevronsUpDown size={15} color={tokens.textSecondary} />
            </Box>

            <Box
              sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.5 }}
            >
              <Typography
                variant="caption"
                sx={{ color: tokens.textSecondary, fontSize: "0.72rem" }}
                noWrap
              >
                @{activeWorkspace?.slug || "workspace"}
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
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: tokens.textSecondary,
                letterSpacing: "0.04em",
              }}
            >
              {t("workspaces").toUpperCase()}
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
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  py: 1.2,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: isSelected ? 700 : 500 }}
                    >
                      {ws.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: tokens.textSecondary }}
                    >
                      @{ws.slug}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                  {isSelected && <Check size={16} color={tokens.primary} />}
                </Box>
              </MenuItem>
            );
          })}
          <Divider />
          <MenuItem
            onClick={() => {
              setWorkspaceMenuAnchor(null);
              setCreateWorkspaceOpen(true);
            }}
          >
            <Plus
              size={16}
              style={{ marginRight: 12, color: tokens.primary }}
            />
            <Typography variant="body2">
              {language === "vi" ? "Tạo workspace" : "Create workspace"}
            </Typography>
          </MenuItem>
          <MenuItem
            onClick={() => {
              setWorkspaceMenuAnchor(null);
              setLocation("/settings/workspace");
            }}
          >
            <Settings
              size={16}
              style={{ marginRight: 12, color: tokens.primary }}
            />
            <Typography variant="body2">
              {language === "vi" ? "Cài đặt Workspace" : "Workspace Settings"}
            </Typography>
          </MenuItem>
        </Menu>

        <Box id="tour-sidebar" sx={{ p: 1.2, flex: 1, overflowY: "auto" }}>
          {!isCollapsed && (
            <Typography
              variant="caption"
              sx={{
                px: 1.4,
                pt: 1,
                pb: 0.8,
                display: "block",
                color: tokens.textSecondary,
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}
            >
              {t("coreViews")}
            </Typography>
          )}

          {navItems.map((item) => {
            const isActive =
              location === item.path ||
              (item.path !== "/" && location.startsWith(item.path));
            return (
              <Tooltip
                key={item.path}
                title={isCollapsed ? item.label : ""}
                placement="right"
              >
                <Box
                  onClick={() => {
                    setLocation(item.path);
                    if (isMobile) setMobileDrawerOpen(false);
                  }}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: isCollapsed ? "center" : "space-between",
                    px: 1.4,
                    py: 1.15,
                    my: 0.5,
                    minHeight: 40,
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.84rem",
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? tokens.textPrimary : tokens.textSecondary,
                    backgroundColor: isActive
                      ? "rgba(110, 118, 129, 0.14)"
                      : "transparent",
                    borderLeft: isActive
                      ? `3px solid ${tokens.primary}`
                      : "3px solid transparent",
                    transition: "all 0.15s ease",
                    "&:hover": {
                      backgroundColor: isActive
                        ? "rgba(110, 118, 129, 0.2)"
                        : tokens.hover,
                      color: tokens.textPrimary,
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.2,
                      color: isActive ? tokens.primary : "inherit",
                    }}
                  >
                    {item.icon}
                    {!isCollapsed && (
                      <span
                        style={{
                          color: isActive ? tokens.textPrimary : "inherit",
                        }}
                      >
                        {item.label}
                      </span>
                    )}
                  </Box>
                  {!isCollapsed &&
                    item.count !== undefined &&
                    item.count > 0 && (
                      <Chip
                        label={item.count}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: "0.6875rem",
                          fontWeight: 600,
                          backgroundColor: tokens.surfaceSecondary,
                          color: isActive
                            ? tokens.textPrimary
                            : tokens.textSecondary,
                          border: `1px solid ${tokens.border}`,
                        }}
                      />
                    )}
                </Box>
              </Tooltip>
            );
          })}

          {!isCollapsed && projects.length > 0 && (
            <>
              <Divider sx={{ my: 1.8 }} />
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 1.4,
                  pt: 1,
                  pb: 0.8,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: tokens.textSecondary,
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                  }}
                >
                  {t("projects").toUpperCase()}
                </Typography>
                <Typography
                  onClick={() => setLocation("/projects")}
                  variant="caption"
                  sx={{
                    color: tokens.primary,
                    cursor: "pointer",
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  + {t("projects")}
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
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      px: 1.4,
                      py: 0.95,
                      my: 0.4,
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "0.8rem",
                      fontWeight: isSelected ? 600 : 500,
                      backgroundColor: isSelected
                        ? tokens.primary
                        : "transparent",
                      color: isSelected ? "#ffffff" : tokens.textSecondary,
                      transition: "all 0.15s ease",
                      "&:hover": {
                        backgroundColor: isSelected
                          ? tokens.primaryHover
                          : tokens.hover,
                        color: isSelected ? "#ffffff" : tokens.textPrimary,
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        minWidth: 0,
                      }}
                    >
                      <Box
                        sx={{
                          px: 0.6,
                          py: 0.1,
                          borderRadius: "4px",
                          backgroundColor: isSelected
                            ? "rgba(255,255,255,0.18)"
                            : tokens.surfaceSecondary,
                          fontSize: "0.625rem",
                          fontWeight: 700,
                          color: isSelected ? "#fff" : tokens.textSecondary,
                          border: `1px solid ${isSelected ? "rgba(255,255,255,0.28)" : tokens.border}`,
                        }}
                      >
                        {proj.key}
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: "0.8rem",
                          color: isSelected ? "#fff" : "inherit",
                        }}
                        noWrap
                      >
                        {proj.name}
                      </Typography>
                    </Box>
                    {isSelected && (
                      <Chip
                        label="Đang lọc"
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: "0.5625rem",
                          fontWeight: 700,
                          backgroundColor: "rgba(255,255,255,0.18)",
                          color: "#ffffff",
                        }}
                      />
                    )}
                  </Box>
                );
              })}
            </>
          )}

          {!sidebarCollapsed && savedViewsList.length > 0 && (
            <>
              <Divider sx={{ my: 1.8 }} />
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 1.4,
                  pt: 1,
                  pb: 0.8,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: tokens.textSecondary,
                    fontWeight: 700,
                    letterSpacing: "0.05em",
                  }}
                >
                  {t("savedViews")}
                </Typography>
              </Box>

              {savedViewsList.map((sv) => (
                <Box
                  key={sv.id}
                  onClick={() => handleApplySavedView(sv)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    px: 1.4,
                    py: 0.95,
                    my: 0.4,
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    color: tokens.textSecondary,
                    transition: "all 0.15s ease",
                    "&:hover": {
                      backgroundColor: tokens.hover,
                      color: tokens.textPrimary,
                      "& .delete-view-btn": { opacity: 1 },
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.2,
                      minWidth: 0,
                    }}
                  >
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor:
                          sv.targetType === "REVIEW"
                            ? "#a855f7"
                            : sv.filterState?.priority === "P0"
                              ? "#ef4444"
                              : "#6366f1",
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{ fontSize: "0.8rem" }}
                      noWrap
                    >
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
                      transition: "opacity 0.15s ease",
                      color: tokens.textSecondary,
                      "&:hover": { color: tokens.error },
                    }}
                  >
                    <X size={14} />
                  </IconButton>
                </Box>
              ))}
            </>
          )}

          {isMobile && (
            <Box
              sx={{
                mt: 2,
                pt: 1.5,
                borderTop: `1px solid ${tokens.divider}`,
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              {canInstall && (
                <Button
                  size="small"
                  variant="outlined"
                  fullWidth
                  startIcon={<Download size={16} color={tokens.primary} />}
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    installApp();
                  }}
                  sx={{
                    justifyContent: "flex-start",
                    borderColor: tokens.primary,
                    color: tokens.primary,
                    textTransform: "none",
                    fontSize: "0.8125rem",
                  }}
                >
                  {language === "vi" ? "Cài đặt App" : "Install App"}
                </Button>
              )}
              <Button
                size="small"
                variant="outlined"
                fullWidth
                startIcon={<Globe size={16} />}
                onClick={() => {
                  setLanguage(language === "vi" ? "en" : "vi");
                }}
                sx={{
                  justifyContent: "flex-start",
                  borderColor: tokens.border,
                  color: tokens.textPrimary,
                  textTransform: "none",
                  fontSize: "0.8125rem",
                }}
              >
                {language === "vi"
                  ? "Ngôn ngữ: English"
                  : "Language: Tiếng Việt"}
              </Button>
              <Button
                size="small"
                variant="outlined"
                fullWidth
                startIcon={<HelpCircle size={16} color={tokens.primary} />}
                onClick={() => {
                  setMobileDrawerOpen(false);
                  window.dispatchEvent(new CustomEvent("reported-start-tour"));
                }}
                sx={{
                  justifyContent: "flex-start",
                  borderColor: tokens.border,
                  color: tokens.textPrimary,
                  textTransform: "none",
                  fontSize: "0.8125rem",
                }}
              >
                {language === "vi" ? "Hướng dẫn sử dụng" : "Product Tour"}
              </Button>
            </Box>
          )}
        </Box>

        {user && (
          <Box
            sx={{
              p: 1.5,
              borderTop: `1px solid ${tokens.divider}`,
              backgroundColor: tokens.surfaceSecondary,
            }}
          >
            <Box
              id="tour-user-menu"
              onClick={(e) => setUserMenuAnchor(e.currentTarget)}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: isCollapsed ? "center" : "space-between",
                gap: 1,
                cursor: "pointer",
                p: 0.5,
                borderRadius: "6px",
                "&:hover": { backgroundColor: tokens.hover },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  overflow: "hidden",
                }}
              >
                <UserAvatar user={user} size={28} showTooltip={false} />
                {!isCollapsed && (
                  <Box sx={{ overflow: "hidden" }}>
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 600, fontSize: "0.8125rem" }}
                      noWrap
                    >
                      {user.displayName}
                    </Typography>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: tokens.textSecondary,
                          fontSize: "0.6875rem",
                        }}
                        noWrap
                      >
                        @{user.username}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>
              {!isCollapsed && (
                <ChevronDown size={15} color={tokens.textSecondary} />
              )}
            </Box>

            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={() => setUserMenuAnchor(null)}
              PaperProps={{ sx: { minWidth: 210 } }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {user.displayName}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: tokens.textSecondary }}
                >
                  {user.email}
                </Typography>
              </Box>
              <Divider />
              <MenuItem
                onClick={() => {
                  setUserMenuAnchor(null);
                  setLocation(`/users/${user.username}`);
                }}
              >
                <User
                  size={16}
                  style={{ marginRight: 12, color: tokens.primary }}
                />{" "}
                {t("profile")}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setUserMenuAnchor(null);
                  setLocation("/settings/connected-accounts");
                }}
              >
                <GitBranch
                  size={16}
                  style={{ marginRight: 12, color: tokens.primary }}
                />{" "}
                {t("connectedAccounts")}
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setUserMenuAnchor(null);
                  setPreferencesOpen(true);
                }}
              >
                <Bell
                  size={16}
                  style={{ marginRight: 12, color: tokens.primary }}
                />{" "}
                {t("notificationPrefs")}
              </MenuItem>
              <Divider />
              <MenuItem
                onClick={() => {
                  setUserMenuAnchor(null);
                  logout();
                  setLocation("/login");
                }}
              >
                <LogOut
                  size={16}
                  style={{ marginRight: 12, color: tokens.error }}
                />{" "}
                {t("logout")}
              </MenuItem>
            </Menu>
          </Box>
        )}

        {!isDrawer && !isMobile && (
          <Box
            onClick={toggleSidebar}
            sx={{
              height: 44,
              minHeight: 44,
              borderTop: `1px solid ${tokens.divider}`,
              backgroundColor: tokens.surfaceSecondary,
              display: "flex",
              alignItems: "center",
              justifyContent: isCollapsed ? "center" : "flex-start",
              px: isCollapsed ? 0 : 2,
              cursor: "pointer",
              color: tokens.textSecondary,
              fontSize: "0.8125rem",
              fontWeight: 600,
              userSelect: "none",
              transition: "all 0.15s ease",
              "&:hover": {
                backgroundColor: tokens.hover,
                color: tokens.textPrimary,
              },
            }}
          >
            <Tooltip
              title={isCollapsed ? `${t("expandSidebar")} (Ctrl+B)` : ""}
              placement="right"
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.2,
                  width: "100%",
                  justifyContent: isCollapsed ? "center" : "flex-start",
                }}
              >
                {isCollapsed ? (
                  <ChevronRight size={18} />
                ) : (
                  <>
                    <ChevronLeft size={16} />
                    <span>{t("collapseSidebar")}</span>
                  </>
                )}
              </Box>
            </Tooltip>
          </Box>
        )}
      </Box>
    );
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <Box
      sx={{
        display: "flex",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: tokens.background,
      }}
    >
      {!isMobile && renderSidebarContent(false)}

      {isMobile && (
        <Drawer
          anchor="left"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          PaperProps={{
            sx: {
              width: 280,
              backgroundColor: tokens.surface,
              borderRight: `1px solid ${tokens.border}`,
            },
          }}
        >
          {renderSidebarContent(true)}
        </Drawer>
      )}

      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            height: 60,
            minHeight: 60,
            px: { xs: 2, md: 3 },
            borderBottom: `1px solid ${tokens.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "relative",
            backgroundColor: tokens.surface,
            backdropFilter: "blur(16px)",
            flexShrink: 0,
            zIndex: 10,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              minWidth: 0,
              maxWidth: { xs: "60%", sm: "38%", md: "28%" },
            }}
          >
            {isMobile && (
              <IconButton
                size="small"
                onClick={() => setMobileDrawerOpen(true)}
              >
                <MenuIcon size={22} />
              </IconButton>
            )}

            <Breadcrumbs
              separator={
                <ChevronRight size={14} color={tokens.textSecondary} />
              }
              aria-label="breadcrumb"
              sx={{
                display: { xs: "none", sm: "flex" },
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
            >
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return isLast ? (
                  <Typography
                    key={crumb.path}
                    sx={{
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: tokens.textPrimary,
                      maxWidth: 160,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
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
                      fontSize: "0.875rem",
                      color: tokens.textSecondary,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {crumb.label}
                  </MuiLink>
                );
              })}
            </Breadcrumbs>
          </Box>

          {!isMobile && (
            <Box
              sx={{
                display: { xs: "none", sm: "flex" },
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                mx: { sm: 2, md: 3 },
                minWidth: 0,
              }}
            >
              <Box
                id="tour-search"
                onClick={() => setCmdOpen(true)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 2,
                  py: 0.8,
                  height: 38,
                  boxSizing: "border-box",
                  borderRadius: "8px",
                  backgroundColor: tokens.surfaceSecondary,
                  border: `1px solid ${tokens.border}`,
                  cursor: "pointer",
                  color: tokens.textSecondary,
                  fontSize: "0.875rem",
                  width: "100%",
                  maxWidth: { sm: 220, md: 280, lg: 360 },
                  transition: "all 0.15s ease",
                  "&:hover": {
                    borderColor: tokens.primary,
                    backgroundColor: tokens.hover,
                  },
                }}
              >
                <Search size={16} color={tokens.textSecondary} />
                <span
                  style={{
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {t("searchPlaceholder")}
                </span>
                <Box
                  component="kbd"
                  sx={{
                    display: { xs: "none", md: "inline-flex" },
                    alignItems: "center",
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    px: 0.8,
                    py: 0.2,
                    borderRadius: "4px",
                    backgroundColor: tokens.surface,
                    border: `1px solid ${tokens.border}`,
                    color: tokens.textSecondary,
                    lineHeight: 1,
                  }}
                >
                  Ctrl+K
                </Box>
              </Box>
            </Box>
          )}

          <Box
            id="tour-theme-lang"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: 0.8, sm: 1.2 },
              ml: { xs: "auto", sm: 0 },
              flexShrink: 0,
            }}
          >
            {isMobile && (
              <IconButton
                size="small"
                onClick={() => setCmdOpen(true)}
                sx={{
                  color: tokens.textSecondary,
                  "&:hover": {
                    color: tokens.textPrimary,
                    backgroundColor: tokens.hover,
                  },
                }}
              >
                <Search size={20} />
              </IconButton>
            )}
            {canInstall && (
              <Tooltip
                title={
                  language === "vi"
                    ? "Cài đặt ứng dụng Reported"
                    : "Install Reported App"
                }
              >
                <Button
                  size="small"
                  variant="outlined"
                  onClick={installApp}
                  startIcon={<Download size={15} color={tokens.primary} />}
                  sx={{
                    height: 38,
                    px: 1.5,
                    fontSize: "0.84rem",
                    fontWeight: 600,
                    borderColor: tokens.primary,
                    color: tokens.primary,
                    borderRadius: "8px",
                    textTransform: "none",
                    display: { xs: "none", sm: "inline-flex" },
                    "&:hover": {
                      borderColor: tokens.primary,
                      backgroundColor: tokens.hover,
                    },
                  }}
                >
                  {language === "vi" ? "Cài đặt App" : "Install App"}
                </Button>
              </Tooltip>
            )}

            <Tooltip
              title={
                language === "vi"
                  ? "Xem tour hướng dẫn sử dụng tính năng"
                  : "Take an interactive product tour"
              }
            >
              <Button
                size="small"
                variant="outlined"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("reported-start-tour"))
                }
                startIcon={<HelpCircle size={15} color={tokens.primary} />}
                sx={{
                  height: 38,
                  px: 1.6,
                  fontSize: "0.84rem",
                  fontWeight: 600,
                  borderColor: tokens.border,
                  color: tokens.textPrimary,
                  borderRadius: "8px",
                  textTransform: "none",
                  display: { xs: "none", md: "inline-flex" },
                  "&:hover": {
                    borderColor: tokens.primary,
                    backgroundColor: tokens.hover,
                  },
                }}
              >
                {language === "vi" ? "Hướng dẫn" : "Tour"}
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
                fontSize: "0.84rem",
                fontWeight: 600,
                borderColor: tokens.border,
                color: tokens.textPrimary,
                borderRadius: "8px",
                textTransform: "none",
                display: { xs: "none", md: "inline-flex" },
              }}
            >
              {language === "vi" ? "Tiếng Việt" : "English"}
            </Button>

            <Menu
              anchorEl={langMenuAnchor}
              open={Boolean(langMenuAnchor)}
              onClose={() => setLangMenuAnchor(null)}
            >
              <MenuItem
                selected={language === "vi"}
                onClick={() => {
                  setLanguage("vi");
                  setLangMenuAnchor(null);
                }}
              >
                Tiếng Việt
              </MenuItem>
              <MenuItem
                selected={language === "en"}
                onClick={() => {
                  setLanguage("en");
                  setLangMenuAnchor(null);
                }}
              >
                English
              </MenuItem>
            </Menu>

            <Box
              id="tour-notifications"
              sx={{ display: "inline-flex", alignItems: "center" }}
            >
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
                onClick={() =>
                  setMode(resolvedMode === "dark" ? "light" : "dark")
                }
                sx={{
                  color: tokens.textSecondary,
                  "&:hover": {
                    color: tokens.textPrimary,
                    backgroundColor: tokens.hover,
                  },
                }}
              >
                {resolvedMode === "dark" ? (
                  <Sun size={20} />
                ) : (
                  <Moon size={20} />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box
          component="main"
          sx={{
            flex: 1,
            p: { xs: 1.5, sm: 2.5, md: 3 },
            overflowY: "auto",
            overflowX: "hidden",
            width: "100%",
            height: "calc(100vh - 60px)",
          }}
        >
          {location === "/" && <DashboardCodeHostingBanner />}
          {children}
        </Box>
      </Box>

      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onOpenCreateIssue={() => setLocation("/issues/new")}
        onOpenCreateReview={() => setLocation("/reviews/new")}
      />

      <LinkRepoModal
        open={linkRepoOpen}
        onClose={() => setLinkRepoOpen(false)}
        onSuccess={() => {
          fetchSidebarStats();
          setLocation("/repositories");
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
            borderRadius: "8px",
            backgroundColor: tokens.surface,
            border: `1px solid ${tokens.border}`,
            backgroundImage: "none",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {language === "vi"
            ? "Tạo không gian làm việc mới"
            : "Create New Workspace"}
        </DialogTitle>
        <DialogContent
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            pt: "12px !important",
          }}
        >
          {workspaceError && (
            <Alert
              severity="error"
              sx={{ borderRadius: "6px" }}
              onClose={() => setWorkspaceError(null)}
            >
              {workspaceError}
            </Alert>
          )}
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
            {[
              {
                label: language === "vi" ? "⚡ Kỹ thuật" : "⚡ Engineering",
                name: "Engineering",
              },
              {
                label: language === "vi" ? "🚀 Sản phẩm" : "🚀 Product",
                name: "Product Team",
              },
              {
                label: language === "vi" ? "🎨 Thiết kế" : "🎨 Design",
                name: "Design Studio",
              },
              {
                label: language === "vi" ? "🛠 Hạ tầng" : "🛠 Infrastructure",
                name: "Infrastructure",
              },
            ].map((preset) => (
              <Chip
                key={preset.name}
                label={preset.label}
                size="small"
                onClick={() => {
                  setWorkspaceName(preset.name);
                  setWorkspaceSlug(slugify(preset.name));
                }}
                sx={{
                  cursor: "pointer",
                  fontSize: "0.72rem",
                  borderRadius: "4px",
                  backgroundColor: tokens.surfaceSecondary,
                  border: `1px solid ${tokens.border}`,
                  "&:hover": {
                    borderColor: tokens.primary,
                    color: tokens.primary,
                  },
                }}
              />
            ))}
          </Box>
          <TextField
            label={language === "vi" ? "Tên workspace" : "Workspace name"}
            value={workspaceName}
            onChange={(e) => {
              const val = e.target.value;
              setWorkspaceName(val);
              setWorkspaceSlug(slugify(val));
            }}
            placeholder="Engineering, Design Team..."
            required
            fullWidth
          />
          <TextField
            label="Slug"
            value={workspaceSlug}
            onChange={(e) => setWorkspaceSlug(slugify(e.target.value))}
            placeholder="engineering"
            helperText={
              language === "vi"
                ? "Tự động tạo từ tên workspace, có thể tùy chỉnh theo ý bạn"
                : "Automatically generated from name, fully customizable"
            }
            required
            fullWidth
          />
          <Box
            sx={{
              px: 1.4,
              py: 0.9,
              borderRadius: "6px",
              backgroundColor: tokens.surfaceSecondary,
              border: `1px solid ${tokens.border}`,
              display: "flex",
              alignItems: "center",
              gap: 0.8,
              fontSize: "0.75rem",
              color: tokens.textSecondary,
            }}
          >
            <Globe size={13} color={tokens.primary} />
            <span>URL: </span>
            <Typography
              component="span"
              sx={{
                fontFamily: "monospace",
                fontWeight: 600,
                color: tokens.primary,
                fontSize: "0.75rem",
              }}
            >
              reported.dev/@{workspaceSlug || "workspace-slug"}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setCreateWorkspaceOpen(false)}
            disabled={creatingWorkspace}
            sx={{ borderRadius: "6px", color: tokens.textSecondary }}
          >
            {language === "vi" ? "Hủy" : "Cancel"}
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateWorkspace}
            disabled={creatingWorkspace}
            sx={{ borderRadius: "6px", minWidth: 90 }}
          >
            {creatingWorkspace
              ? language === "vi"
                ? "Đang tạo..."
                : "Creating..."
              : language === "vi"
                ? "Tạo"
                : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      <OnboardingTour />
    </Box>
  );
};
