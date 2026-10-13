import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Chip,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  Menu as MuiMenu,
  Select,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Drawer,
  CircularProgress,
  LinearProgress,
  Divider,
  Pagination,
} from "@mui/material";
import {
  ShieldCheck,
  Users,
  FileText,
  MessageSquare,
  ThumbsUp,
  Heart,
  Flame,
  Rocket,
  Eye,
  Activity,
  BarChart3,
  Search,
  RefreshCw,
  Download,
  ExternalLink,
  Trash2,
  EyeOff,
  History,
  Lock,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  TrendingUp,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  FolderGit2,
  Plus,
  Edit3,
  Layers,
  Tag,
  Mail,
  GitBranch,
  ArrowUpRight,
  Check,
  X,
  KeyRound,
  RotateCcw,
  Radio,
  Send,
  HelpCircle,
  Briefcase,
  Server,
  Megaphone,
  Cpu,
  Wrench,
  ArrowLeft,
  LogOut,
  Sun,
  Moon,
  Globe,
  Menu,
  Database,
  Settings,
  User,
} from "lucide-react";
import { useThemeContext } from "../contexts/ThemeContext";
import { useAuthContext } from "../contexts/AuthContext";
import { useI18n } from "../contexts/I18nContext";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { apiFetch } from "../api/client";
import { toast } from "../contexts/ToastContext";
import { UserAvatar } from "../components/common/UserAvatar";
import { BrandLogo } from "../components/common/BrandLogo";
import { UserRole, WorkspaceRole } from "@reported/contracts";
import { useLocation } from "wouter";
import {
  OverviewSkeleton,
  WorkspacesSkeleton,
  ProjectsSkeleton,
  UsersSkeleton,
  PostsSkeleton,
  CommentsSkeleton,
  ReactionsSkeleton,
  LabelsSkeleton,
  RepositoriesSkeleton,
  QueuesSkeleton,
  AuditLogsSkeleton,
  DiagnosticsSkeleton,
} from "./AdminSkeletons";

interface OverviewStats {
  totalUsers: number;
  twoFactorCount: number;
  adminCount: number;
  totalIssues: number;
  openIssues: number;
  resolvedIssues: number;
  totalReviews: number;
  totalPosts: number;
  totalComments: number;
  hiddenComments: number;
  totalReactions: number;
  totalWorkspaces: number;
  totalProjects: number;
  totalLabels: number;
  totalRepositories: number;
  pendingEmailJobs: number;
  pendingOutboxEvents: number;
}

interface DistributionItem {
  reaction?: string;
  status?: string;
  role?: string;
  count: number;
}

interface TimelinePoint {
  date: string;
  posts: number;
  comments: number;
  reactions: number;
}

interface TopContributor {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  commentsCount: number;
  issuesCount: number;
}

interface AdminStatsResponse {
  overview: OverviewStats;
  distributions: {
    reactions: DistributionItem[];
    issueStatus: DistributionItem[];
    roles: DistributionItem[];
  };
  timeline: TimelinePoint[];
  topContributors: TopContributor[];
}

interface AdminWorkspaceItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarUrl: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  ownerUsername: string;
  ownerDisplayName: string;
  ownerEmail: string;
  ownerAvatarUrl: string | null;
  membersCount: number;
  projectsCount: number;
  issuesCount: number;
}

interface AdminWorkspaceMemberItem {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  joinedAt: string;
}

interface AdminProjectItem {
  id: string;
  name: string;
  key: string;
  slug: string;
  description: string | null;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
  workspaceName: string;
  workspaceSlug: string;
  issuesCount: number;
}

interface AdminLabelItem {
  id: string;
  name: string;
  color: string;
  description: string | null;
  workspaceId: string;
  createdAt: string;
  workspaceName: string;
  workspaceSlug: string;
  issuesCount: number;
}

interface AdminRepoItem {
  id: string;
  workspaceId: string;
  name: string;
  owner: string;
  fullName: string;
  isPrivate: boolean;
  defaultBranch: string;
  createdAt: string;
  workspaceName: string;
  workspaceSlug: string;
  pullRequestsCount: number;
}

interface AdminQueueEmailItem {
  id: string;
  toEmail: string;
  subject: string;
  template: string;
  status: string;
  attempts: number;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
}

interface AdminQueueOutboxItem {
  id: string;
  eventType: string;
  status: string;
  retryCount: number;
  lastError: string | null;
  createdAt: string;
  processedAt: string | null;
  payload: any;
}

interface AdminQueuesResponse {
  emails: AdminQueueEmailItem[];
  outbox: AdminQueueOutboxItem[];
}

interface AdminUserItem {
  id: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  githubUsername: string | null;
  role: string;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  issuesCount: number;
  reviewsCount: number;
  postsCount: number;
  commentsCount: number;
  reactionsCount: number;
  workspacesCount: number;
}

interface AdminPostItem {
  id: string;
  number: number;
  title: string;
  description: string;
  status: string;
  type?: string;
  reviewType?: string;
  priority?: string;
  severity?: string;
  authorId: string;
  workspaceId: string | null;
  projectId: string | null;
  createdAt: string;
  postType: "ISSUE" | "REVIEW";
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  workspaceName?: string;
  workspaceSlug?: string;
  commentsCount: number;
}

interface AdminCommentItem {
  id: string;
  targetType: string;
  targetId: string;
  authorId: string;
  content: string;
  isHidden: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl: string | null;
  targetTitle: string;
  targetNumber: number;
  reactionsCount: number;
  editsCount: number;
}

interface AdminReactionItem {
  commentId: string;
  userId: string;
  reaction: string;
  createdAt: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  commentSnippet: string;
  targetType: string;
  targetId: string;
  targetNumber: number;
  targetTitle: string;
}

interface AdminAuditLogItem {
  id: string;
  actorId: string | null;
  action: string;
  targetResource: string;
  details: any;
  ipAddress: string | null;
  createdAt: string;
  actorUsername: string | null;
  actorDisplayName: string | null;
  actorAvatarUrl: string | null;
}

interface UserDetailPayload {
  user: AdminUserItem;
  workspaces: Array<{
    workspaceId: string;
    role: string;
    name: string;
    slug: string;
  }>;
  recentIssues: Array<{
    id: string;
    number: number;
    title: string;
    status: string;
    createdAt: string;
  }>;
  recentReviews: Array<{
    id: string;
    number: number;
    title: string;
    reviewType: string;
    status: string;
    createdAt: string;
  }>;
  recentComments: Array<{
    id: string;
    targetType: string;
    targetId: string;
    content: string;
    isHidden: boolean;
    createdAt: string;
  }>;
  recentReactions: Array<{
    commentId: string;
    reaction: string;
    createdAt: string;
  }>;
}

interface CommentEditItem {
  id: string;
  commentId: string;
  editorId: string;
  previousContent: string;
  newContent: string;
  createdAt: string;
  editorUsername: string;
  editorDisplayName: string;
  editorAvatarUrl: string | null;
}

const TAB_INDEX_TO_SLUG: Record<number, string> = {
  0: "",
  1: "workspaces",
  2: "projects",
  3: "users",
  4: "posts",
  5: "comments",
  6: "reactions",
  7: "labels",
  8: "repositories",
  9: "queues",
  10: "audit",
  11: "diagnostics",
};

const SLUG_TO_TAB_INDEX: Record<string, number> = {
  "": 0,
  overview: 0,
  workspaces: 1,
  projects: 2,
  users: 3,
  posts: 4,
  comments: 5,
  reactions: 6,
  labels: 7,
  repositories: 8,
  queues: 9,
  audit: 10,
  diagnostics: 11,
};

export const AdminDashboardPage: React.FC = () => {
  const { tokens, resolvedMode, setMode } = useThemeContext();
  const { user, logout, isLoading: authLoading } = useAuthContext();
  const { language, setLanguage, t } = useI18n();
  const { setActiveWorkspace, activeWorkspace } = useWorkspace();
  const [location, setLocation] = useLocation();

  const getTabIndexFromLocation = useCallback((loc: string) => {
    const cleanPath = loc.replace(/^\/admin\/?/, "");
    const firstSegment = cleanPath.split("/")[0] || "";
    return SLUG_TO_TAB_INDEX[firstSegment] ?? 0;
  }, []);

  const [activeTab, setActiveTab] = useState<number>(() => {
    const cleanPath = window.location.pathname.replace(/^\/admin\/?/, "");
    const firstSegment = cleanPath.split("/")[0] || "";
    return SLUG_TO_TAB_INDEX[firstSegment] ?? 0;
  });
  const [visitedTabs, setVisitedTabs] = useState<Set<number>>(() => {
    const cleanPath = window.location.pathname.replace(/^\/admin\/?/, "");
    const firstSegment = cleanPath.split("/")[0] || "";
    const initialIndex = SLUG_TO_TAB_INDEX[firstSegment] ?? 0;
    return new Set([0, initialIndex]);
  });
  const loadedTabsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const tabFromLoc = getTabIndexFromLocation(location);
    setActiveTab(tabFromLoc);
    setVisitedTabs((prev) => {
      if (prev.has(tabFromLoc)) return prev;
      const next = new Set(prev);
      next.add(tabFromLoc);
      return next;
    });
  }, [location, getTabIndexFromLocation]);

  const handleSelectTab = useCallback((tabIndex: number) => {
    setActiveTab(tabIndex);
    setVisitedTabs((prev) => {
      if (prev.has(tabIndex)) return prev;
      const next = new Set(prev);
      next.add(tabIndex);
      return next;
    });
    const slug = TAB_INDEX_TO_SLUG[tabIndex];
    const targetUrl = slug ? `/admin/${slug}` : "/admin";
    if (location !== targetUrl) {
      setLocation(targetUrl);
    }
  }, [location, setLocation]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(true);
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);

  const [workspacesList, setWorkspacesList] = useState<AdminWorkspaceItem[]>([]);
  const [workspacesPage, setWorkspacesPage] = useState<number>(1);
  const [workspacesTotalPages, setWorkspacesTotalPages] = useState<number>(1);
  const [workspacesTotal, setWorkspacesTotal] = useState<number>(0);
  const [workspacesSearch, setWorkspacesSearch] = useState<string>("");
  const [loadingWorkspaces, setLoadingWorkspaces] = useState<boolean>(false);

  const [projectsList, setProjectsList] = useState<AdminProjectItem[]>([]);
  const [projectsPage, setProjectsPage] = useState<number>(1);
  const [projectsTotalPages, setProjectsTotalPages] = useState<number>(1);
  const [projectsTotal, setProjectsTotal] = useState<number>(0);
  const [projectsSearch, setProjectsSearch] = useState<string>("");
  const [projectsWsFilter, setProjectsWsFilter] = useState<string>("");
  const [loadingProjects, setLoadingProjects] = useState<boolean>(false);

  const [labelsList, setLabelsList] = useState<AdminLabelItem[]>([]);
  const [labelsPage, setLabelsPage] = useState<number>(1);
  const [labelsTotalPages, setLabelsTotalPages] = useState<number>(1);
  const [labelsTotal, setLabelsTotal] = useState<number>(0);
  const [labelsSearch, setLabelsSearch] = useState<string>("");
  const [loadingLabels, setLoadingLabels] = useState<boolean>(false);

  const [reposList, setReposList] = useState<AdminRepoItem[]>([]);
  const [loadingRepos, setLoadingRepos] = useState<boolean>(false);

  const [queuesData, setQueuesData] = useState<AdminQueuesResponse | null>(null);
  const [loadingQueues, setLoadingQueues] = useState<boolean>(false);
  const [retryingQueues, setRetryingQueues] = useState<boolean>(false);

  const [usersList, setUsersList] = useState<AdminUserItem[]>([]);
  const [usersPage, setUsersPage] = useState<number>(1);
  const [usersTotalPages, setUsersTotalPages] = useState<number>(1);
  const [usersTotal, setUsersTotal] = useState<number>(0);
  const [usersSearch, setUsersSearch] = useState<string>("");
  const [usersRoleFilter, setUsersRoleFilter] = useState<string>("");
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);

  const [postsList, setPostsList] = useState<AdminPostItem[]>([]);
  const [postsPage, setPostsPage] = useState<number>(1);
  const [postsTotalPages, setPostsTotalPages] = useState<number>(1);
  const [postsTotal, setPostsTotal] = useState<number>(0);
  const [postsSearch, setPostsSearch] = useState<string>("");
  const [postsTypeFilter, setPostsTypeFilter] = useState<string>("");
  const [postsStatusFilter, setPostsStatusFilter] = useState<string>("");
  const [postsWsFilter, setPostsWsFilter] = useState<string>("");
  const [loadingPosts, setLoadingPosts] = useState<boolean>(false);

  const [diagnosticsData, setDiagnosticsData] = useState<any | null>(null);
  const [loadingDiagnostics, setLoadingDiagnostics] = useState<boolean>(false);
  const [broadcastOpen, setBroadcastOpen] = useState<boolean>(false);
  const [broadcastTitle, setBroadcastTitle] = useState<string>("");
  const [broadcastMessage, setBroadcastMessage] = useState<string>("");
  const [broadcastLink, setBroadcastLink] = useState<string>("");
  const [submittingBroadcast, setSubmittingBroadcast] = useState<boolean>(false);
  const [cleanupDialogOpen, setCleanupDialogOpen] = useState<boolean>(false);
  const [cleaningSystem, setCleaningSystem] = useState<boolean>(false);

  const [commentsList, setCommentsList] = useState<AdminCommentItem[]>([]);
  const [commentsPage, setCommentsPage] = useState<number>(1);
  const [commentsTotalPages, setCommentsTotalPages] = useState<number>(1);
  const [commentsTotal, setCommentsTotal] = useState<number>(0);
  const [commentsSearch, setCommentsSearch] = useState<string>("");
  const [commentsHiddenFilter, setCommentsHiddenFilter] = useState<string>("");
  const [commentsTargetIdFilter, setCommentsTargetIdFilter] = useState<string>("");
  const [commentsAuthorIdFilter, setCommentsAuthorIdFilter] = useState<string>("");
  const [loadingComments, setLoadingComments] = useState<boolean>(false);

  const [reactionsList, setReactionsList] = useState<AdminReactionItem[]>([]);
  const [reactionsPage, setReactionsPage] = useState<number>(1);
  const [reactionsTotalPages, setReactionsTotalPages] = useState<number>(1);
  const [reactionsTotal, setReactionsTotal] = useState<number>(0);
  const [reactionsTypeFilter, setReactionsTypeFilter] = useState<string>("");
  const [reactionsUserIdFilter, setReactionsUserIdFilter] = useState<string>("");
  const [loadingReactions, setLoadingReactions] = useState<boolean>(false);

  const [auditLogsList, setAuditLogsList] = useState<AdminAuditLogItem[]>([]);
  const [auditLogsPage, setAuditLogsPage] = useState<number>(1);
  const [auditLogsTotalPages, setAuditLogsTotalPages] = useState<number>(1);
  const [auditLogsTotal, setAuditLogsTotal] = useState<number>(0);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState<boolean>(false);

  const [inspectedUser, setInspectedUser] = useState<UserDetailPayload | null>(null);
  const [inspectDrawerOpen, setInspectDrawerOpen] = useState<boolean>(false);
  const [loadingInspectUser, setLoadingInspectUser] = useState<boolean>(false);

  const [roleModalUser, setRoleModalUser] = useState<AdminUserItem | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<string>(UserRole.USER);
  const [submittingRole, setSubmittingRole] = useState<boolean>(false);

  const [createUserOpen, setCreateUserOpen] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState<string>("");
  const [newEmail, setNewEmail] = useState<string>("");
  const [newDisplayName, setNewDisplayName] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [newUserRole, setNewUserRole] = useState<string>(UserRole.USER);
  const [submittingCreateUser, setSubmittingCreateUser] = useState<boolean>(false);

  const [resetPassUser, setResetPassUser] = useState<AdminUserItem | null>(null);
  const [resetNewPass, setResetNewPass] = useState<string>("");
  const [submittingResetPass, setSubmittingResetPass] = useState<boolean>(false);

  const [deleteUserItem, setDeleteUserItem] = useState<AdminUserItem | null>(null);
  const [submittingDeleteUser, setSubmittingDeleteUser] = useState<boolean>(false);

  const [editUserModalOpen, setEditUserModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [editDisplayName, setEditDisplayName] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editBio, setEditBio] = useState<string>("");
  const [editGithubUsername, setEditGithubUsername] = useState<string>("");
  const [editUserRole, setEditUserRole] = useState<string>(UserRole.USER);
  const [submittingEditUser, setSubmittingEditUser] = useState<boolean>(false);

  const [createWsOpen, setCreateWsOpen] = useState<boolean>(false);
  const [wsName, setWsName] = useState<string>("");
  const [wsSlug, setWsSlug] = useState<string>("");
  const [wsDesc, setWsDesc] = useState<string>("");
  const [wsOwnerId, setWsOwnerId] = useState<string>("");
  const [submittingCreateWs, setSubmittingCreateWs] = useState<boolean>(false);

  const [editWsItem, setEditWsItem] = useState<AdminWorkspaceItem | null>(null);
  const [editWsName, setEditWsName] = useState<string>("");
  const [editWsSlug, setEditWsSlug] = useState<string>("");
  const [editWsDesc, setEditWsDesc] = useState<string>("");
  const [submittingEditWs, setSubmittingEditWs] = useState<boolean>(false);

  const [deleteWsItem, setDeleteWsItem] = useState<AdminWorkspaceItem | null>(null);
  const [submittingDeleteWs, setSubmittingDeleteWs] = useState<boolean>(false);

  const [memberWsItem, setMemberWsItem] = useState<AdminWorkspaceItem | null>(null);
  const [wsMembersList, setWsMembersList] = useState<AdminWorkspaceMemberItem[]>([]);
  const [loadingWsMembers, setLoadingWsMembers] = useState<boolean>(false);
  const [addMemberUserId, setAddMemberUserId] = useState<string>("");
  const [addMemberRole, setAddMemberRole] = useState<string>(WorkspaceRole.MEMBER);
  const [submittingAddMember, setSubmittingAddMember] = useState<boolean>(false);

  const [createProjOpen, setCreateProjOpen] = useState<boolean>(false);
  const [projWsId, setProjWsId] = useState<string>("");
  const [projKey, setProjKey] = useState<string>("");
  const [projName, setProjName] = useState<string>("");
  const [projSlug, setProjSlug] = useState<string>("");
  const [projDesc, setProjDesc] = useState<string>("");
  const [submittingCreateProj, setSubmittingCreateProj] = useState<boolean>(false);

  const [editProjItem, setEditProjItem] = useState<AdminProjectItem | null>(null);
  const [editProjKey, setEditProjKey] = useState<string>("");
  const [editProjName, setEditProjName] = useState<string>("");
  const [editProjSlug, setEditProjSlug] = useState<string>("");
  const [editProjDesc, setEditProjDesc] = useState<string>("");
  const [submittingEditProj, setSubmittingEditProj] = useState<boolean>(false);

  const [deleteProjItem, setDeleteProjItem] = useState<AdminProjectItem | null>(null);
  const [submittingDeleteProj, setSubmittingDeleteProj] = useState<boolean>(false);

  const [createLabelOpen, setCreateLabelOpen] = useState<boolean>(false);
  const [labelWsId, setLabelWsId] = useState<string>("");
  const [labelName, setLabelName] = useState<string>("");
  const [labelColor, setLabelColor] = useState<string>("#3b82f6");
  const [labelDesc, setLabelDesc] = useState<string>("");
  const [submittingCreateLabel, setSubmittingCreateLabel] = useState<boolean>(false);

  const [editLabelItem, setEditLabelItem] = useState<AdminLabelItem | null>(null);
  const [editLabelName, setEditLabelName] = useState<string>("");
  const [editLabelColor, setEditLabelColor] = useState<string>("#3b82f6");
  const [editLabelDesc, setEditLabelDesc] = useState<string>("");
  const [submittingEditLabel, setSubmittingEditLabel] = useState<boolean>(false);

  const [deleteLabelItem, setDeleteLabelItem] = useState<AdminLabelItem | null>(null);
  const [submittingDeleteLabel, setSubmittingDeleteLabel] = useState<boolean>(false);

  const [deleteRepoItem, setDeleteRepoItem] = useState<AdminRepoItem | null>(null);
  const [submittingDeleteRepo, setSubmittingDeleteRepo] = useState<boolean>(false);

  const [editPostItem, setEditPostItem] = useState<AdminPostItem | null>(null);
  const [editPostTitle, setEditPostTitle] = useState<string>("");
  const [editPostDesc, setEditPostDesc] = useState<string>("");
  const [editPostStatus, setEditPostStatus] = useState<string>("");
  const [editPostPriority, setEditPostPriority] = useState<string>("");
  const [submittingEditPost, setSubmittingEditPost] = useState<boolean>(false);

  const [deletePostItem, setDeletePostItem] = useState<AdminPostItem | null>(null);
  const [submittingDeletePost, setSubmittingDeletePost] = useState<boolean>(false);

  const [editCommentItem, setEditCommentItem] = useState<AdminCommentItem | null>(null);
  const [editCommentContent, setEditCommentContent] = useState<string>("");
  const [submittingEditComment, setSubmittingEditComment] = useState<boolean>(false);

  const [deleteCommentItem, setDeleteCommentItem] = useState<AdminCommentItem | null>(null);
  const [submittingDeleteComment, setSubmittingDeleteComment] = useState<boolean>(false);

  const [moderateCommentItem, setModerateCommentItem] = useState<AdminCommentItem | null>(null);
  const [moderateReason, setModerateReason] = useState<string>("SPAM");
  const [submittingModeration, setSubmittingModeration] = useState<boolean>(false);

  const [editHistoryComment, setEditHistoryComment] = useState<AdminCommentItem | null>(null);
  const [editHistoryList, setEditHistoryList] = useState<CommentEditItem[]>([]);
  const [loadingEditHistory, setLoadingEditHistory] = useState<boolean>(false);

  const [inspectLogItem, setInspectLogItem] = useState<AdminAuditLogItem | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const res = await apiFetch<AdminStatsResponse>("/admin/stats");
      setStats(res);
      loadedTabsRef.current.add(0);
    } catch {
      toast.error(language === "vi" ? "Không thể tải số liệu quản trị" : "Failed to load admin stats");
    } finally {
      setLoadingStats(false);
    }
  }, [language]);

  const fetchWorkspaces = useCallback(async () => {
    try {
      setLoadingWorkspaces(true);
      const params = new URLSearchParams();
      params.set("page", String(workspacesPage));
      params.set("limit", "15");
      if (workspacesSearch) params.set("search", workspacesSearch);

      const res = await apiFetch<{
        data: AdminWorkspaceItem[];
        pagination: { totalPages: number; total: number };
      }>(`/admin/workspaces?${params.toString()}`);
      setWorkspacesList(res.data);
      setWorkspacesTotalPages(res.pagination.totalPages);
      setWorkspacesTotal(res.pagination.total);
      loadedTabsRef.current.add(1);
    } catch {
      toast.error(language === "vi" ? "Không thể tải danh sách workspace" : "Failed to load workspaces");
    } finally {
      setLoadingWorkspaces(false);
    }
  }, [workspacesPage, workspacesSearch, language]);

  const fetchProjects = useCallback(async () => {
    try {
      setLoadingProjects(true);
      const params = new URLSearchParams();
      params.set("page", String(projectsPage));
      params.set("limit", "15");
      if (projectsSearch) params.set("search", projectsSearch);
      if (projectsWsFilter) params.set("workspaceId", projectsWsFilter);

      const res = await apiFetch<{
        data: AdminProjectItem[];
        pagination: { totalPages: number; total: number };
      }>(`/admin/projects?${params.toString()}`);
      setProjectsList(res.data);
      setProjectsTotalPages(res.pagination.totalPages);
      setProjectsTotal(res.pagination.total);
      loadedTabsRef.current.add(2);
    } catch {
      toast.error(language === "vi" ? "Không thể tải danh sách dự án" : "Failed to load projects");
    } finally {
      setLoadingProjects(false);
    }
  }, [projectsPage, projectsSearch, projectsWsFilter, language]);

  const fetchLabels = useCallback(async () => {
    try {
      setLoadingLabels(true);
      const params = new URLSearchParams();
      params.set("page", String(labelsPage));
      params.set("limit", "20");
      if (labelsSearch) params.set("search", labelsSearch);

      const res = await apiFetch<any>(`/admin/labels?${params.toString()}`);
      if (Array.isArray(res)) {
        setLabelsList(res);
        setLabelsTotalPages(1);
        setLabelsTotal(res.length);
      } else if (res && Array.isArray(res.data)) {
        setLabelsList(res.data);
        setLabelsTotalPages(res.pagination?.totalPages || 1);
        setLabelsTotal(res.pagination?.total || res.data.length);
      } else {
        setLabelsList([]);
        setLabelsTotalPages(1);
        setLabelsTotal(0);
      }
      loadedTabsRef.current.add(7);
    } catch {
      toast.error(language === "vi" ? "Không thể tải danh sách nhãn" : "Failed to load labels");
    } finally {
      setLoadingLabels(false);
    }
  }, [labelsPage, labelsSearch, language]);

  const fetchRepos = useCallback(async () => {
    try {
      setLoadingRepos(true);
      const res = await apiFetch<AdminRepoItem[]>("/admin/repositories");
      setReposList(res);
      loadedTabsRef.current.add(8);
    } catch {
      toast.error(language === "vi" ? "Không thể tải danh sách kho mã nguồn" : "Failed to load repositories");
    } finally {
      setLoadingRepos(false);
    }
  }, [language]);

  const fetchQueues = useCallback(async () => {
    try {
      setLoadingQueues(true);
      const res = await apiFetch<AdminQueuesResponse>("/admin/queues");
      setQueuesData(res);
      loadedTabsRef.current.add(9);
    } catch {
      toast.error(language === "vi" ? "Không thể tải thông tin hàng đợi" : "Failed to load queues");
    } finally {
      setLoadingQueues(false);
    }
  }, [language]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const params = new URLSearchParams();
      params.set("page", String(usersPage));
      params.set("limit", "15");
      if (usersSearch) params.set("search", usersSearch);
      if (usersRoleFilter) params.set("role", usersRoleFilter);

      const res = await apiFetch<{
        data: AdminUserItem[];
        pagination: { totalPages: number; total: number };
      }>(`/admin/users?${params.toString()}`);
      setUsersList(res.data);
      setUsersTotalPages(res.pagination.totalPages);
      setUsersTotal(res.pagination.total);
      loadedTabsRef.current.add(3);
    } catch {
      toast.error(language === "vi" ? "Không thể tải danh sách thành viên" : "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  }, [usersPage, usersSearch, usersRoleFilter, language]);

  const fetchPosts = useCallback(async () => {
    try {
      setLoadingPosts(true);
      const params = new URLSearchParams();
      params.set("page", String(postsPage));
      params.set("limit", "15");
      if (postsSearch) params.set("search", postsSearch);
      if (postsTypeFilter) params.set("postType", postsTypeFilter);
      if (postsStatusFilter) params.set("status", postsStatusFilter);
      if (postsWsFilter) params.set("workspaceId", postsWsFilter);

      const res = await apiFetch<{
        data: AdminPostItem[];
        pagination: { totalPages: number; total: number };
      }>(`/admin/posts?${params.toString()}`);
      setPostsList(res.data);
      setPostsTotalPages(res.pagination.totalPages);
      setPostsTotal(res.pagination.total);
      loadedTabsRef.current.add(4);
    } catch {
      toast.error(language === "vi" ? "Không thể tải danh sách bài viết" : "Failed to load posts");
    } finally {
      setLoadingPosts(false);
    }
  }, [postsPage, postsSearch, postsTypeFilter, postsStatusFilter, postsWsFilter, language]);

  const fetchComments = useCallback(async () => {
    try {
      setLoadingComments(true);
      const params = new URLSearchParams();
      params.set("page", String(commentsPage));
      params.set("limit", "15");
      if (commentsSearch) params.set("search", commentsSearch);
      if (commentsHiddenFilter) params.set("isHidden", commentsHiddenFilter);
      if (commentsTargetIdFilter) params.set("targetId", commentsTargetIdFilter);
      if (commentsAuthorIdFilter) params.set("authorId", commentsAuthorIdFilter);

      const res = await apiFetch<{
        data: AdminCommentItem[];
        pagination: { totalPages: number; total: number };
      }>(`/admin/comments?${params.toString()}`);
      setCommentsList(res.data);
      setCommentsTotalPages(res.pagination.totalPages);
      setCommentsTotal(res.pagination.total);
      loadedTabsRef.current.add(5);
    } catch {
      toast.error(language === "vi" ? "Không thể tải danh sách bình luận" : "Failed to load comments");
    } finally {
      setLoadingComments(false);
    }
  }, [commentsPage, commentsSearch, commentsHiddenFilter, commentsTargetIdFilter, commentsAuthorIdFilter, language]);

  const fetchReactions = useCallback(async () => {
    try {
      setLoadingReactions(true);
      const params = new URLSearchParams();
      params.set("page", String(reactionsPage));
      params.set("limit", "15");
      if (reactionsTypeFilter) params.set("reactionType", reactionsTypeFilter);
      if (reactionsUserIdFilter) params.set("userId", reactionsUserIdFilter);

      const res = await apiFetch<{
        data: AdminReactionItem[];
        pagination: { totalPages: number; total: number };
      }>(`/admin/reactions?${params.toString()}`);
      setReactionsList(res.data);
      setReactionsTotalPages(res.pagination.totalPages);
      setReactionsTotal(res.pagination.total);
      loadedTabsRef.current.add(6);
    } catch {
      toast.error(language === "vi" ? "Không thể tải danh sách tương tác" : "Failed to load reactions");
    } finally {
      setLoadingReactions(false);
    }
  }, [reactionsPage, reactionsTypeFilter, reactionsUserIdFilter, language]);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoadingAuditLogs(true);
      const params = new URLSearchParams();
      params.set("page", String(auditLogsPage));
      params.set("limit", "15");

      const res = await apiFetch<{
        data: AdminAuditLogItem[];
        pagination: { totalPages: number; total: number };
      }>(`/admin/audit-logs?${params.toString()}`);
      setAuditLogsList(res.data);
      setAuditLogsTotalPages(res.pagination.totalPages);
      setAuditLogsTotal(res.pagination.total);
      loadedTabsRef.current.add(10);
    } catch {
      toast.error(language === "vi" ? "Không thể tải lịch sử kiểm toán" : "Failed to load audit logs");
    } finally {
      setLoadingAuditLogs(false);
    }
  }, [auditLogsPage, language]);

  const fetchDiagnostics = useCallback(async () => {
    try {
      setLoadingDiagnostics(true);
      const res = await apiFetch<any>("/admin/system/diagnostics");
      setDiagnosticsData(res);
      loadedTabsRef.current.add(11);
    } catch {
      toast.error(language === "vi" ? "Không thể tải số liệu chẩn đoán" : "Failed to load diagnostics");
    } finally {
      setLoadingDiagnostics(false);
    }
  }, [language]);

  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      toast.error(language === "vi" ? "Vui lòng nhập đầy đủ tiêu đề và nội dung" : "Please fill in title and message");
      return;
    }
    try {
      setSubmittingBroadcast(true);
      const res = await apiFetch<{ success: boolean; count: number }>("/admin/system/broadcast", {
        method: "POST",
        body: JSON.stringify({
          title: broadcastTitle.trim(),
          message: broadcastMessage.trim(),
          link: broadcastLink.trim() || "/",
        }),
      });
      toast.success(
        language === "vi"
          ? `Đã phát thông báo thành công tới ${res.count} người dùng!`
          : `Broadcasted to ${res.count} users!`,
      );
      setBroadcastOpen(false);
      setBroadcastTitle("");
      setBroadcastMessage("");
      setBroadcastLink("");
      fetchAuditLogs();
    } catch {
      toast.error(language === "vi" ? "Phát thông báo thất bại" : "Failed to broadcast");
    } finally {
      setSubmittingBroadcast(false);
    }
  };

  const handleCleanSystem = async () => {
    try {
      setCleaningSystem(true);
      await apiFetch("/admin/system/cleanup", { method: "POST" });
      toast.success(
        language === "vi"
          ? "Đã dọn dẹp phiên hết hạn & outbox thành công!"
          : "Cleaned up expired sessions & processed outbox!",
      );
      setCleanupDialogOpen(false);
      fetchDiagnostics();
      fetchQueues();
      fetchAuditLogs();
    } catch {
      toast.error(language === "vi" ? "Dọn dẹp thất bại" : "Cleanup failed");
    } finally {
      setCleaningSystem(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (user?.role?.toUpperCase() !== "ADMIN") {
      setLocation("/");
      return;
    }
    fetchStats();
  }, [user, authLoading, setLocation, fetchStats]);

  useEffect(() => {
    if (activeTab === 0 && !loadedTabsRef.current.has(0)) fetchStats();
    if (activeTab === 1 && !loadedTabsRef.current.has(1)) fetchWorkspaces();
    if (activeTab === 2 && !loadedTabsRef.current.has(2)) fetchProjects();
    if (activeTab === 3 && !loadedTabsRef.current.has(3)) fetchUsers();
    if (activeTab === 4 && !loadedTabsRef.current.has(4)) fetchPosts();
    if (activeTab === 5 && !loadedTabsRef.current.has(5)) fetchComments();
    if (activeTab === 6 && !loadedTabsRef.current.has(6)) fetchReactions();
    if (activeTab === 7 && !loadedTabsRef.current.has(7)) fetchLabels();
    if (activeTab === 8 && !loadedTabsRef.current.has(8)) fetchRepos();
    if (activeTab === 9 && !loadedTabsRef.current.has(9)) fetchQueues();
    if (activeTab === 10 && !loadedTabsRef.current.has(10)) fetchAuditLogs();
    if (activeTab === 11 && !loadedTabsRef.current.has(11)) fetchDiagnostics();
  }, [
    activeTab,
    fetchStats,
    fetchWorkspaces,
    fetchProjects,
    fetchUsers,
    fetchPosts,
    fetchComments,
    fetchReactions,
    fetchLabels,
    fetchRepos,
    fetchQueues,
    fetchAuditLogs,
    fetchDiagnostics,
  ]);

  useEffect(() => {
    if (loadedTabsRef.current.has(1)) fetchWorkspaces();
  }, [workspacesPage, workspacesSearch, fetchWorkspaces]);

  useEffect(() => {
    if (loadedTabsRef.current.has(2)) fetchProjects();
  }, [projectsPage, projectsSearch, projectsWsFilter, fetchProjects]);

  useEffect(() => {
    if (loadedTabsRef.current.has(3)) fetchUsers();
  }, [usersPage, usersSearch, usersRoleFilter, fetchUsers]);

  useEffect(() => {
    if (loadedTabsRef.current.has(4)) fetchPosts();
  }, [postsPage, postsSearch, postsTypeFilter, postsStatusFilter, postsWsFilter, fetchPosts]);

  useEffect(() => {
    if (loadedTabsRef.current.has(5)) fetchComments();
  }, [commentsPage, commentsSearch, commentsHiddenFilter, commentsTargetIdFilter, commentsAuthorIdFilter, fetchComments]);

  useEffect(() => {
    if (loadedTabsRef.current.has(6)) fetchReactions();
  }, [reactionsPage, reactionsTypeFilter, reactionsUserIdFilter, fetchReactions]);

  useEffect(() => {
    if (loadedTabsRef.current.has(7)) fetchLabels();
  }, [labelsPage, labelsSearch, fetchLabels]);

  useEffect(() => {
    if (loadedTabsRef.current.has(10)) fetchAuditLogs();
  }, [auditLogsPage, fetchAuditLogs]);

  const handleInspectUser = async (userId: string) => {
    try {
      setLoadingInspectUser(true);
      setInspectDrawerOpen(true);
      const res = await apiFetch<UserDetailPayload>(`/admin/users/${userId}`);
      setInspectedUser(res);
    } catch {
      toast.error(language === "vi" ? "Không thể xem thông tin chi tiết" : "Failed to inspect user");
      setInspectDrawerOpen(false);
    } finally {
      setLoadingInspectUser(false);
    }
  };

  const handleSaveRole = async () => {
    if (!roleModalUser) return;
    try {
      setSubmittingRole(true);
      await apiFetch(`/admin/users/${roleModalUser.id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: selectedNewRole }),
      });
      toast.success(language === "vi" ? "Cập nhật vai trò thành công" : "User role updated");
      setRoleModalUser(null);
      fetchUsers();
    } catch {
      toast.error(language === "vi" ? "Cập nhật vai trò thất bại" : "Failed to update role");
    } finally {
      setSubmittingRole(false);
    }
  };

  const handleOpenEditUser = (u: AdminUserItem) => {
    setEditingUser(u);
    setEditDisplayName(u.displayName || "");
    setEditEmail(u.email || "");
    setEditBio(u.bio || "");
    setEditGithubUsername(u.githubUsername || "");
    setEditUserRole(u.role || UserRole.USER);
    setEditUserModalOpen(true);
  };

  const handleSaveEditUser = async () => {
    if (!editingUser) return;
    try {
      setSubmittingEditUser(true);
      await apiFetch(`/admin/users/${editingUser.id}/profile`, {
        method: "PATCH",
        body: JSON.stringify({
          displayName: editDisplayName.trim() || undefined,
          email: editEmail.trim() || undefined,
          bio: editBio.trim() || null,
          githubUsername: editGithubUsername.trim() || null,
          role: editUserRole,
        }),
      });
      toast.success(language === "vi" ? "Cập nhật thông tin người dùng thành công" : "User profile updated successfully");
      setEditUserModalOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || (language === "vi" ? "Cập nhật thất bại" : "Failed to update user"));
    } finally {
      setSubmittingEditUser(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUsername || !newEmail || !newPassword || !newDisplayName) {
      toast.error(language === "vi" ? "Vui lòng điền đầy đủ thông tin" : "Please fill all fields");
      return;
    }
    try {
      setSubmittingCreateUser(true);
      await apiFetch("/admin/users", {
        method: "POST",
        body: JSON.stringify({
          username: newUsername.trim(),
          email: newEmail.trim(),
          displayName: newDisplayName.trim(),
          password: newPassword,
          role: newUserRole,
        }),
      });
      toast.success(language === "vi" ? "Tạo người dùng thành công" : "User created successfully");
      setCreateUserOpen(false);
      setNewUsername("");
      setNewEmail("");
      setNewDisplayName("");
      setNewPassword("");
      fetchUsers();
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || (language === "vi" ? "Tạo người dùng thất bại" : "Failed to create user"));
    } finally {
      setSubmittingCreateUser(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPassUser || !resetNewPass) return;
    if (resetNewPass.length < 6) {
      toast.error(language === "vi" ? "Mật khẩu tối thiểu 6 ký tự" : "Password must be at least 6 characters");
      return;
    }
    try {
      setSubmittingResetPass(true);
      await apiFetch(`/admin/users/${resetPassUser.id}/password`, {
        method: "PATCH",
        body: JSON.stringify({ password: resetNewPass }),
      });
      toast.success(language === "vi" ? "Đã đặt lại mật khẩu" : "Password reset successfully");
      setResetPassUser(null);
      setResetNewPass("");
    } catch {
      toast.error(language === "vi" ? "Đặt lại mật khẩu thất bại" : "Failed to reset password");
    } finally {
      setSubmittingResetPass(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserItem) return;
    try {
      setSubmittingDeleteUser(true);
      await apiFetch(`/admin/users/${deleteUserItem.id}`, {
        method: "DELETE",
      });
      toast.success(language === "vi" ? "Đã xóa tài khoản vĩnh viễn" : "User permanently deleted");
      setDeleteUserItem(null);
      fetchUsers();
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || (language === "vi" ? "Xóa người dùng thất bại" : "Failed to delete user"));
    } finally {
      setSubmittingDeleteUser(false);
    }
  };

  const handleEnterWorkspace = (ws: AdminWorkspaceItem) => {
    setActiveWorkspace({
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      description: ws.description,
      avatarUrl: ws.avatarUrl,
      ownerId: ws.ownerId,
    } as any);
    toast.success(
      language === "vi"
        ? `Đã chuyển sang workspace "${ws.name}"`
        : `Switched to workspace "${ws.name}"`,
    );
    setLocation("/");
  };

  const handleCreateWorkspace = async () => {
    if (!wsName || !wsSlug) {
      toast.error(language === "vi" ? "Vui lòng nhập tên và slug" : "Name and slug required");
      return;
    }
    try {
      setSubmittingCreateWs(true);
      await apiFetch("/admin/workspaces", {
        method: "POST",
        body: JSON.stringify({
          name: wsName.trim(),
          slug: wsSlug.trim().toLowerCase(),
          description: wsDesc.trim() || null,
          ownerId: wsOwnerId || user?.id,
        }),
      });
      toast.success(language === "vi" ? "Tạo workspace thành công" : "Workspace created");
      setCreateWsOpen(false);
      setWsName("");
      setWsSlug("");
      setWsDesc("");
      fetchWorkspaces();
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || (language === "vi" ? "Tạo workspace thất bại" : "Failed to create workspace"));
    } finally {
      setSubmittingCreateWs(false);
    }
  };

  const handleEditWorkspace = async () => {
    if (!editWsItem || !editWsName || !editWsSlug) return;
    try {
      setSubmittingEditWs(true);
      await apiFetch(`/admin/workspaces/${editWsItem.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editWsName.trim(),
          slug: editWsSlug.trim().toLowerCase(),
          description: editWsDesc.trim() || null,
        }),
      });
      toast.success(language === "vi" ? "Cập nhật workspace thành công" : "Workspace updated");
      setEditWsItem(null);
      fetchWorkspaces();
    } catch (err: any) {
      toast.error(err.message || (language === "vi" ? "Cập nhật workspace thất bại" : "Failed to update workspace"));
    } finally {
      setSubmittingEditWs(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!deleteWsItem) return;
    try {
      setSubmittingDeleteWs(true);
      await apiFetch(`/admin/workspaces/${deleteWsItem.id}`, {
        method: "DELETE",
      });
      toast.success(language === "vi" ? "Đã xóa workspace" : "Workspace deleted");
      setDeleteWsItem(null);
      fetchWorkspaces();
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || (language === "vi" ? "Xóa workspace thất bại" : "Failed to delete workspace"));
    } finally {
      setSubmittingDeleteWs(false);
    }
  };

  const handleOpenMembersModal = async (ws: AdminWorkspaceItem) => {
    setMemberWsItem(ws);
    setLoadingWsMembers(true);
    try {
      const res = await apiFetch<AdminWorkspaceMemberItem[]>(`/admin/workspaces/${ws.id}/members`);
      setWsMembersList(res);
    } catch {
      toast.error(language === "vi" ? "Không thể tải thành viên workspace" : "Failed to load members");
    } finally {
      setLoadingWsMembers(false);
    }
  };

  const handleAddWorkspaceMember = async () => {
    if (!memberWsItem || !addMemberUserId) return;
    try {
      setSubmittingAddMember(true);
      await apiFetch(`/admin/workspaces/${memberWsItem.id}/members`, {
        method: "POST",
        body: JSON.stringify({ userId: addMemberUserId, role: addMemberRole }),
      });
      toast.success(language === "vi" ? "Đã thêm thành viên" : "Member added");
      setAddMemberUserId("");
      const updated = await apiFetch<AdminWorkspaceMemberItem[]>(`/admin/workspaces/${memberWsItem.id}/members`);
      setWsMembersList(updated);
      fetchWorkspaces();
    } catch (err: any) {
      toast.error(err.message || (language === "vi" ? "Thêm thành viên thất bại" : "Failed to add member"));
    } finally {
      setSubmittingAddMember(false);
    }
  };

  const handleChangeMemberRole = async (targetUserId: string, nextRole: string) => {
    if (!memberWsItem) return;
    try {
      await apiFetch(`/admin/workspaces/${memberWsItem.id}/members/${targetUserId}`, {
        method: "PATCH",
        body: JSON.stringify({ role: nextRole }),
      });
      toast.success(language === "vi" ? "Đã cập nhật vai trò" : "Member role updated");
      const updated = await apiFetch<AdminWorkspaceMemberItem[]>(`/admin/workspaces/${memberWsItem.id}/members`);
      setWsMembersList(updated);
    } catch {
      toast.error(language === "vi" ? "Cập nhật vai trò thất bại" : "Failed to update role");
    }
  };

  const handleRemoveWorkspaceMember = async (targetUserId: string) => {
    if (!memberWsItem) return;
    try {
      await apiFetch(`/admin/workspaces/${memberWsItem.id}/members/${targetUserId}`, {
        method: "DELETE",
      });
      toast.success(language === "vi" ? "Đã xóa thành viên khỏi workspace" : "Member removed");
      const updated = await apiFetch<AdminWorkspaceMemberItem[]>(`/admin/workspaces/${memberWsItem.id}/members`);
      setWsMembersList(updated);
      fetchWorkspaces();
    } catch {
      toast.error(language === "vi" ? "Xóa thành viên thất bại" : "Failed to remove member");
    }
  };

  const handleCreateProject = async () => {
    if (!projWsId || !projKey || !projName || !projSlug) {
      toast.error(language === "vi" ? "Vui lòng nhập đầy đủ trường" : "All fields are required");
      return;
    }
    try {
      setSubmittingCreateProj(true);
      await apiFetch("/admin/projects", {
        method: "POST",
        body: JSON.stringify({
          workspaceId: projWsId,
          key: projKey.trim().toUpperCase(),
          name: projName.trim(),
          slug: projSlug.trim().toLowerCase(),
          description: projDesc.trim() || null,
        }),
      });
      toast.success(language === "vi" ? "Tạo dự án thành công" : "Project created");
      setCreateProjOpen(false);
      setProjKey("");
      setProjName("");
      setProjSlug("");
      setProjDesc("");
      fetchProjects();
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || (language === "vi" ? "Tạo dự án thất bại" : "Failed to create project"));
    } finally {
      setSubmittingCreateProj(false);
    }
  };

  const handleEditProject = async () => {
    if (!editProjItem || !editProjKey || !editProjName || !editProjSlug) return;
    try {
      setSubmittingEditProj(true);
      await apiFetch(`/admin/projects/${editProjItem.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          key: editProjKey.trim().toUpperCase(),
          name: editProjName.trim(),
          slug: editProjSlug.trim().toLowerCase(),
          description: editProjDesc.trim() || null,
        }),
      });
      toast.success(language === "vi" ? "Cập nhật dự án thành công" : "Project updated");
      setEditProjItem(null);
      fetchProjects();
    } catch (err: any) {
      toast.error(err.message || (language === "vi" ? "Cập nhật dự án thất bại" : "Failed to update project"));
    } finally {
      setSubmittingEditProj(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteProjItem) return;
    try {
      setSubmittingDeleteProj(true);
      await apiFetch(`/admin/projects/${deleteProjItem.id}`, {
        method: "DELETE",
      });
      toast.success(language === "vi" ? "Đã xóa dự án" : "Project deleted");
      setDeleteProjItem(null);
      fetchProjects();
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || (language === "vi" ? "Xóa dự án thất bại" : "Failed to delete project"));
    } finally {
      setSubmittingDeleteProj(false);
    }
  };

  const handleCreateLabel = async () => {
    if (!labelWsId || !labelName) {
      toast.error(language === "vi" ? "Vui lòng nhập tên nhãn và chọn workspace" : "Name and workspace required");
      return;
    }
    try {
      setSubmittingCreateLabel(true);
      await apiFetch("/admin/labels", {
        method: "POST",
        body: JSON.stringify({
          workspaceId: labelWsId,
          name: labelName.trim().toLowerCase(),
          color: labelColor,
          description: labelDesc.trim() || null,
        }),
      });
      toast.success(language === "vi" ? "Tạo nhãn thành công" : "Label created");
      setCreateLabelOpen(false);
      setLabelName("");
      setLabelDesc("");
      fetchLabels();
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || (language === "vi" ? "Tạo nhãn thất bại" : "Failed to create label"));
    } finally {
      setSubmittingCreateLabel(false);
    }
  };

  const handleEditLabel = async () => {
    if (!editLabelItem || !editLabelName) return;
    try {
      setSubmittingEditLabel(true);
      await apiFetch(`/admin/labels/${editLabelItem.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editLabelName.trim().toLowerCase(),
          color: editLabelColor,
          description: editLabelDesc.trim() || null,
        }),
      });
      toast.success(language === "vi" ? "Cập nhật nhãn thành công" : "Label updated");
      setEditLabelItem(null);
      fetchLabels();
    } catch (err: any) {
      toast.error(err.message || (language === "vi" ? "Cập nhật nhãn thất bại" : "Failed to update label"));
    } finally {
      setSubmittingEditLabel(false);
    }
  };

  const handleDeleteLabel = async () => {
    if (!deleteLabelItem) return;
    try {
      setSubmittingDeleteLabel(true);
      await apiFetch(`/admin/labels/${deleteLabelItem.id}`, {
        method: "DELETE",
      });
      toast.success(language === "vi" ? "Đã xóa nhãn" : "Label deleted");
      setDeleteLabelItem(null);
      fetchLabels();
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || (language === "vi" ? "Xóa nhãn thất bại" : "Failed to delete label"));
    } finally {
      setSubmittingDeleteLabel(false);
    }
  };

  const handleDeleteRepo = async () => {
    if (!deleteRepoItem) return;
    try {
      setSubmittingDeleteRepo(true);
      await apiFetch(`/admin/repositories/${deleteRepoItem.id}`, {
        method: "DELETE",
      });
      toast.success(language === "vi" ? "Đã ngắt kết nối repository" : "Repository unlinked");
      setDeleteRepoItem(null);
      fetchRepos();
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || (language === "vi" ? "Ngắt kết nối thất bại" : "Failed to unlink repository"));
    } finally {
      setSubmittingDeleteRepo(false);
    }
  };

  const handleRetryQueues = async () => {
    try {
      setRetryingQueues(true);
      const res = await apiFetch<{ emailRetried: number; outboxRetried: number }>("/admin/queues/retry", {
        method: "POST",
      });
      toast.success(
        language === "vi"
          ? `Đã kích hoạt thử lại: ${res.emailRetried} emails, ${res.outboxRetried} outbox events`
          : `Retried ${res.emailRetried} emails and ${res.outboxRetried} outbox events`,
      );
      fetchQueues();
      fetchStats();
    } catch {
      toast.error(language === "vi" ? "Kích hoạt thử lại thất bại" : "Failed to retry queues");
    } finally {
      setRetryingQueues(false);
    }
  };

  const handleEditPost = async () => {
    if (!editPostItem || !editPostTitle) return;
    try {
      setSubmittingEditPost(true);
      await apiFetch(`/admin/posts/${editPostItem.postType}/${editPostItem.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editPostTitle.trim(),
          description: editPostDesc,
          status: editPostStatus,
          priority: editPostPriority,
        }),
      });
      toast.success(language === "vi" ? "Cập nhật bài viết thành công" : "Post updated successfully");
      setEditPostItem(null);
      fetchPosts();
    } catch (err: any) {
      toast.error(err.message || (language === "vi" ? "Cập nhật thất bại" : "Failed to update post"));
    } finally {
      setSubmittingEditPost(false);
    }
  };

  const handleDeletePost = async () => {
    if (!deletePostItem) return;
    try {
      setSubmittingDeletePost(true);
      await apiFetch(`/admin/posts/${deletePostItem.postType}/${deletePostItem.id}`, {
        method: "DELETE",
      });
      toast.success(language === "vi" ? "Đã xóa vĩnh viễn bài viết" : "Post permanently deleted");
      setDeletePostItem(null);
      fetchPosts();
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || (language === "vi" ? "Xóa bài viết thất bại" : "Failed to delete post"));
    } finally {
      setSubmittingDeletePost(false);
    }
  };

  const handleSaveModeration = async (shouldHide: boolean) => {
    if (!moderateCommentItem) return;
    try {
      setSubmittingModeration(true);
      await apiFetch(`/admin/comments/${moderateCommentItem.id}/moderate`, {
        method: "PATCH",
        body: JSON.stringify({
          isHidden: shouldHide,
          reason: moderateReason,
        }),
      });
      toast.success(
        shouldHide
          ? language === "vi"
            ? "Đã ẩn bình luận vi phạm"
            : "Comment hidden"
          : language === "vi"
            ? "Đã mở lại hiển thị bình luận"
            : "Comment restored",
      );
      setModerateCommentItem(null);
      fetchComments();
      fetchStats();
    } catch {
      toast.error(language === "vi" ? "Thao tác kiểm duyệt thất bại" : "Moderation action failed");
    } finally {
      setSubmittingModeration(false);
    }
  };

  const handleEditComment = async () => {
    if (!editCommentItem || !editCommentContent.trim()) return;
    try {
      setSubmittingEditComment(true);
      await apiFetch(`/admin/comments/${editCommentItem.id}`, {
        method: "PATCH",
        body: JSON.stringify({ content: editCommentContent.trim() }),
      });
      toast.success(language === "vi" ? "Đã cập nhật nội dung bình luận" : "Comment updated");
      setEditCommentItem(null);
      fetchComments();
    } catch {
      toast.error(language === "vi" ? "Cập nhật bình luận thất bại" : "Failed to update comment");
    } finally {
      setSubmittingEditComment(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!deleteCommentItem) return;
    try {
      setSubmittingDeleteComment(true);
      await apiFetch(`/admin/comments/${deleteCommentItem.id}`, {
        method: "DELETE",
      });
      toast.success(language === "vi" ? "Đã xóa vĩnh viễn bình luận" : "Comment permanently deleted");
      setDeleteCommentItem(null);
      fetchComments();
      fetchStats();
    } catch {
      toast.error(language === "vi" ? "Xóa bình luận thất bại" : "Failed to delete comment");
    } finally {
      setSubmittingDeleteComment(false);
    }
  };

  const handleOpenEditHistory = async (comm: AdminCommentItem) => {
    setEditHistoryComment(comm);
    setLoadingEditHistory(true);
    try {
      const res = await apiFetch<CommentEditItem[]>(`/admin/comments/${comm.id}/edits`);
      setEditHistoryList(res);
    } catch {
      toast.error(language === "vi" ? "Không thể tải lịch sử sửa" : "Failed to load edits");
    } finally {
      setLoadingEditHistory(false);
    }
  };

  const handleDeleteReaction = async (r: AdminReactionItem) => {
    try {
      await apiFetch("/admin/reactions", {
        method: "DELETE",
        body: JSON.stringify({
          commentId: r.commentId,
          userId: r.userId,
          reaction: r.reaction,
        }),
      });
      toast.success(language === "vi" ? "Đã gỡ bỏ reaction" : "Reaction removed");
      fetchReactions();
      fetchStats();
    } catch {
      toast.error(language === "vi" ? "Xóa reaction thất bại" : "Failed to delete reaction");
    }
  };

  const handleExportSystemJson = () => {
    if (!stats) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(stats, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `reported-admin-governance-${new Date().toISOString().split("T")[0]}.json`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success(language === "vi" ? "Đã xuất báo cáo số liệu JSON" : "Exported metrics JSON report");
  };

  const getReactionIcon = (reaction: string) => {
    switch (reaction) {
      case "HEART":
        return <Heart size={14} color="#f43f5e" />;
      case "FLAME":
      case "FIRE":
        return <Flame size={14} color="#f97316" />;
      case "ROCKET":
        return <Rocket size={14} color="#a855f7" />;
      case "EYES":
        return <Eye size={14} color="#3b82f6" />;
      default:
        return <ThumbsUp size={14} color="#10b981" />;
    }
  };

  const getReactionLabel = (reaction: string) => {
    switch (reaction) {
      case "THUMBS_UP":
      case "LIKE":
        return language === "vi" ? "Thích (Like)" : "Thumbs Up";
      case "HEART":
        return language === "vi" ? "Yêu thích (Heart)" : "Heart";
      case "FLAME":
      case "FIRE":
        return language === "vi" ? "Hào hứng (Fire)" : "Fire";
      case "ROCKET":
        return language === "vi" ? "Tiến độ (Rocket)" : "Rocket";
      case "EYES":
        return language === "vi" ? "Đang xem (Eyes)" : "Eyes";
      case "HOORAY":
      case "TADA":
        return language === "vi" ? "Chúc mừng (Hooray)" : "Hooray";
      case "LAUGH":
        return language === "vi" ? "Hài hước (Laugh)" : "Laugh";
      case "CONFUSED":
        return language === "vi" ? "Thắc mắc (Confused)" : "Confused";
      default:
        return reaction;
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status?.toUpperCase()) {
      case "OPEN":
        return {
          label: language === "vi" ? "Đang mở (Open)" : "Open",
          color: "#f59e0b",
          bg: "rgba(245, 158, 11, 0.12)",
          border: "rgba(245, 158, 11, 0.3)",
        };
      case "IN_PROGRESS":
        return {
          label: language === "vi" ? "Đang xử lý" : "In Progress",
          color: "#3b82f6",
          bg: "rgba(59, 130, 246, 0.12)",
          border: "rgba(59, 130, 246, 0.3)",
        };
      case "IN_REVIEW":
        return {
          label: language === "vi" ? "Đang duyệt" : "In Review",
          color: "#8b5cf6",
          bg: "rgba(139, 92, 246, 0.12)",
          border: "rgba(139, 92, 246, 0.3)",
        };
      case "RESOLVED":
        return {
          label: language === "vi" ? "Đã giải quyết" : "Resolved",
          color: "#10b981",
          bg: "rgba(16, 185, 129, 0.12)",
          border: "rgba(16, 185, 129, 0.3)",
        };
      case "CLOSED":
        return {
          label: language === "vi" ? "Đã đóng" : "Closed",
          color: "#94a3b8",
          bg: "rgba(148, 163, 184, 0.12)",
          border: "rgba(148, 163, 184, 0.3)",
        };
      default:
        return {
          label: status,
          color: tokens.textSecondary,
          bg: tokens.surfaceHover,
          border: tokens.border,
        };
    }
  };

  const getRoleConfig = (role: string) => {
    switch (role?.toUpperCase()) {
      case "ADMIN":
        return {
          label: language === "vi" ? "Quản Trị Viên" : "Admin",
          color: tokens.primary,
          bg: "rgba(56, 139, 253, 0.12)",
          border: "rgba(56, 139, 253, 0.3)",
        };
      case "USER":
      case "MEMBER":
        return {
          label: language === "vi" ? "Thành Viên" : "Member",
          color: "#10b981",
          bg: "rgba(16, 185, 129, 0.12)",
          border: "rgba(16, 185, 129, 0.3)",
        };
      case "MODERATOR":
        return {
          label: language === "vi" ? "Kiểm Duyệt Viên" : "Moderator",
          color: "#a855f7",
          bg: "rgba(168, 85, 247, 0.12)",
          border: "rgba(168, 85, 247, 0.3)",
        };
      case "MAINTAINER":
        return {
          label: language === "vi" ? "Maintainer" : "Maintainer",
          color: "#06b6d4",
          bg: "rgba(6, 182, 212, 0.12)",
          border: "rgba(6, 182, 212, 0.3)",
        };
      case "REVIEWER":
        return {
          label: language === "vi" ? "Reviewer" : "Reviewer",
          color: "#f59e0b",
          bg: "rgba(245, 158, 11, 0.12)",
          border: "rgba(245, 158, 11, 0.3)",
        };
      case "OWNER":
        return {
          label: language === "vi" ? "Chủ Sở Hữu" : "Owner",
          color: "#f59e0b",
          bg: "rgba(245, 158, 11, 0.12)",
          border: "rgba(245, 158, 11, 0.3)",
        };
      case "GUEST":
        return {
          label: language === "vi" ? "Khách" : "Guest",
          color: "#94a3b8",
          bg: "rgba(148, 163, 184, 0.12)",
          border: "rgba(148, 163, 184, 0.3)",
        };
      default:
        return {
          label: role,
          color: tokens.textSecondary,
          bg: tokens.surfaceHover,
          border: tokens.border,
        };
    }
  };

  const getQueueStatusConfig = (status: string) => {
    switch (status?.toUpperCase()) {
      case "SENT":
      case "PROCESSED":
        return {
          label: language === "vi" ? (status === "SENT" ? "Đã gửi" : "Đã xử lý") : (status === "SENT" ? "Sent" : "Processed"),
          color: tokens.success,
          bg: "rgba(63, 185, 80, 0.15)",
        };
      case "FAILED":
        return {
          label: language === "vi" ? "Thất bại" : "Failed",
          color: tokens.error,
          bg: "rgba(239, 68, 68, 0.15)",
        };
      case "PENDING":
        return {
          label: language === "vi" ? "Đang chờ" : "Pending",
          color: tokens.warning,
          bg: "rgba(245, 158, 11, 0.15)",
        };
      default:
        return {
          label: status,
          color: tokens.textSecondary,
          bg: tokens.surfaceHover,
        };
    }
  };

  const formatAuditAction = (action: string) => {
    if (!action) return "";
    const normalized = action.replace(/\./g, "_").toUpperCase();
    const mapVi: Record<string, string> = {
      USER_LOGIN: "Đăng nhập",
      USER_LOGOUT: "Đăng xuất",
      USER_CREATE: "Tạo người dùng",
      USER_UPDATE: "Sửa người dùng",
      USER_DELETE: "Xóa người dùng",
      USER_ROLE_UPDATE: "Cập nhật vai trò",
      USER_PASSWORD_RESET: "Đặt lại mật khẩu",
      WORKSPACE_CREATE: "Tạo workspace",
      WORKSPACE_UPDATE: "Sửa workspace",
      WORKSPACE_DELETE: "Xóa workspace",
      WORKSPACE_MEMBER_ADD: "Thêm thành viên",
      WORKSPACE_MEMBER_UPDATE: "Sửa quyền thành viên",
      WORKSPACE_MEMBER_REMOVE: "Xóa thành viên",
      PROJECT_CREATE: "Tạo dự án",
      PROJECT_UPDATE: "Sửa dự án",
      PROJECT_DELETE: "Xóa dự án",
      LABEL_CREATE: "Tạo nhãn",
      LABEL_UPDATE: "Sửa nhãn",
      LABEL_DELETE: "Xóa nhãn",
      POST_CREATE: "Tạo bài viết",
      POST_UPDATE: "Cập nhật bài viết",
      POST_DELETE: "Xóa bài viết",
      COMMENT_CREATE: "Tạo bình luận",
      COMMENT_UPDATE: "Sửa bình luận",
      COMMENT_MODERATE: "Kiểm duyệt BL",
      COMMENT_DELETE: "Xóa bình luận",
      REPO_UNLINK: "Ngắt kết nối repo",
      QUEUES_RETRY: "Thử lại hàng đợi",
      MAINTENANCE_CLEANUP: "Dọn dẹp hệ thống",
      BROADCAST_NOTIFICATION: "Phát thông báo",
    };
    if (language === "vi" && mapVi[normalized]) {
      return mapVi[normalized];
    }
    return normalized.replace(/_/g, " ");
  };

  const formatAuditTarget = (target: string) => {
    if (!target) return "";
    const parts = target.split(":");
    const type = parts[0]?.toUpperCase() || "";
    const id = parts[1] || "";
    const mapVi: Record<string, string> = {
      USER: "Người dùng",
      USERS: "Người dùng",
      WORKSPACE: "Không gian làm việc",
      WORKSPACES: "Không gian làm việc",
      PROJECT: "Dự án",
      PROJECTS: "Dự án",
      ISSUE: "Vấn đề (Issue)",
      ISSUES: "Vấn đề (Issue)",
      REVIEW: "Đánh giá mã (Review)",
      REVIEWS: "Đánh giá mã (Review)",
      COMMENT: "Bình luận",
      COMMENTS: "Bình luận",
      LABEL: "Nhãn dán",
      LABELS: "Nhãn dán",
      REPOSITORY: "Kho mã nguồn",
      REPOSITORIES: "Kho mã nguồn",
      QUEUE: "Hàng đợi",
      QUEUES: "Hàng đợi",
      SYSTEM: "Hệ thống",
      AUTH: "Xác thực",
    };
    const prefix = (language === "vi" ? mapVi[type] : null) || type.replace(/_/g, " ");
    if (id) {
      return `${prefix} (#${id.slice(0, 8)})`;
    }
    return prefix;
  };

  const formatEventType = (type: string) => {
    if (!type) return "";
    const normalized = type.replace(/\./g, "_").toUpperCase();
    const mapVi: Record<string, string> = {
      COMMENT_CREATED: "Tạo bình luận",
      COMMENT_ADDED: "Bình luận mới",
      COMMENT_UPDATED: "Sửa bình luận",
      COMMENT_DELETED: "Xóa bình luận",
      ISSUE_CREATED: "Tạo vấn đề",
      ISSUE_UPDATED: "Cập nhật vấn đề",
      ISSUE_STATUS_CHANGED: "Đổi trạng thái vấn đề",
      ISSUE_ASSIGNED: "Giao việc vấn đề",
      POST_CREATED: "Tạo bài viết",
      POST_UPDATED: "Sửa bài viết",
      POST_DELETED: "Xóa bài viết",
      REVIEW_REQUESTED: "Yêu cầu duyệt mã",
      REVIEW_SUBMITTED: "Nộp kết quả duyệt",
      NOTIFICATION_DISPATCHED: "Gửi thông báo",
      EMAIL_SENT: "Gửi email",
      PASSWORD_RESET: "Đặt lại mật khẩu",
      WORKSPACE_INVITATION: "Lời mời tham gia workspace",
    };
    if (language === "vi" && mapVi[normalized]) {
      return mapVi[normalized];
    }
    return normalized.replace(/_/g, " ");
  };

  const getPostTypeConfig = (type: string) => {
    if (type === "ISSUE") {
      return {
        label: language === "vi" ? "Vấn đề (Issue)" : "Issue",
        bg: "rgba(245, 158, 11, 0.15)",
        color: tokens.warning,
      };
    }
    return {
      label: language === "vi" ? "Duyệt mã (Review)" : "Review Request",
      bg: "rgba(168, 85, 247, 0.15)",
      color: "#a855f7",
    };
  };

  const getTableFriendlyName = (key: string) => {
    const mapVi: Record<string, string> = {
      users: "Người dùng",
      workspaces: "Workspace",
      projects: "Dự án",
      issues: "Bài viết / Issue",
      pullRequests: "Yêu cầu review (PR)",
      labels: "Nhãn dán",
      comments: "Bình luận",
      reactions: "Tương tác",
      outboxEvents: "Sự kiện Outbox",
      emailJobs: "Hàng đợi Email",
    };
    if (language === "vi" && mapVi[key]) {
      return mapVi[key];
    }
    return key;
  };

  const handleRefreshActiveTab = () => {
    fetchStats();
    if (activeTab === 1) fetchWorkspaces();
    if (activeTab === 2) fetchProjects();
    if (activeTab === 3) fetchUsers();
    if (activeTab === 4) fetchPosts();
    if (activeTab === 5) fetchComments();
    if (activeTab === 6) fetchReactions();
    if (activeTab === 7) fetchLabels();
    if (activeTab === 8) fetchRepos();
    if (activeTab === 9) fetchQueues();
    if (activeTab === 10) fetchAuditLogs();
    if (activeTab === 11) fetchDiagnostics();
  };

  const navGroups = [
    {
      title: language === "vi" ? "TỔNG QUAN" : "ANALYTICS",
      items: [
        {
          index: 0,
          label: language === "vi" ? "Tổng Quan" : "Overview",
          icon: BarChart3,
          badge: null,
        },
      ],
    },
    {
      title: language === "vi" ? "QUẢN LÝ DỮ LIỆU" : "DATA MANAGEMENT",
      items: [
        {
          index: 1,
          label: language === "vi" ? "Không Gian Làm Việc" : "Workspaces",
          icon: Briefcase,
          badge: stats?.overview.totalWorkspaces ?? null,
        },
        {
          index: 2,
          label: language === "vi" ? "Dự Án" : "Projects",
          icon: FolderGit2,
          badge: stats?.overview.totalProjects ?? null,
        },
        {
          index: 3,
          label: language === "vi" ? "Người Dùng" : "Users",
          icon: Users,
          badge: stats?.overview.totalUsers ?? null,
        },
        {
          index: 4,
          label: language === "vi" ? "Bài Viết" : "Posts",
          icon: FileText,
          badge: stats?.overview.totalPosts ?? null,
        },
        {
          index: 5,
          label: language === "vi" ? "Bình Luận" : "Comments",
          icon: MessageSquare,
          badge: stats?.overview.totalComments ?? null,
        },
        {
          index: 6,
          label: language === "vi" ? "Tương Tác" : "Reactions",
          icon: ThumbsUp,
          badge: stats?.overview.totalReactions ?? null,
        },
        {
          index: 7,
          label: language === "vi" ? "Nhãn Dán" : "Labels",
          icon: Tag,
          badge: stats?.overview.totalLabels ?? null,
        },
        {
          index: 8,
          label: language === "vi" ? "Kho Lưu Trữ" : "Repositories",
          icon: GitBranch,
          badge: stats?.overview.totalRepositories ?? null,
        },
      ],
    },
    {
      title: language === "vi" ? "HỆ THỐNG" : "SYSTEM",
      items: [
        {
          index: 9,
          label: language === "vi" ? "Hàng Đợi & Tác Vụ" : "Queues & Jobs",
          icon: Radio,
          badge: ((stats?.overview.pendingEmailJobs ?? 0) + (stats?.overview.pendingOutboxEvents ?? 0)) || null,
        },
        {
          index: 10,
          label: language === "vi" ? "Nhật Ký Thao Tác" : "Audit Logs",
          icon: Activity,
          badge: null,
        },
        {
          index: 11,
          label: language === "vi" ? "Chẩn Đoán Hệ Thống" : "System Diagnostics",
          icon: Server,
          badge: null,
        },
      ],
    },
  ];

  const currentTabTitle =
    navGroups
      .flatMap((g) => g.items)
      .find((item) => item.index === activeTab)?.label ?? (language === "vi" ? "Tổng Quan" : "Overview");

  const renderSidebarContent = (isDrawer: boolean = false) => {
    const isCollapsed = isDrawer ? false : sidebarCollapsed;

    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          backgroundColor: tokens.surface,
          color: tokens.textPrimary,
        }}
      >
        <Box
          sx={{
            p: isCollapsed ? 1.5 : 2.2,
            borderBottom: `1px solid ${tokens.border}`,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            alignItems: isCollapsed ? "center" : "stretch",
          }}
        >
          {isCollapsed ? (
            <Tooltip title="Reported Admin" placement="right">
              <Box
                onClick={() => handleSelectTab(0)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  p: 0.5,
                }}
              >
                <BrandLogo size="small" showText={false} />
              </Box>
            </Tooltip>
          ) : (
            <Box
              onClick={() => handleSelectTab(0)}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
            >
              <BrandLogo size="small" showText={true} />
              <Typography
                variant="caption"
                sx={{
                  px: 0.9,
                  py: 0.25,
                  borderRadius: "4px",
                  backgroundColor: tokens.hover,
                  border: `1px solid ${tokens.border}`,
                  color: tokens.textSecondary,
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                }}
              >
                ADMIN
              </Typography>
            </Box>
          )}

          {isCollapsed ? (
            <Tooltip title={language === "vi" ? "Về Trang Người Dùng" : "Back to User App"} placement="right">
              <IconButton
                size="small"
                onClick={() => setLocation("/")}
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "6px",
                  border: `1px solid ${tokens.border}`,
                  color: tokens.textSecondary,
                  "&:hover": {
                    backgroundColor: tokens.surfaceHover,
                    color: tokens.primary,
                    borderColor: tokens.primary,
                  },
                }}
              >
                <ArrowLeft size={16} />
              </IconButton>
            </Tooltip>
          ) : (
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ArrowLeft size={15} />}
              onClick={() => setLocation("/")}
              sx={{
                borderColor: tokens.border,
                color: tokens.textSecondary,
                backgroundColor: "transparent",
                "&:hover": {
                  backgroundColor: tokens.surfaceHover,
                  color: tokens.textPrimary,
                  borderColor: tokens.primary,
                },
                textTransform: "none",
                fontSize: "0.875rem",
                fontWeight: 600,
                borderRadius: "6px",
                py: 0.85,
              }}
            >
              {language === "vi" ? "Về Trang Người Dùng" : "Back to User App"}
            </Button>
          )}
        </Box>

        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            p: isCollapsed ? 1 : 1.5,
            display: "flex",
            flexDirection: "column",
            gap: isCollapsed ? 1 : 2,
          }}
        >
          {navGroups.map((group, gIdx) => (
            <Box key={gIdx}>
              {!isCollapsed && (
                <Typography
                  variant="caption"
                  sx={{
                    px: 1.2,
                    pb: 0.6,
                    display: "block",
                    fontWeight: 700,
                    fontSize: "0.6875rem",
                    letterSpacing: "0.06em",
                    color: tokens.textSecondary,
                    textTransform: "uppercase",
                  }}
                >
                  {group.title}
                </Typography>
              )}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.4 }}>
                {group.items.map((item) => {
                  const isActive = activeTab === item.index;
                  const IconComponent = item.icon;

                  if (isCollapsed) {
                    return (
                      <Tooltip key={item.index} title={item.label} placement="right">
                        <IconButton
                          onClick={() => {
                            handleSelectTab(item.index);
                            if (isDrawer) setMobileSidebarOpen(false);
                          }}
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: "6px",
                            backgroundColor: isActive ? tokens.surfaceSecondary : "transparent",
                            color: isActive ? tokens.primary : tokens.textSecondary,
                            border: isActive ? `1px solid ${tokens.border}` : "1px solid transparent",
                            boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
                            transition: "all 0.15s ease",
                            "&:hover": {
                              backgroundColor: isActive ? tokens.surfaceSecondary : tokens.hover,
                              color: tokens.textPrimary,
                            },
                          }}
                        >
                          <IconComponent size={18} />
                        </IconButton>
                      </Tooltip>
                    );
                  }

                  return (
                    <Button
                      key={item.index}
                      onClick={() => {
                        handleSelectTab(item.index);
                        if (isDrawer) setMobileSidebarOpen(false);
                      }}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        px: 1.4,
                        py: 0.9,
                        borderRadius: "6px",
                        textTransform: "none",
                        textAlign: "left",
                        backgroundColor: isActive ? tokens.surfaceSecondary : "transparent",
                        color: isActive ? tokens.textPrimary : tokens.textSecondary,
                        border: isActive ? `1px solid ${tokens.border}` : "1px solid transparent",
                        boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          backgroundColor: isActive ? tokens.surfaceSecondary : tokens.hover,
                          color: tokens.textPrimary,
                        },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                        <IconComponent size={17} color={isActive ? tokens.primary : tokens.textSecondary} />
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: "0.84375rem",
                            fontWeight: isActive ? 600 : 450,
                            lineHeight: 1.2,
                            color: isActive ? tokens.textPrimary : tokens.textSecondary,
                          }}
                        >
                          {item.label}
                        </Typography>
                      </Box>
                      {item.badge !== null && item.badge !== undefined && (
                        <Box
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: 20,
                            height: 20,
                            px: 0.7,
                            borderRadius: "10px",
                            fontSize: "0.6875rem",
                            fontWeight: 600,
                            backgroundColor: isActive ? tokens.surface : tokens.surfaceSecondary,
                            color: isActive ? tokens.textPrimary : tokens.textSecondary,
                            border: `1px solid ${tokens.border}`,
                          }}
                        >
                          {item.badge}
                        </Box>
                      )}
                    </Button>
                  );
                })}
              </Box>
            </Box>
          ))}
        </Box>

        <Box
          onClick={(e) => {
            e.stopPropagation();
            setUserMenuAnchor(e.currentTarget);
          }}
          sx={{
            p: 1.5,
            borderTop: `1px solid ${tokens.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "space-between",
            backgroundColor: tokens.surface,
            cursor: "pointer",
            transition: "background-color 0.15s ease",
            "&:hover": { backgroundColor: tokens.hover },
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, minWidth: 0, overflow: "hidden" }}>
            <UserAvatar user={user} size={32} showTooltip={false} />
            {!isCollapsed && (
              <Box sx={{ minWidth: 0, overflow: "hidden" }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 700, fontSize: "0.875rem", lineHeight: 1.2 }}>
                  {user?.displayName || user?.username}
                </Typography>
                <Typography variant="caption" noWrap sx={{ color: tokens.textSecondary, fontSize: "0.75rem", display: "block" }}>
                  @{user?.username}
                </Typography>
              </Box>
            )}
          </Box>
          {!isCollapsed && <ChevronDown size={16} color={tokens.textSecondary} />}
        </Box>

        {!isDrawer && (
          <Box
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            sx={{
              height: 44,
              minHeight: 44,
              borderTop: `1px solid ${tokens.border}`,
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
              title={sidebarCollapsed ? (language === "vi" ? "Mở rộng thanh bên" : "Expand Sidebar") : ""}
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
                    <span>{language === "vi" ? "Thu gọn thanh bên" : "Collapse Sidebar"}</span>
                  </>
                )}
              </Box>
            </Tooltip>
          </Box>
        )}
      </Box>
    );
  };

  if (authLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: tokens.background }}>
        <CircularProgress size={36} />
      </Box>
    );
  }

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
      <Box
        component="aside"
        sx={{
          display: { xs: "none", md: "block" },
          width: sidebarCollapsed ? 68 : 270,
          height: "100vh",
          flexShrink: 0,
          borderRight: `1px solid ${tokens.border}`,
          zIndex: 10,
          transition: "width 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {renderSidebarContent(false)}
      </Box>

      <Drawer
        anchor="left"
        open={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: 270,
            boxSizing: "border-box",
            backgroundColor: tokens.surface,
          },
        }}
      >
        {renderSidebarContent(true)}
      </Drawer>

      <MuiMenu
        anchorEl={userMenuAnchor}
        open={Boolean(userMenuAnchor)}
        onClose={() => setUserMenuAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: sidebarCollapsed ? "right" : "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        PaperProps={{
          sx: {
            minWidth: 230,
            backgroundColor: tokens.surface,
            border: `1px solid ${tokens.border}`,
            borderRadius: "8px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            p: 0.5,
          },
        }}
      >
        <Box sx={{ px: 2, py: 1.2 }}>
          <Typography variant="body2" sx={{ fontWeight: 700, color: tokens.textPrimary }}>
            {user?.displayName || user?.username}
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.textSecondary, display: "block" }}>
            {user?.email}
          </Typography>
        </Box>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={() => {
            setUserMenuAnchor(null);
            setLocation("/");
          }}
          sx={{ py: 1, px: 2, gap: 1.5, fontSize: "0.875rem" }}
        >
          <ArrowLeft size={16} style={{ color: tokens.primary }} />
          {language === "vi" ? "Về trang người dùng" : "Back to User App"}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setUserMenuAnchor(null);
            setLocation("/profile");
          }}
          sx={{ py: 1, px: 2, gap: 1.5, fontSize: "0.875rem" }}
        >
          <User size={16} style={{ color: tokens.primary }} />
          {language === "vi" ? "Hồ sơ cá nhân" : "Personal Profile"}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setUserMenuAnchor(null);
            setLocation("/settings");
          }}
          sx={{ py: 1, px: 2, gap: 1.5, fontSize: "0.875rem" }}
        >
          <Settings size={16} style={{ color: tokens.primary }} />
          {language === "vi" ? "Cài đặt tài khoản" : "Account Settings"}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setUserMenuAnchor(null);
            setLocation("/settings/connected-accounts");
          }}
          sx={{ py: 1, px: 2, gap: 1.5, fontSize: "0.875rem" }}
        >
          <GitBranch size={16} style={{ color: tokens.primary }} />
          {language === "vi" ? "Tài khoản liên kết" : "Connected Accounts"}
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
        <MenuItem
          onClick={() => {
            setUserMenuAnchor(null);
            logout();
            setLocation("/login");
          }}
          sx={{ py: 1, px: 2, gap: 1.5, fontSize: "0.875rem", color: tokens.error }}
        >
          <LogOut size={16} style={{ color: tokens.error }} />
          {language === "vi" ? "Đăng xuất" : "Logout"}
        </MenuItem>
      </MuiMenu>

      <Box
        component="main"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            height: 64,
            px: { xs: 2, sm: 3.5 },
            borderBottom: `1px solid ${tokens.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: tokens.surface,
            flexShrink: 0,
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
            <IconButton
              size="small"
              onClick={() => setMobileSidebarOpen(true)}
              sx={{ display: { xs: "flex", md: "none" }, color: tokens.textSecondary }}
            >
              <Menu size={20} />
            </IconButton>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ color: tokens.textSecondary, fontSize: "0.875rem", display: { xs: "none", sm: "inline" } }}>
                Admin Console /
              </Typography>
              <Typography variant="subtitle1" noWrap sx={{ fontWeight: 800, fontSize: "1.05rem", color: tokens.textPrimary }}>
                {currentTabTitle}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<RefreshCw size={14} />}
              onClick={handleRefreshActiveTab}
              sx={{
                borderColor: tokens.border,
                color: tokens.textPrimary,
                textTransform: "none",
                fontSize: "0.8125rem",
                borderRadius: "6px",
                height: 36,
                px: 1.5,
              }}
            >
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                {language === "vi" ? "Làm mới" : "Refresh"}
              </Box>
            </Button>
            <Button
              size="small"
              variant="contained"
              startIcon={<Download size={14} />}
              onClick={handleExportSystemJson}
              sx={{
                backgroundColor: tokens.primary,
                textTransform: "none",
                fontSize: "0.8125rem",
                borderRadius: "6px",
                height: 36,
                px: 1.5,
              }}
            >
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                {language === "vi" ? "Xuất JSON" : "Export JSON"}
              </Box>
            </Button>
            <Tooltip title={resolvedMode === "dark" ? (language === "vi" ? "Giao diện sáng" : "Light Mode") : (language === "vi" ? "Giao diện tối" : "Dark Mode")}>
              <IconButton
                size="small"
                onClick={() => setMode(resolvedMode === "dark" ? "light" : "dark")}
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "6px",
                  border: `1px solid ${tokens.border}`,
                  color: tokens.textSecondary,
                }}
              >
                {resolvedMode === "dark" ? <Sun size={17} /> : <Moon size={17} />}
              </IconButton>
            </Tooltip>
            <Tooltip title={language === "vi" ? "Chuyển sang tiếng Anh" : "Switch to Vietnamese"}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Globe size={14} />}
                onClick={() => setLanguage(language === "vi" ? "en" : "vi")}
                sx={{
                  borderColor: tokens.border,
                  color: tokens.textSecondary,
                  textTransform: "none",
                  fontSize: "0.8125rem",
                  borderRadius: "6px",
                  height: 36,
                  minWidth: "auto",
                  px: 1.2,
                }}
              >
                {language.toUpperCase()}
              </Button>
            </Tooltip>
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", p: { xs: 2.5, sm: 3.5, lg: 4 } }}>

      {visitedTabs.has(0) && (
        <Box sx={{ display: activeTab === 0 ? "block" : "none" }}>
          {!stats ? (
            <OverviewSkeleton />
          ) : (
            <Box>
              {loadingStats && (
                <LinearProgress sx={{ height: 2, mb: 1.5, borderRadius: 1 }} />
              )}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "repeat(2, 1fr)",
                    md: "repeat(3, 1fr)",
                    xl: "repeat(5, 1fr)",
                  },
                  gap: 2.5,
                  mb: 3.5,
                }}
              >
                <Paper
                  sx={{
                    p: 2.4,
                    backgroundColor: tokens.surface,
                    border: `1px solid ${tokens.border}`,
                    borderRadius: "8px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "border-color 0.15s ease",
                    "&:hover": {
                      borderColor: tokens.textSecondary,
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, color: tokens.textSecondary }}>
                      {language === "vi" ? "Không gian làm việc" : "Workspaces"}
                    </Typography>
                    <Box sx={{ width: 32, height: 32, borderRadius: "6px", backgroundColor: tokens.surfaceSecondary, border: `1px solid ${tokens.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: tokens.textSecondary }}>
                      <Briefcase size={16} />
                    </Box>
                  </Box>
                  <Typography sx={{ fontSize: "1.875rem", fontWeight: 700, mt: 1.2, mb: 0.6, color: tokens.textPrimary, letterSpacing: "-0.025em", lineHeight: 1 }}>
                    {stats.overview.totalWorkspaces}
                  </Typography>
                  <Typography sx={{ fontSize: "0.8125rem", color: tokens.textSecondary }}>
                    {language === "vi" ? "Không gian đang hoạt động" : "Active workspaces"}
                  </Typography>
                </Paper>

                <Paper
                  sx={{
                    p: 2.4,
                    backgroundColor: tokens.surface,
                    border: `1px solid ${tokens.border}`,
                    borderRadius: "8px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "border-color 0.15s ease",
                    "&:hover": {
                      borderColor: tokens.textSecondary,
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, color: tokens.textSecondary }}>
                      {language === "vi" ? "Dự án" : "Projects"}
                    </Typography>
                    <Box sx={{ width: 32, height: 32, borderRadius: "6px", backgroundColor: tokens.surfaceSecondary, border: `1px solid ${tokens.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: tokens.textSecondary }}>
                      <FolderGit2 size={16} />
                    </Box>
                  </Box>
                  <Typography sx={{ fontSize: "1.875rem", fontWeight: 700, mt: 1.2, mb: 0.6, color: tokens.textPrimary, letterSpacing: "-0.025em", lineHeight: 1 }}>
                    {stats.overview.totalProjects}
                  </Typography>
                  <Typography sx={{ fontSize: "0.8125rem", color: tokens.textSecondary }}>
                    {language === "vi" ? "Tổng số dự án trên hệ thống" : "Total projects"}
                  </Typography>
                </Paper>

                <Paper
                  sx={{
                    p: 2.4,
                    backgroundColor: tokens.surface,
                    border: `1px solid ${tokens.border}`,
                    borderRadius: "8px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "border-color 0.15s ease",
                    "&:hover": {
                      borderColor: tokens.textSecondary,
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, color: tokens.textSecondary }}>
                      {language === "vi" ? "Thành viên" : "Members"}
                    </Typography>
                    <Box sx={{ width: 32, height: 32, borderRadius: "6px", backgroundColor: tokens.surfaceSecondary, border: `1px solid ${tokens.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: tokens.textSecondary }}>
                      <Users size={16} />
                    </Box>
                  </Box>
                  <Typography sx={{ fontSize: "1.875rem", fontWeight: 700, mt: 1.2, mb: 0.6, color: tokens.textPrimary, letterSpacing: "-0.025em", lineHeight: 1 }}>
                    {stats.overview.totalUsers}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, flexWrap: "wrap" }}>
                    <Box sx={{ display: "inline-flex", alignItems: "center", px: 0.9, py: 0.25, borderRadius: "4px", backgroundColor: tokens.surfaceSecondary, border: `1px solid ${tokens.border}` }}>
                      <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: tokens.textSecondary }}>
                        {language === "vi" ? `${stats.overview.adminCount} Quản trị` : `${stats.overview.adminCount} Admin`}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "inline-flex", alignItems: "center", px: 0.9, py: 0.25, borderRadius: "4px", backgroundColor: tokens.surfaceSecondary, border: `1px solid ${tokens.border}` }}>
                      <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: tokens.textSecondary }}>
                        {`${stats.overview.twoFactorCount} 2FA`}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>

                <Paper
                  sx={{
                    p: 2.4,
                    backgroundColor: tokens.surface,
                    border: `1px solid ${tokens.border}`,
                    borderRadius: "8px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "border-color 0.15s ease",
                    "&:hover": {
                      borderColor: tokens.textSecondary,
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, color: tokens.textSecondary }}>
                      {language === "vi" ? "Bài viết & Issue" : "Posts & Issues"}
                    </Typography>
                    <Box sx={{ width: 32, height: 32, borderRadius: "6px", backgroundColor: tokens.surfaceSecondary, border: `1px solid ${tokens.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: tokens.textSecondary }}>
                      <FileText size={16} />
                    </Box>
                  </Box>
                  <Typography sx={{ fontSize: "1.875rem", fontWeight: 700, mt: 1.2, mb: 0.6, color: tokens.textPrimary, letterSpacing: "-0.025em", lineHeight: 1 }}>
                    {stats.overview.totalPosts}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, flexWrap: "wrap" }}>
                    <Box sx={{ display: "inline-flex", alignItems: "center", px: 0.9, py: 0.25, borderRadius: "4px", backgroundColor: tokens.surfaceSecondary, border: `1px solid ${tokens.border}` }}>
                      <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: tokens.textSecondary }}>
                        {language === "vi" ? `${stats.overview.openIssues} Đang mở` : `${stats.overview.openIssues} Open`}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: "0.8125rem", color: tokens.textSecondary }}>
                      {language === "vi" ? `${stats.overview.resolvedIssues} Đã xử lý` : `${stats.overview.resolvedIssues} Resolved`}
                    </Typography>
                  </Box>
                </Paper>

                <Paper
                  sx={{
                    p: 2.4,
                    backgroundColor: tokens.surface,
                    border: `1px solid ${tokens.border}`,
                    borderRadius: "8px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "border-color 0.15s ease",
                    "&:hover": {
                      borderColor: tokens.textSecondary,
                    },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, color: tokens.textSecondary }}>
                      {language === "vi" ? "Bình luận & Tương tác" : "Comments & Reactions"}
                    </Typography>
                    <Box sx={{ width: 32, height: 32, borderRadius: "6px", backgroundColor: tokens.surfaceSecondary, border: `1px solid ${tokens.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: tokens.textSecondary }}>
                      <MessageSquare size={16} />
                    </Box>
                  </Box>
                  <Typography sx={{ fontSize: "1.875rem", fontWeight: 700, mt: 1.2, mb: 0.6, color: tokens.textPrimary, letterSpacing: "-0.025em", lineHeight: 1 }}>
                    {stats.overview.totalComments}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, flexWrap: "wrap" }}>
                    <Box sx={{ display: "inline-flex", alignItems: "center", px: 0.9, py: 0.25, borderRadius: "4px", backgroundColor: tokens.surfaceSecondary, border: `1px solid ${tokens.border}` }}>
                      <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: tokens.textSecondary }}>
                        {language === "vi" ? `${stats.overview.totalReactions} Tương tác` : `${stats.overview.totalReactions} Reactions`}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: "0.8125rem", color: tokens.textSecondary }}>
                      {language === "vi" ? `${stats.overview.hiddenComments} Bị ẩn` : `${stats.overview.hiddenComments} Hidden`}
                    </Typography>
                  </Box>
                </Paper>
              </Box>

              {(() => {
                const total14DayEvents = stats.timeline.reduce((acc, p) => acc + p.posts + p.comments + p.reactions, 0);
                const max14DayEvents = Math.max(1, ...stats.timeline.map((p) => p.posts + p.comments + p.reactions));
                const peakDay = stats.timeline.reduce((prev, current) => {
                  const prevSum = prev.posts + prev.comments + prev.reactions;
                  const currSum = current.posts + current.comments + current.reactions;
                  return currSum > prevSum ? current : prev;
                }, stats.timeline[0]);
                const peakDayCount = peakDay ? peakDay.posts + peakDay.comments + peakDay.reactions : 0;
                const peakDayDateParts = peakDay?.date.split("-") || [];
                const peakDayFormatted = peakDayDateParts.length === 3 ? `${peakDayDateParts[2]}/${peakDayDateParts[1]}` : peakDay?.date || "";
                const dailyAvg = (total14DayEvents / (stats.timeline.length || 14)).toFixed(1);

                const totalReactionsCount = stats.distributions.reactions.reduce((acc, curr) => acc + (curr.count || 0), 0) || 1;
                const totalStatusCount = stats.distributions.issueStatus.reduce((acc, curr) => acc + (curr.count || 0), 0) || 1;
                const totalRolesCount = stats.distributions.roles.reduce((acc, curr) => acc + (curr.count || 0), 0) || 1;

                const dayNamesVi = ["CN", "Th 2", "Th 3", "Th 4", "Th 5", "Th 6", "Th 7"];
                const dayNamesEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

                return (
                  <>
                    <Paper
                      sx={{
                        p: { xs: 2.2, sm: 3 },
                        mb: 3.5,
                        backgroundColor: tokens.surface,
                        border: `1px solid ${tokens.border}`,
                        borderRadius: "12px",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: { xs: "flex-start", sm: "center" }, justifyContent: "space-between", flexWrap: "wrap", gap: 2, mb: 3 }}>
                        <Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                            <Box
                              sx={{
                                width: 34,
                                height: 34,
                                borderRadius: "8px",
                                backgroundColor: "rgba(56, 139, 253, 0.12)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <TrendingUp size={20} color={tokens.primary} />
                            </Box>
                            <Typography sx={{ fontWeight: 800, fontSize: "1.1rem", color: tokens.textPrimary }}>
                              {language === "vi" ? "Biểu Đồ Tốc Độ Hoạt Động (14 Ngày Gần Nhất)" : "14-Day Activity Velocity"}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mt: 1, flexWrap: "wrap" }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, px: 1, py: 0.3, borderRadius: "20px", backgroundColor: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
                              <Box sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#10b981", boxShadow: "0 0 6px #10b981" }} />
                              <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#10b981" }}>
                                {language === "vi" ? "Thời gian thực" : "Realtime"}
                              </Typography>
                            </Box>
                            <Chip
                              size="small"
                              label={language === "vi" ? `Tổng: ${total14DayEvents} sự kiện` : `Total: ${total14DayEvents} events`}
                              sx={{ height: 22, fontSize: "0.75rem", fontWeight: 700, backgroundColor: tokens.surfaceSecondary, color: tokens.textPrimary, border: `1px solid ${tokens.border}` }}
                            />
                            <Chip
                              size="small"
                              label={language === "vi" ? `TB: ${dailyAvg}/ngày` : `Avg: ${dailyAvg}/day`}
                              sx={{ height: 22, fontSize: "0.75rem", fontWeight: 600, backgroundColor: tokens.surfaceSecondary, color: tokens.textSecondary, border: `1px solid ${tokens.border}` }}
                            />
                            {peakDayCount > 0 && (
                              <Chip
                                size="small"
                                label={language === "vi" ? `Đỉnh: ${peakDayCount} (${peakDayFormatted})` : `Peak: ${peakDayCount} (${peakDayFormatted})`}
                                sx={{ height: 22, fontSize: "0.75rem", fontWeight: 700, backgroundColor: "rgba(56, 139, 253, 0.12)", color: tokens.primary, border: "1px solid rgba(56, 139, 253, 0.25)" }}
                              />
                            )}
                          </Box>
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", p: 1, borderRadius: "8px", backgroundColor: tokens.surfaceSecondary, border: `1px solid ${tokens.border}` }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: "3px", backgroundColor: "#38bdf8" }} />
                            <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: tokens.textSecondary }}>
                              {language === "vi" ? "Bài viết" : "Posts"}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: "3px", backgroundColor: "#10b981" }} />
                            <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: tokens.textSecondary }}>
                              {language === "vi" ? "Bình luận" : "Comments"}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: "3px", backgroundColor: "#a855f7" }} />
                            <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: tokens.textSecondary }}>
                              {language === "vi" ? "Tương tác" : "Reactions"}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>

                      <Box sx={{ position: "relative", minHeight: 230, pt: 2, pb: 1 }}>
                        <Box sx={{ position: "absolute", top: 24, left: 0, right: 0, borderTop: `1px dashed ${tokens.border}`, opacity: 0.4, pointerEvents: "none" }} />
                        <Box sx={{ position: "absolute", top: "45%", left: 0, right: 0, borderTop: `1px dashed ${tokens.border}`, opacity: 0.25, pointerEvents: "none" }} />
                        <Box sx={{ position: "absolute", bottom: 58, left: 0, right: 0, borderTop: `1px solid ${tokens.border}`, opacity: 0.6, pointerEvents: "none" }} />

                        <Box
                          sx={{
                            display: "grid",
                            gridTemplateColumns: { xs: "repeat(7, 1fr)", sm: "repeat(14, 1fr)" },
                            gap: { xs: 1, sm: 1.4 },
                            alignItems: "flex-end",
                            height: 220,
                            position: "relative",
                            zIndex: 1,
                          }}
                        >
                          {stats.timeline.map((point, idx) => {
                            const totalAct = point.posts + point.comments + point.reactions;
                            const isToday = idx === stats.timeline.length - 1;
                            const heightPercent = totalAct > 0
                              ? Math.max(16, Math.min(100, Math.round((totalAct / max14DayEvents) * 100)))
                              : 0;

                            const postsPercent = totalAct > 0 ? (point.posts / totalAct) * 100 : 0;
                            const commentsPercent = totalAct > 0 ? (point.comments / totalAct) * 100 : 0;
                            const reactionsPercent = totalAct > 0 ? (point.reactions / totalAct) * 100 : 0;

                            const dObj = new Date(point.date + "T12:00:00");
                            const dayOfWeek = (language === "vi" ? dayNamesVi : dayNamesEn)[isNaN(dObj.getDay()) ? 0 : dObj.getDay()];
                            const dateParts = point.date.split("-");
                            const dayMonth = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : point.date.slice(5);

                            return (
                              <Tooltip
                                key={point.date}
                                arrow
                                placement="top"
                                title={
                                  <Box sx={{ p: 0.8, minWidth: 150 }}>
                                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.8, pb: 0.6, borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
                                      <Typography sx={{ fontWeight: 800, fontSize: "0.8125rem", color: "#fff" }}>
                                        {point.date}
                                      </Typography>
                                      {isToday && (
                                        <Typography sx={{ fontSize: "0.6875rem", fontWeight: 700, color: "#38bdf8" }}>
                                          {language === "vi" ? "Hôm nay" : "Today"}
                                        </Typography>
                                      )}
                                    </Box>
                                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, fontSize: "0.75rem" }}>
                                      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                                        <span style={{ color: "#94a3b8" }}>{language === "vi" ? "Tổng sự kiện:" : "Total events:"}</span>
                                        <strong style={{ color: "#fff", fontSize: "0.8125rem" }}>{totalAct}</strong>
                                      </Box>
                                      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                                        <span style={{ color: "#38bdf8" }}>{language === "vi" ? "Bài viết:" : "Posts:"}</span>
                                        <span>{point.posts}</span>
                                      </Box>
                                      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                                        <span style={{ color: "#10b981" }}>{language === "vi" ? "Bình luận:" : "Comments:"}</span>
                                        <span>{point.comments}</span>
                                      </Box>
                                      <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
                                        <span style={{ color: "#a855f7" }}>{language === "vi" ? "Tương tác:" : "Reactions:"}</span>
                                        <span>{point.reactions}</span>
                                      </Box>
                                    </Box>
                                  </Box>
                                }
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    height: "100%",
                                    justifyContent: "flex-end",
                                    cursor: "pointer",
                                    transition: "transform 0.15s ease",
                                    "&:hover": {
                                      transform: "translateY(-2px)",
                                    },
                                    "&:hover .bar-slot": {
                                      backgroundColor: "rgba(56, 139, 253, 0.08)",
                                    },
                                    "&:hover .bar-body": {
                                      filter: "brightness(1.15)",
                                    },
                                  }}
                                >
                                  {totalAct > 0 ? (
                                    <Typography
                                      sx={{
                                        fontSize: "0.75rem",
                                        fontWeight: 800,
                                        color: isToday ? tokens.primary : tokens.textPrimary,
                                        lineHeight: 1,
                                        mb: 0.8,
                                        transition: "all 0.15s ease",
                                      }}
                                    >
                                      {totalAct}
                                    </Typography>
                                  ) : (
                                    <Box sx={{ height: 16, mb: 0.8 }} />
                                  )}

                                  <Box
                                    className="bar-slot"
                                    sx={{
                                      width: "100%",
                                      maxWidth: 34,
                                      height: 125,
                                      borderRadius: "6px 6px 0 0",
                                      display: "flex",
                                      alignItems: "flex-end",
                                      justifyContent: "center",
                                      backgroundColor: "rgba(148, 163, 184, 0.05)",
                                      transition: "background-color 0.15s ease",
                                      position: "relative",
                                    }}
                                  >
                                    {totalAct > 0 ? (
                                      <Box
                                        className="bar-body"
                                        sx={{
                                          width: "100%",
                                          height: `${heightPercent}%`,
                                          borderRadius: "6px 6px 0 0",
                                          display: "flex",
                                          flexDirection: "column-reverse",
                                          overflow: "hidden",
                                          boxShadow: isToday ? "0 4px 14px rgba(56, 139, 253, 0.4)" : "0 2px 8px rgba(0,0,0,0.12)",
                                          border: isToday ? `1px solid ${tokens.primary}` : "1px solid rgba(255,255,255,0.08)",
                                          borderBottom: "none",
                                          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                                        }}
                                      >
                                        {point.reactions > 0 && (
                                          <Box sx={{ height: `${reactionsPercent}%`, backgroundColor: "#a855f7" }} />
                                        )}
                                        {point.comments > 0 && (
                                          <Box sx={{ height: `${commentsPercent}%`, backgroundColor: "#10b981" }} />
                                        )}
                                        {point.posts > 0 && (
                                          <Box sx={{ height: `${postsPercent}%`, backgroundColor: "#38bdf8" }} />
                                        )}
                                      </Box>
                                    ) : (
                                      <Box
                                        sx={{
                                          width: 18,
                                          height: 3,
                                          borderRadius: "2px",
                                          backgroundColor: tokens.border,
                                          opacity: 0.7,
                                        }}
                                      />
                                    )}
                                  </Box>

                                  <Box
                                    sx={{
                                      mt: 1,
                                      textAlign: "center",
                                      px: 0.4,
                                      py: 0.3,
                                      borderRadius: "6px",
                                      border: isToday ? `1px solid rgba(56, 139, 253, 0.35)` : "1px solid transparent",
                                      backgroundColor: isToday ? "rgba(56, 139, 253, 0.12)" : "transparent",
                                      width: "100%",
                                    }}
                                  >
                                    <Typography
                                      sx={{
                                        fontSize: "0.6875rem",
                                        color: isToday ? tokens.primary : tokens.textSecondary,
                                        fontWeight: isToday ? 800 : 600,
                                        lineHeight: 1.1,
                                      }}
                                      noWrap
                                    >
                                      {isToday ? (language === "vi" ? "Hôm nay" : "Today") : dayOfWeek}
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: "0.75rem",
                                        color: isToday ? tokens.primary : tokens.textPrimary,
                                        fontWeight: isToday ? 800 : 600,
                                        lineHeight: 1.2,
                                        mt: 0.2,
                                      }}
                                      noWrap
                                    >
                                      {dayMonth}
                                    </Typography>
                                  </Box>
                                </Box>
                              </Tooltip>
                            );
                          })}
                        </Box>
                      </Box>
                    </Paper>

                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2.5, mb: 3.5 }}>
                      <Paper sx={{ p: 2.8, backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px" }}>
                        <Typography sx={{ fontWeight: 800, fontSize: "0.9375rem", mb: 2, color: tokens.textPrimary }}>
                          {language === "vi" ? "Phân Bổ Tương Tác" : "Reactions Breakdown"}
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.4 }}>
                          {stats.distributions.reactions.map((r) => {
                            const label = getReactionLabel(r.reaction || "");
                            const percent = Math.round(((r.count || 0) / totalReactionsCount) * 100);
                            return (
                              <Box key={r.reaction} sx={{ display: "flex", flexDirection: "column", gap: 0.6, py: 0.3 }}>
                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                                    {getReactionIcon(r.reaction || "")}
                                    <Typography sx={{ fontWeight: 600, fontSize: "0.875rem", color: tokens.textPrimary }}>
                                      {label}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Typography sx={{ fontSize: "0.75rem", color: tokens.textSecondary, fontWeight: 500 }}>
                                      {percent}%
                                    </Typography>
                                    <Chip
                                      size="small"
                                      label={r.count}
                                      sx={{
                                        height: 22,
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        backgroundColor: "rgba(168, 85, 247, 0.12)",
                                        color: "#a855f7",
                                        border: "1px solid rgba(168, 85, 247, 0.3)",
                                      }}
                                    />
                                  </Box>
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={percent}
                                  sx={{
                                    height: 4,
                                    borderRadius: 2,
                                    backgroundColor: tokens.surfaceSecondary,
                                    "& .MuiLinearProgress-bar": {
                                      backgroundColor: "#a855f7",
                                      borderRadius: 2,
                                    },
                                  }}
                                />
                              </Box>
                            );
                          })}
                        </Box>
                      </Paper>

                      <Paper sx={{ p: 2.8, backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px" }}>
                        <Typography sx={{ fontWeight: 800, fontSize: "0.9375rem", mb: 2, color: tokens.textPrimary }}>
                          {language === "vi" ? "Trạng Thái Bài Viết" : "Issue Status Breakdown"}
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.4 }}>
                          {stats.distributions.issueStatus.map((s) => {
                            const cfg = getStatusConfig(s.status || "");
                            const percent = Math.round(((s.count || 0) / totalStatusCount) * 100);
                            return (
                              <Box key={s.status} sx={{ display: "flex", flexDirection: "column", gap: 0.6, py: 0.3 }}>
                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: cfg.color }} />
                                    <Typography sx={{ fontWeight: 600, fontSize: "0.875rem", color: tokens.textPrimary }}>
                                      {cfg.label}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Typography sx={{ fontSize: "0.75rem", color: tokens.textSecondary, fontWeight: 500 }}>
                                      {percent}%
                                    </Typography>
                                    <Chip
                                      size="small"
                                      label={s.count}
                                      sx={{
                                        height: 22,
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        backgroundColor: cfg.bg,
                                        color: cfg.color,
                                        border: `1px solid ${cfg.border}`,
                                      }}
                                    />
                                  </Box>
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={percent}
                                  sx={{
                                    height: 4,
                                    borderRadius: 2,
                                    backgroundColor: tokens.surfaceSecondary,
                                    "& .MuiLinearProgress-bar": {
                                      backgroundColor: cfg.color,
                                      borderRadius: 2,
                                    },
                                  }}
                                />
                              </Box>
                            );
                          })}
                        </Box>
                      </Paper>

                      <Paper sx={{ p: 2.8, backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px" }}>
                        <Typography sx={{ fontWeight: 800, fontSize: "0.9375rem", mb: 2, color: tokens.textPrimary }}>
                          {language === "vi" ? "Phân Bổ Quyền Hạn" : "Role Distribution"}
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.4 }}>
                          {stats.distributions.roles.map((ro) => {
                            const cfg = getRoleConfig(ro.role || "");
                            const percent = Math.round(((ro.count || 0) / totalRolesCount) * 100);
                            return (
                              <Box key={ro.role} sx={{ display: "flex", flexDirection: "column", gap: 0.6, py: 0.3 }}>
                                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                                    <UserCheck size={16} color={cfg.color} />
                                    <Typography sx={{ fontWeight: 600, fontSize: "0.875rem", color: tokens.textPrimary }}>
                                      {cfg.label}
                                    </Typography>
                                  </Box>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Typography sx={{ fontSize: "0.75rem", color: tokens.textSecondary, fontWeight: 500 }}>
                                      {percent}%
                                    </Typography>
                                    <Chip
                                      size="small"
                                      label={ro.count}
                                      sx={{
                                        height: 22,
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        backgroundColor: cfg.bg,
                                        color: cfg.color,
                                        border: `1px solid ${cfg.border}`,
                                      }}
                                    />
                                  </Box>
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={percent}
                                  sx={{
                                    height: 4,
                                    borderRadius: 2,
                                    backgroundColor: tokens.surfaceSecondary,
                                    "& .MuiLinearProgress-bar": {
                                      backgroundColor: cfg.color,
                                      borderRadius: 2,
                                    },
                                  }}
                                />
                              </Box>
                            );
                          })}
                        </Box>
                      </Paper>
                    </Box>
                  </>
                );
              })()}

              <Paper sx={{ p: 3, backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px" }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color: tokens.textPrimary }}>
                    {language === "vi" ? "Thành Viên Tích Cực Nhất" : "Top Contributors"}
                  </Typography>
                  <Button
                    size="small"
                    endIcon={<ChevronRight size={16} />}
                    onClick={() => handleSelectTab(3)}
                    sx={{ color: tokens.primary, textTransform: "none", fontSize: "0.875rem", fontWeight: 600 }}
                  >
                    {language === "vi" ? "Xem toàn bộ thành viên" : "View all users"}
                  </Button>
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, minmax(0, 1fr))",
                      md: "repeat(3, minmax(0, 1fr))",
                      xl: "repeat(5, minmax(0, 1fr))",
                    },
                    gap: 2,
                  }}
                >
                  {stats.topContributors.map((c) => (
                    <Box
                      key={c.id}
                      onClick={() => handleInspectUser(c.id)}
                      sx={{
                        p: 2,
                        minWidth: 0,
                        overflow: "hidden",
                        boxSizing: "border-box",
                        borderRadius: "8px",
                        border: `1px solid ${tokens.border}`,
                        backgroundColor: tokens.surfaceSecondary,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: 1.2,
                        transition: "all 0.15s ease",
                        "&:hover": { borderColor: tokens.primary, backgroundColor: tokens.hover },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, minWidth: 0, overflow: "hidden" }}>
                        <UserAvatar user={c as any} size={34} showTooltip={false} />
                        <Box sx={{ minWidth: 0, flex: 1, overflow: "hidden" }}>
                          <Tooltip title={c.displayName} placement="top">
                            <Typography noWrap sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary, overflow: "hidden", textOverflow: "ellipsis" }}>
                              {c.displayName}
                            </Typography>
                          </Tooltip>
                          <Tooltip title={`@${c.username}`} placement="top">
                            <Typography noWrap sx={{ color: tokens.textSecondary, fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis" }}>
                              @{c.username}
                            </Typography>
                          </Tooltip>
                        </Box>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        <Chip
                          size="small"
                          label={language === "vi" ? `${c.commentsCount} bình luận` : `${c.commentsCount} comments`}
                          sx={{ height: 22, fontSize: "0.75rem", fontWeight: 700, backgroundColor: "rgba(63, 185, 80, 0.15)", color: tokens.success, maxWidth: "100%" }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Box>
          )}
        </Box>
      )}

      {visitedTabs.has(1) && (
        <Box sx={{ display: activeTab === 1 ? "block" : "none" }}>
          {loadingWorkspaces && workspacesList.length === 0 ? (
            <WorkspacesSkeleton />
          ) : (
            <Box>
              {loadingWorkspaces && (
                <LinearProgress sx={{ height: 2, mb: 1.5, borderRadius: 1 }} />
              )}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1, maxWidth: 500 }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder={language === "vi" ? "Tìm theo tên, slug workspace..." : "Search workspace..."}
                    value={workspacesSearch}
                    onChange={(e) => {
                      setWorkspacesSearch(e.target.value);
                      setWorkspacesPage(1);
                    }}
                    InputProps={{
                      startAdornment: <Search size={16} style={{ marginRight: 8, color: tokens.textSecondary }} />,
                    }}
                  />
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<Plus size={15} />}
                  onClick={() => {
                    setWsName("");
                    setWsSlug("");
                    setWsDesc("");
                    setWsOwnerId(user?.id || "");
                    setCreateWsOpen(true);
                  }}
                  sx={{ backgroundColor: tokens.primary, textTransform: "none", borderRadius: "6px" }}
                >
                  {language === "vi" ? "Tạo Workspace" : "New Workspace"}
                </Button>
              </Box>

              <TableContainer component={Paper} sx={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px", boxShadow: "none" }}>
                <Table sx={{ minWidth: 800, "& .MuiTableCell-root": { py: 1.6, px: 2, fontSize: "0.875rem" } }}>
                  <TableHead sx={{ backgroundColor: tokens.surfaceSecondary }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Workspace</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Chủ sở hữu</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Thành viên</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Dự án</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Issues</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Ngày tạo</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Hành động</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {workspacesList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6, color: tokens.textSecondary, fontSize: "0.9375rem" }}>
                      Không có workspace nào
                    </TableCell>
                  </TableRow>
                ) : (
                  workspacesList.map((ws) => (
                    <TableRow key={ws.id} hover sx={{ "&:hover": { backgroundColor: tokens.hover } }}>
                      <TableCell sx={{ maxWidth: 280 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.4, minWidth: 0 }}>
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: "8px",
                              backgroundColor: "rgba(56, 139, 253, 0.12)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Briefcase size={18} color={tokens.primary} />
                          </Box>
                          <Box sx={{ minWidth: 0, overflow: "hidden" }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <Tooltip title={ws.name} placement="top">
                                <Typography noWrap sx={{ fontWeight: 700, fontSize: "0.9375rem", color: tokens.textPrimary, overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {ws.name}
                                </Typography>
                              </Tooltip>
                              {activeWorkspace?.id === ws.id && (
                                <Chip label="Đang chọn" size="small" sx={{ height: 20, fontSize: "0.6875rem", fontWeight: 700, backgroundColor: tokens.primary, color: "#fff", flexShrink: 0 }} />
                              )}
                            </Box>
                            <Tooltip title={`@${ws.slug}`} placement="bottom">
                              <Typography noWrap sx={{ color: tokens.textSecondary, fontSize: "0.8125rem", overflow: "hidden", textOverflow: "ellipsis" }}>
                                @{ws.slug}
                              </Typography>
                            </Tooltip>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 180 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, minWidth: 0 }}>
                          <UserAvatar
                            user={{
                              id: ws.ownerId,
                              username: ws.ownerUsername,
                              displayName: ws.ownerDisplayName,
                              avatarUrl: ws.ownerAvatarUrl,
                              role: "USER" as any,
                            }}
                            size={28}
                            showTooltip={false}
                          />
                          <Tooltip title={ws.ownerDisplayName} placement="top">
                            <Typography noWrap sx={{ fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {ws.ownerDisplayName}
                            </Typography>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip size="small" label={ws.membersCount} sx={{ height: 24, fontSize: "0.75rem", fontWeight: 700 }} />
                      </TableCell>
                      <TableCell align="center">
                        <Chip size="small" label={ws.projectsCount} sx={{ height: 24, fontSize: "0.75rem", fontWeight: 700 }} />
                      </TableCell>
                      <TableCell align="center">
                        <Chip size="small" label={ws.issuesCount} sx={{ height: 24, fontSize: "0.75rem", fontWeight: 700 }} />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: tokens.textSecondary, fontSize: "0.8125rem" }}>
                          {new Date(ws.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
                          <Tooltip
                            title={
                              language === "vi"
                                ? `Mở workspace "${ws.name}"`
                                : `Open workspace "${ws.name}"`
                            }
                          >
                            <IconButton
                              size="small"
                              onClick={() => handleEnterWorkspace(ws)}
                              aria-label={`Open workspace ${ws.name}`}
                              sx={{
                                border: "1px solid rgba(16, 185, 129, 0.4)",
                                borderRadius: "6px",
                                color: "#10b981",
                                p: 0.75,
                                "&:hover": {
                                  borderColor: "#10b981",
                                  backgroundColor: "rgba(16, 185, 129, 0.08)",
                                },
                              }}
                            >
                              <ArrowUpRight size={16} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Quản lý thành viên">
                            <IconButton size="small" onClick={() => handleOpenMembersModal(ws)} sx={{ color: tokens.textSecondary, p: 0.8 }}>
                              <Users size={17} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Chỉnh sửa">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditWsItem(ws);
                                setEditWsName(ws.name);
                                setEditWsSlug(ws.slug);
                                setEditWsDesc(ws.description || "");
                              }}
                              sx={{ color: tokens.textSecondary, p: 0.8 }}
                            >
                              <Edit3 size={17} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Xóa workspace">
                            <IconButton size="small" onClick={() => setDeleteWsItem(ws)} sx={{ color: tokens.error, p: 0.8 }}>
                              <Trash2 size={17} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {workspacesTotalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Pagination count={workspacesTotalPages} page={workspacesPage} onChange={(_, p) => setWorkspacesPage(p)} />
            </Box>
          )}
            </Box>
          )}
        </Box>
      )}

      {visitedTabs.has(2) && (
        <Box sx={{ display: activeTab === 2 ? "block" : "none" }}>
          {loadingProjects && projectsList.length === 0 ? (
            <ProjectsSkeleton />
          ) : (
            <Box>
              {loadingProjects && (
                <LinearProgress sx={{ height: 2, mb: 1.5, borderRadius: 1 }} />
              )}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, mb: 2.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1, maxWidth: 500 }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder={language === "vi" ? "Tìm theo tên, mã key dự án..." : "Search projects..."}
                    value={projectsSearch}
                    onChange={(e) => {
                      setProjectsSearch(e.target.value);
                      setProjectsPage(1);
                    }}
                    InputProps={{
                      startAdornment: <Search size={18} style={{ marginRight: 8, color: tokens.textSecondary }} />,
                    }}
                    sx={{ "& .MuiOutlinedInput-root": { height: 38 } }}
                  />
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<Plus size={16} />}
                  onClick={() => {
                    setProjWsId(activeWorkspace?.id || "");
                    setProjKey("");
                    setProjName("");
                    setProjSlug("");
                    setProjDesc("");
                    setCreateProjOpen(true);
                  }}
                  sx={{ backgroundColor: tokens.primary, textTransform: "none", borderRadius: "6px", height: 38, px: 2, fontSize: "0.8125rem", fontWeight: 600 }}
                >
                  {language === "vi" ? "Tạo Dự Án" : "New Project"}
                </Button>
              </Box>

              <TableContainer component={Paper} sx={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px", boxShadow: "none" }}>
                <Table sx={{ minWidth: 800, "& .MuiTableCell-root": { py: 1.6, px: 2, fontSize: "0.875rem" } }}>
                  <TableHead sx={{ backgroundColor: tokens.surfaceSecondary }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Key</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Tên Dự Án</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Workspace</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Issues</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Ngày tạo</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Hành động</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {projectsList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: tokens.textSecondary, fontSize: "0.9375rem" }}>
                      Không có dự án nào
                    </TableCell>
                  </TableRow>
                ) : (
                  projectsList.map((p) => (
                    <TableRow key={p.id} hover sx={{ "&:hover": { backgroundColor: tokens.hover } }}>
                      <TableCell>
                        <Chip label={p.key} size="small" sx={{ height: 24, fontWeight: 700, fontSize: "0.75rem", backgroundColor: tokens.hover }} />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 280 }}>
                        <Tooltip title={p.name} placement="top">
                          <Typography noWrap sx={{ fontWeight: 700, fontSize: "0.9375rem", color: tokens.textPrimary, overflow: "hidden", textOverflow: "ellipsis" }}>
                            {p.name}
                          </Typography>
                        </Tooltip>
                        {p.description && (
                          <Tooltip title={p.description} placement="bottom">
                            <Typography noWrap sx={{ color: tokens.textSecondary, fontSize: "0.8125rem", maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis" }}>
                              {p.description}
                            </Typography>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Tooltip title={`${p.workspaceName} (@${p.workspaceSlug})`} placement="top">
                          <Typography noWrap sx={{ fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {p.workspaceName}
                          </Typography>
                        </Tooltip>
                        <Typography noWrap sx={{ color: tokens.textSecondary, fontSize: "0.8125rem", display: "block", overflow: "hidden", textOverflow: "ellipsis" }}>
                          @{p.workspaceSlug}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip size="small" label={p.issuesCount} sx={{ height: 24, fontSize: "0.75rem", fontWeight: 700 }} />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: tokens.textSecondary, fontSize: "0.8125rem" }}>
                          {new Date(p.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
                          <Tooltip title="Chỉnh sửa">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditProjItem(p);
                                setEditProjKey(p.key);
                                setEditProjName(p.name);
                                setEditProjSlug(p.slug);
                                setEditProjDesc(p.description || "");
                              }}
                              sx={{ color: tokens.textSecondary, p: 0.8 }}
                            >
                              <Edit3 size={17} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Xóa dự án">
                            <IconButton size="small" onClick={() => setDeleteProjItem(p)} sx={{ color: tokens.error, p: 0.8 }}>
                              <Trash2 size={17} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {projectsTotalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Pagination count={projectsTotalPages} page={projectsPage} onChange={(_, p) => setProjectsPage(p)} />
            </Box>
          )}
            </Box>
          )}
        </Box>
      )}

      {visitedTabs.has(3) && (
        <Box sx={{ display: activeTab === 3 ? "block" : "none" }}>
          {loadingUsers && usersList.length === 0 ? (
            <UsersSkeleton />
          ) : (
            <Box>
              {loadingUsers && (
                <LinearProgress sx={{ height: 2, mb: 1.5, borderRadius: 1 }} />
              )}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, mb: 2.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1, maxWidth: 600 }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder={language === "vi" ? "Tìm theo username, tên, email..." : "Search user..."}
                    value={usersSearch}
                    onChange={(e) => {
                      setUsersSearch(e.target.value);
                      setUsersPage(1);
                    }}
                    InputProps={{
                      startAdornment: <Search size={18} style={{ marginRight: 8, color: tokens.textSecondary }} />,
                    }}
                    sx={{ "& .MuiOutlinedInput-root": { height: 38 } }}
                  />
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Vai trò</InputLabel>
                    <Select
                      value={usersRoleFilter}
                      label="Vai trò"
                      onChange={(e) => {
                        setUsersRoleFilter(e.target.value);
                        setUsersPage(1);
                      }}
                      sx={{ height: 38 }}
                    >
                      <MenuItem value="">{language === "vi" ? "Tất cả vai trò" : "All Roles"}</MenuItem>
                      <MenuItem value="ADMIN">{language === "vi" ? "Quản Trị Viên (Admin)" : "Admin"}</MenuItem>
                      <MenuItem value="MAINTAINER">{language === "vi" ? "Bảo Trì Viên (Maintainer)" : "Maintainer"}</MenuItem>
                      <MenuItem value="REVIEWER">{language === "vi" ? "Duyệt Mã (Reviewer)" : "Reviewer"}</MenuItem>
                      <MenuItem value="USER">{language === "vi" ? "Thành Viên (User)" : "Member"}</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<Plus size={16} />}
                  onClick={() => {
                    setNewUsername("");
                    setNewEmail("");
                    setNewDisplayName("");
                    setNewPassword("");
                    setNewUserRole(UserRole.USER);
                    setCreateUserOpen(true);
                  }}
                  sx={{ backgroundColor: tokens.primary, textTransform: "none", borderRadius: "6px", height: 38, px: 2, fontSize: "0.8125rem", fontWeight: 600 }}
                >
                  {language === "vi" ? "Tạo Người Dùng" : "New User"}
                </Button>
              </Box>

              <TableContainer component={Paper} sx={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px", boxShadow: "none" }}>
                <Table sx={{ minWidth: 800, "& .MuiTableCell-root": { py: 1.6, px: 2, fontSize: "0.875rem" } }}>
                  <TableHead sx={{ backgroundColor: tokens.surfaceSecondary }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Thành viên</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Email</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Vai trò</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Workspaces</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Bài viết</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Bình luận</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Ngày tạo</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Hành động</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {usersList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6, color: tokens.textSecondary, fontSize: "0.9375rem" }}>
                      Không tìm thấy thành viên
                    </TableCell>
                  </TableRow>
                ) : (
                  usersList.map((u) => (
                    <TableRow key={u.id} hover sx={{ "&:hover": { backgroundColor: tokens.hover } }}>
                      <TableCell sx={{ maxWidth: 220 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.4, cursor: "pointer", minWidth: 0 }} onClick={() => handleInspectUser(u.id)}>
                          <UserAvatar user={u as any} size={34} showTooltip={false} />
                          <Box sx={{ minWidth: 0, overflow: "hidden" }}>
                            <Tooltip title={u.displayName} placement="top">
                              <Typography noWrap sx={{ fontWeight: 700, fontSize: "0.9375rem", color: tokens.textPrimary, overflow: "hidden", textOverflow: "ellipsis" }}>
                                {u.displayName}
                              </Typography>
                            </Tooltip>
                            <Tooltip title={`@${u.username}`} placement="bottom">
                              <Typography noWrap sx={{ color: tokens.textSecondary, fontSize: "0.8125rem", overflow: "hidden", textOverflow: "ellipsis" }}>
                                @{u.username}
                              </Typography>
                            </Tooltip>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 220 }}>
                        <Tooltip title={u.email} placement="top">
                          <Typography noWrap sx={{ color: tokens.textPrimary, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {u.email}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={getRoleConfig(u.role).label}
                          sx={{
                            height: 24,
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            backgroundColor: getRoleConfig(u.role).bg,
                            color: getRoleConfig(u.role).color,
                            border: `1px solid ${getRoleConfig(u.role).border}`,
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip size="small" label={u.workspacesCount} sx={{ height: 24, fontSize: "0.75rem", fontWeight: 700 }} />
                      </TableCell>
                      <TableCell align="center">
                        <Chip size="small" label={u.postsCount} sx={{ height: 24, fontSize: "0.75rem", fontWeight: 700 }} />
                      </TableCell>
                      <TableCell align="center">
                        <Chip size="small" label={u.commentsCount} sx={{ height: 24, fontSize: "0.75rem", fontWeight: 700 }} />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: tokens.textSecondary, fontSize: "0.8125rem" }}>
                          {new Date(u.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
                          <Tooltip title="Sửa thông tin">
                            <IconButton size="small" onClick={() => handleOpenEditUser(u)} sx={{ color: tokens.primary, p: 0.8 }}>
                              <Edit3 size={17} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Chi tiết hoạt động">
                            <IconButton size="small" onClick={() => handleInspectUser(u.id)} sx={{ color: tokens.textSecondary, p: 0.8 }}>
                              <Eye size={17} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Đổi quyền hạn">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setRoleModalUser(u);
                                setSelectedNewRole(u.role);
                              }}
                              sx={{ color: tokens.primary, p: 0.8 }}
                            >
                              <Lock size={17} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Đặt lại mật khẩu">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setResetPassUser(u);
                                setResetNewPass("");
                              }}
                              sx={{ color: tokens.warning, p: 0.8 }}
                            >
                              <KeyRound size={17} />
                            </IconButton>
                          </Tooltip>
                          {u.id !== user?.id && (
                            <Tooltip title="Xóa tài khoản">
                              <IconButton size="small" onClick={() => setDeleteUserItem(u)} sx={{ color: tokens.error, p: 0.8 }}>
                                <Trash2 size={17} />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {usersTotalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Pagination count={usersTotalPages} page={usersPage} onChange={(_, p) => setUsersPage(p)} />
            </Box>
          )}
            </Box>
          )}
        </Box>
      )}

      {visitedTabs.has(4) && (
        <Box sx={{ display: activeTab === 4 ? "block" : "none" }}>
          {loadingPosts && postsList.length === 0 ? (
            <PostsSkeleton />
          ) : (
            <Box>
              {loadingPosts && (
                <LinearProgress sx={{ height: 2, mb: 1.5, borderRadius: 1 }} />
              )}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5, flexWrap: "wrap" }}>
                <TextField
                  size="small"
                  placeholder={language === "vi" ? "Tìm theo tiêu đề bài viết..." : "Search post title..."}
                  value={postsSearch}
                  onChange={(e) => {
                    setPostsSearch(e.target.value);
                    setPostsPage(1);
                  }}
                  sx={{ flex: 1, minWidth: 260, "& .MuiOutlinedInput-root": { height: 38 } }}
                  InputProps={{
                    startAdornment: <Search size={18} style={{ marginRight: 8, color: tokens.textSecondary }} />,
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Loại bài</InputLabel>
                  <Select
                    value={postsTypeFilter}
                    label="Loại bài"
                    onChange={(e) => {
                      setPostsTypeFilter(e.target.value);
                      setPostsPage(1);
                    }}
                    sx={{ height: 38 }}
                  >
                    <MenuItem value="">Tất cả loại bài</MenuItem>
                    <MenuItem value="ISSUE">Chỉ Issues</MenuItem>
                    <MenuItem value="REVIEW">Chỉ Review Requests</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Trạng thái</InputLabel>
                  <Select
                    value={postsStatusFilter}
                    label="Trạng thái"
                    onChange={(e) => {
                      setPostsStatusFilter(e.target.value);
                      setPostsPage(1);
                    }}
                    sx={{ height: 38 }}
                  >
                    <MenuItem value="">{language === "vi" ? "Tất cả trạng thái" : "All Statuses"}</MenuItem>
                    <MenuItem value="OPEN">{language === "vi" ? "Đang mở" : "Open"}</MenuItem>
                    <MenuItem value="IN_PROGRESS">{language === "vi" ? "Đang xử lý" : "In Progress"}</MenuItem>
                    <MenuItem value="RESOLVED">{language === "vi" ? "Đã giải quyết" : "Resolved"}</MenuItem>
                    <MenuItem value="CLOSED">{language === "vi" ? "Đã đóng" : "Closed"}</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Workspace</InputLabel>
                  <Select
                    value={postsWsFilter}
                    label="Workspace"
                    onChange={(e) => {
                      setPostsWsFilter(e.target.value);
                      setPostsPage(1);
                    }}
                    sx={{ height: 38 }}
                  >
                    <MenuItem value="">Tất cả workspace</MenuItem>
                    {workspacesList.map((ws) => (
                      <MenuItem key={ws.id} value={ws.id}>
                        {ws.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <TableContainer component={Paper} sx={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px", boxShadow: "none" }}>
                <Table sx={{ minWidth: 800, "& .MuiTableCell-root": { py: 1.6, px: 2, fontSize: "0.875rem" } }}>
                  <TableHead sx={{ backgroundColor: tokens.surfaceSecondary }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Bài viết</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Workspace</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Tác giả</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Trạng thái</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Bình luận</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Ngày tạo</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Hành động</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {postsList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6, color: tokens.textSecondary, fontSize: "0.9375rem" }}>
                      Không có bài viết nào
                    </TableCell>
                  </TableRow>
                ) : (
                  postsList.map((post) => (
                    <TableRow key={`${post.postType}-${post.id}`} hover sx={{ "&:hover": { backgroundColor: tokens.hover } }}>
                      <TableCell sx={{ maxWidth: 320 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, minWidth: 0 }}>
                          {(() => {
                            const postTypeCfg = getPostTypeConfig(post.postType);
                            return (
                              <Chip
                                size="small"
                                label={postTypeCfg.label}
                                sx={{
                                  height: 22,
                                  fontSize: "0.6875rem",
                                  fontWeight: 700,
                                  backgroundColor: postTypeCfg.bg,
                                  color: postTypeCfg.color,
                                  border: `1px solid ${postTypeCfg.color}33`,
                                  flexShrink: 0,
                                }}
                              />
                            );
                          })()}
                          <Tooltip title={`#${post.number} ${post.title}`} placement="top">
                            <Typography noWrap sx={{ fontWeight: 700, fontSize: "0.9375rem", color: tokens.textPrimary, overflow: "hidden", textOverflow: "ellipsis" }}>
                              #{post.number} {post.title}
                            </Typography>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 160 }}>
                        <Tooltip title={post.workspaceName || (language === "vi" ? "Toàn hệ thống" : "Global")} placement="top">
                          <Typography noWrap sx={{ fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {post.workspaceName || (language === "vi" ? "Toàn hệ thống" : "Global")}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 140 }}>
                        <Tooltip title={`@${post.authorUsername}`} placement="top">
                          <Typography noWrap sx={{ fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis" }}>
                            @{post.authorUsername}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={getStatusConfig(post.status).label}
                          sx={{
                            height: 24,
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            backgroundColor: getStatusConfig(post.status).bg,
                            color: getStatusConfig(post.status).color,
                            border: `1px solid ${getStatusConfig(post.status).border}`,
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip size="small" label={post.commentsCount} sx={{ height: 24, fontSize: "0.75rem", fontWeight: 700 }} />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: tokens.textSecondary, fontSize: "0.8125rem" }}>
                          {new Date(post.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
                          <Tooltip title="Xem trực tiếp bài viết">
                            <IconButton
                              size="small"
                              onClick={() => setLocation(post.postType === "ISSUE" ? `/issues/${post.number}` : `/reviews/${post.number}`)}
                              sx={{ color: tokens.textSecondary, p: 0.8 }}
                            >
                              <ExternalLink size={17} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Chỉnh sửa bài viết">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditPostItem(post);
                                setEditPostTitle(post.title);
                                setEditPostDesc(post.description);
                                setEditPostStatus(post.status);
                                setEditPostPriority(post.priority || "P2");
                              }}
                              sx={{ color: tokens.primary, p: 0.8 }}
                            >
                              <Edit3 size={17} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Xóa bài viết">
                            <IconButton size="small" onClick={() => setDeletePostItem(post)} sx={{ color: tokens.error, p: 0.8 }}>
                              <Trash2 size={17} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {postsTotalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Pagination count={postsTotalPages} page={postsPage} onChange={(_, p) => setPostsPage(p)} />
            </Box>
          )}
            </Box>
          )}
        </Box>
      )}

      {visitedTabs.has(5) && (
        <Box sx={{ display: activeTab === 5 ? "block" : "none" }}>
          {loadingComments && commentsList.length === 0 ? (
            <CommentsSkeleton />
          ) : (
            <Box>
              {loadingComments && (
                <LinearProgress sx={{ height: 2, mb: 1.5, borderRadius: 1 }} />
              )}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5, flexWrap: "wrap" }}>
                <TextField
                  size="small"
                  placeholder={language === "vi" ? "Tìm kiếm nội dung bình luận..." : "Search comment content..."}
                  value={commentsSearch}
                  onChange={(e) => {
                    setCommentsSearch(e.target.value);
                    setCommentsPage(1);
                  }}
                  sx={{ flex: 1, minWidth: 260, "& .MuiOutlinedInput-root": { height: 38 } }}
                  InputProps={{
                    startAdornment: <Search size={18} style={{ marginRight: 8, color: tokens.textSecondary }} />,
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 160 }}>
                  <InputLabel>Trạng thái</InputLabel>
                  <Select
                    value={commentsHiddenFilter}
                    label="Trạng thái"
                    onChange={(e) => {
                      setCommentsHiddenFilter(e.target.value);
                      setCommentsPage(1);
                    }}
                    sx={{ height: 38 }}
                  >
                    <MenuItem value="">Tất cả bình luận</MenuItem>
                    <MenuItem value="false">Đang hiển thị</MenuItem>
                    <MenuItem value="true">Bị kiểm duyệt / Ẩn</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <TableContainer component={Paper} sx={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px", boxShadow: "none" }}>
                <Table sx={{ minWidth: 800, "& .MuiTableCell-root": { py: 1.6, px: 2, fontSize: "0.875rem" } }}>
                  <TableHead sx={{ backgroundColor: tokens.surfaceSecondary }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Tác giả</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Bài viết</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Nội dung</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Likes</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Trạng thái</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Hành động</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {commentsList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: tokens.textSecondary, fontSize: "0.9375rem" }}>
                      Không có bình luận nào
                    </TableCell>
                  </TableRow>
                ) : (
                  commentsList.map((comm) => (
                    <TableRow key={comm.id} hover sx={{ opacity: comm.isHidden ? 0.65 : 1, "&:hover": { backgroundColor: tokens.hover } }}>
                      <TableCell sx={{ maxWidth: 160 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, minWidth: 0 }}>
                          <UserAvatar
                            user={{
                              id: comm.authorId,
                              username: comm.authorUsername,
                              displayName: comm.authorDisplayName,
                              avatarUrl: comm.authorAvatarUrl,
                              role: "USER" as any,
                            }}
                            size={28}
                            showTooltip={false}
                          />
                          <Tooltip title={`@${comm.authorUsername}`} placement="top">
                            <Typography noWrap sx={{ fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis" }}>
                              @{comm.authorUsername}
                            </Typography>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 280 }}>
                        <Box
                          onClick={() => {
                            const postNum = comm.targetNumber || (comm as any).postNumber;
                            if (postNum) {
                              setLocation(comm.targetType === "ISSUE" ? `/issues/${postNum}` : `/reviews/${postNum}`);
                            }
                          }}
                          sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" }, minWidth: 0 }}
                        >
                          <Tooltip
                            title={`${(comm.targetNumber || (comm as any).postNumber) ? `#${comm.targetNumber || (comm as any).postNumber} ` : ""}${comm.targetTitle || (comm as any).postTitle || (comm.targetType === "ISSUE" ? "Issue" : "Review")}`}
                            placement="top"
                          >
                            <Typography noWrap sx={{ fontWeight: 700, color: tokens.primary, fontSize: "0.9375rem", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {(comm.targetNumber || (comm as any).postNumber) ? `#${comm.targetNumber || (comm as any).postNumber} ` : ""}
                              {comm.targetTitle || (comm as any).postTitle || (comm.targetType === "ISSUE" ? "Issue" : "Review")}
                            </Typography>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 340 }}>
                        <Tooltip title={comm.content} placement="top">
                          <Typography noWrap sx={{ fontSize: "0.875rem", color: tokens.textPrimary, overflow: "hidden", textOverflow: "ellipsis" }}>
                            {comm.content}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">
                        <Chip size="small" label={comm.reactionsCount} sx={{ height: 24, fontSize: "0.75rem", fontWeight: 700 }} />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={comm.isHidden ? (language === "vi" ? "Bị ẩn" : "Hidden") : (language === "vi" ? "Công khai" : "Visible")}
                          sx={{
                            height: 24,
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            backgroundColor: comm.isHidden ? "rgba(239, 68, 68, 0.15)" : "rgba(63, 185, 80, 0.15)",
                            color: comm.isHidden ? tokens.error : tokens.success,
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
                          <Tooltip title="Lịch sử chỉnh sửa">
                            <IconButton size="small" onClick={() => handleOpenEditHistory(comm)} sx={{ color: tokens.textSecondary, p: 0.8 }}>
                              <History size={17} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Sửa nội dung">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditCommentItem(comm);
                                setEditCommentContent(comm.content);
                              }}
                              sx={{ color: tokens.primary, p: 0.8 }}
                            >
                              <Edit3 size={17} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={comm.isHidden ? "Mở lại" : "Ẩn kiểm duyệt"}>
                            <IconButton size="small" onClick={() => setModerateCommentItem(comm)} sx={{ color: tokens.warning, p: 0.8 }}>
                              {comm.isHidden ? <Eye size={17} /> : <EyeOff size={17} />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Xóa vĩnh viễn">
                            <IconButton size="small" onClick={() => setDeleteCommentItem(comm)} sx={{ color: tokens.error, p: 0.8 }}>
                              <Trash2 size={17} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {commentsTotalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Pagination count={commentsTotalPages} page={commentsPage} onChange={(_, p) => setCommentsPage(p)} />
            </Box>
          )}
            </Box>
          )}
        </Box>
      )}

      {visitedTabs.has(6) && (
        <Box sx={{ display: activeTab === 6 ? "block" : "none" }}>
          {loadingReactions && reactionsList.length === 0 ? (
            <ReactionsSkeleton />
          ) : (
            <Box>
              {loadingReactions && (
                <LinearProgress sx={{ height: 2, mb: 1.5, borderRadius: 1 }} />
              )}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2.5 }}>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>Loại Reaction</InputLabel>
                  <Select
                    value={reactionsTypeFilter}
                    label="Loại Reaction"
                    onChange={(e) => {
                      setReactionsTypeFilter(e.target.value);
                      setReactionsPage(1);
                    }}
                    sx={{ height: 38 }}
                  >
                    <MenuItem value="">{language === "vi" ? "Tất cả tương tác" : "All Reactions"}</MenuItem>
                    <MenuItem value="THUMBS_UP">{getReactionLabel("THUMBS_UP")}</MenuItem>
                    <MenuItem value="HEART">{getReactionLabel("HEART")}</MenuItem>
                    <MenuItem value="FLAME">{getReactionLabel("FLAME")}</MenuItem>
                    <MenuItem value="ROCKET">{getReactionLabel("ROCKET")}</MenuItem>
                    <MenuItem value="EYES">{getReactionLabel("EYES")}</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <TableContainer component={Paper} sx={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px", boxShadow: "none" }}>
                <Table sx={{ minWidth: 800, "& .MuiTableCell-root": { py: 1.6, px: 2, fontSize: "0.875rem" } }}>
                  <TableHead sx={{ backgroundColor: tokens.surfaceSecondary }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Thành viên</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Biểu tượng</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Bình luận mục tiêu</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Bài viết</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Thời gian</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Hành động</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reactionsList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: tokens.textSecondary, fontSize: "0.9375rem" }}>
                      Không có tương tác nào
                    </TableCell>
                  </TableRow>
                ) : (
                  reactionsList.map((r, i) => (
                    <TableRow key={`${r.commentId}-${r.userId}-${r.reaction}-${i}`} hover sx={{ "&:hover": { backgroundColor: tokens.hover } }}>
                      <TableCell sx={{ maxWidth: 160 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, minWidth: 0 }}>
                          <UserAvatar
                            user={{
                              id: r.userId,
                              username: r.username,
                              displayName: r.displayName,
                              avatarUrl: r.avatarUrl,
                              role: "USER" as any,
                            }}
                            size={28}
                            showTooltip={false}
                          />
                          <Tooltip title={`@${r.username}`} placement="top">
                            <Typography noWrap sx={{ fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis" }}>
                              @{r.username}
                            </Typography>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          {getReactionIcon(r.reaction)}
                          <Typography sx={{ fontWeight: 700, fontSize: "0.875rem" }}>
                            {getReactionLabel(r.reaction)}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 280 }}>
                        <Tooltip title={r.commentSnippet} placement="top">
                          <Typography noWrap sx={{ color: tokens.textPrimary, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {r.commentSnippet}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 260 }}>
                        <Tooltip title={`#${r.targetNumber} ${r.targetTitle}`} placement="top">
                          <Typography noWrap sx={{ fontWeight: 600, color: tokens.primary, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis" }}>
                            #{r.targetNumber} {r.targetTitle}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: tokens.textSecondary, fontSize: "0.8125rem" }}>
                          {new Date(r.createdAt).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Gỡ bỏ reaction này">
                          <IconButton size="small" onClick={() => handleDeleteReaction(r)} sx={{ color: tokens.error, p: 0.8 }}>
                            <Trash2 size={17} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {reactionsTotalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Pagination count={reactionsTotalPages} page={reactionsPage} onChange={(_, p) => setReactionsPage(p)} />
            </Box>
          )}
            </Box>
          )}
        </Box>
      )}

      {visitedTabs.has(7) && (
        <Box sx={{ display: activeTab === 7 ? "block" : "none" }}>
          {loadingLabels && (!labelsList || labelsList.length === 0) ? (
            <LabelsSkeleton />
          ) : (
            <Box>
              {loadingLabels && (
                <LinearProgress sx={{ height: 2, mb: 1.5, borderRadius: 1 }} />
              )}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, mb: 2.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1, maxWidth: 500 }}>
                  <TextField
                    size="small"
                    fullWidth
                    placeholder={language === "vi" ? "Tìm theo tên nhãn..." : "Search label..."}
                    value={labelsSearch}
                    onChange={(e) => {
                      setLabelsSearch(e.target.value);
                      setLabelsPage(1);
                    }}
                    InputProps={{
                      startAdornment: <Search size={18} style={{ marginRight: 8, color: tokens.textSecondary }} />,
                    }}
                    sx={{ "& .MuiOutlinedInput-root": { height: 38 } }}
                  />
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<Plus size={16} />}
                  onClick={() => {
                    setLabelWsId(activeWorkspace?.id || "");
                    setLabelName("");
                    setLabelColor("#3b82f6");
                    setLabelDesc("");
                    setCreateLabelOpen(true);
                  }}
                  sx={{ backgroundColor: tokens.primary, textTransform: "none", borderRadius: "6px", height: 38, px: 2, fontSize: "0.8125rem", fontWeight: 600 }}
                >
                  {language === "vi" ? "Tạo Nhãn Mới" : "New Label"}
                </Button>
              </Box>

              <TableContainer component={Paper} sx={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px", boxShadow: "none" }}>
                <Table sx={{ minWidth: 800, "& .MuiTableCell-root": { py: 1.6, px: 2, fontSize: "0.875rem" } }}>
                  <TableHead sx={{ backgroundColor: tokens.surfaceSecondary }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Nhãn</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Mô tả</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Workspace</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Issues sử dụng</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Ngày tạo</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Hành động</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {!labelsList || labelsList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: tokens.textSecondary, fontSize: "0.9375rem" }}>
                      Không có nhãn nào
                    </TableCell>
                  </TableRow>
                ) : (
                  (labelsList || []).map((lb) => (
                    <TableRow key={lb.id} hover sx={{ "&:hover": { backgroundColor: tokens.hover } }}>
                      <TableCell sx={{ maxWidth: 180 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, minWidth: 0 }}>
                          <Box sx={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: lb.color, flexShrink: 0 }} />
                          <Tooltip title={lb.name} placement="top">
                            <Chip
                              label={lb.name}
                              size="small"
                              sx={{
                                height: 26,
                                fontSize: "0.8125rem",
                                fontWeight: 700,
                                backgroundColor: `${lb.color}22`,
                                color: lb.color,
                                border: `1px solid ${lb.color}44`,
                                maxWidth: 150,
                              }}
                            />
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 280 }}>
                        <Tooltip title={lb.description || "-"} placement="top">
                          <Typography noWrap sx={{ color: tokens.textSecondary, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {lb.description || "-"}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 180 }}>
                        <Tooltip title={lb.workspaceName} placement="top">
                          <Typography noWrap sx={{ fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {lb.workspaceName}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center">
                        <Chip size="small" label={lb.issuesCount} sx={{ height: 24, fontSize: "0.75rem", fontWeight: 700 }} />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: tokens.textSecondary, fontSize: "0.8125rem" }}>
                          {new Date(lb.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1 }}>
                          <Tooltip title="Chỉnh sửa">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setEditLabelItem(lb);
                                setEditLabelName(lb.name);
                                setEditLabelColor(lb.color);
                                setEditLabelDesc(lb.description || "");
                              }}
                              sx={{ color: tokens.textSecondary, p: 0.8 }}
                            >
                              <Edit3 size={17} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Xóa nhãn">
                            <IconButton size="small" onClick={() => setDeleteLabelItem(lb)} sx={{ color: tokens.error, p: 0.8 }}>
                              <Trash2 size={17} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {labelsTotalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Pagination count={labelsTotalPages} page={labelsPage} onChange={(_, p) => setLabelsPage(p)} />
            </Box>
          )}
            </Box>
          )}
        </Box>
      )}

      {visitedTabs.has(8) && (
        <Box sx={{ display: activeTab === 8 ? "block" : "none" }}>
          {loadingRepos && reposList.length === 0 ? (
            <RepositoriesSkeleton />
          ) : (
            <Box>
              {loadingRepos && (
                <LinearProgress sx={{ height: 2, mb: 1.5, borderRadius: 1 }} />
              )}
              <TableContainer component={Paper} sx={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px", boxShadow: "none" }}>
                <Table sx={{ minWidth: 800, "& .MuiTableCell-root": { py: 1.6, px: 2, fontSize: "0.875rem" } }}>
                  <TableHead sx={{ backgroundColor: tokens.surfaceSecondary }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Repositories</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Workspace</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Default Branch</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>Pull Requests</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>{language === "vi" ? "Ngày liên kết" : "Linked Date"}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>{language === "vi" ? "Thao tác" : "Actions"}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reposList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: tokens.textSecondary, fontSize: "0.9375rem" }}>
                      {language === "vi" ? "Chưa có repository nào được liên kết" : "No repositories linked yet"}
                    </TableCell>
                  </TableRow>
                ) : (
                  reposList.map((rp) => (
                    <TableRow key={rp.id} hover sx={{ "&:hover": { backgroundColor: tokens.hover } }}>
                      <TableCell sx={{ maxWidth: 280 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, minWidth: 0 }}>
                          <GitBranch size={18} color={tokens.primary} style={{ flexShrink: 0 }} />
                          <Tooltip title={rp.fullName} placement="top">
                            <Typography noWrap sx={{ fontWeight: 700, fontSize: "0.9375rem", color: tokens.textPrimary, overflow: "hidden", textOverflow: "ellipsis" }}>
                              {rp.fullName}
                            </Typography>
                          </Tooltip>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 200 }}>
                        <Tooltip title={`${rp.workspaceName} (@${rp.workspaceSlug})`} placement="top">
                          <Typography noWrap sx={{ fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {rp.workspaceName}
                          </Typography>
                        </Tooltip>
                        <Typography noWrap sx={{ color: tokens.textSecondary, fontSize: "0.8125rem", display: "block", overflow: "hidden", textOverflow: "ellipsis" }}>
                          @{rp.workspaceSlug}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={rp.defaultBranch} sx={{ height: 24, fontSize: "0.75rem", fontWeight: 600 }} />
                      </TableCell>
                      <TableCell align="center">
                        <Chip size="small" label={rp.pullRequestsCount} sx={{ height: 24, fontSize: "0.75rem", fontWeight: 700 }} />
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: tokens.textSecondary, fontSize: "0.8125rem" }}>
                          {new Date(rp.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Ngắt kết nối repository">
                          <IconButton size="small" onClick={() => setDeleteRepoItem(rp)} sx={{ color: tokens.error, p: 0.8 }}>
                            <Trash2 size={17} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
            </Box>
          )}
        </Box>
      )}

      {visitedTabs.has(9) && (
        <Box sx={{ display: activeTab === 9 ? "block" : "none" }}>
          {loadingQueues && !queuesData ? (
            <QueuesSkeleton />
          ) : (
            <Box>
              {loadingQueues && (
                <LinearProgress sx={{ height: 2, mb: 1.5, borderRadius: 1 }} />
              )}
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }}>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color: tokens.textPrimary }}>
                    {language === "vi" ? "Trạng Thái Hàng Đợi Email & Outbox Events" : "Background Jobs & Messaging Outbox"}
                  </Typography>
                  <Typography sx={{ color: tokens.textSecondary, fontSize: "0.8125rem" }}>
                    {language === "vi" ? "Kiểm tra tiến trình gửi mail và sự kiện outbox không đồng bộ" : "Monitor asynchronous message processing"}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<RotateCcw size={15} />}
                  disabled={retryingQueues}
                  onClick={handleRetryQueues}
                  sx={{ backgroundColor: tokens.primary, textTransform: "none", borderRadius: "6px", height: 38, px: 2, fontSize: "0.8125rem", fontWeight: 600 }}
                >
                  {retryingQueues ? "Đang xử lý..." : language === "vi" ? "Thử lại các tác vụ lỗi" : "Retry Failed Jobs"}
                </Button>
              </Box>

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
                <Paper sx={{ p: 2.8, backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px" }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                      <Mail size={18} color={tokens.primary} />
                      <Typography sx={{ fontWeight: 800, fontSize: "0.9375rem", color: tokens.textPrimary }}>
                        {language === "vi" ? "Email Jobs Gần Đây" : "Recent Email Jobs"}
                      </Typography>
                    </Box>
                    {queuesData && (
                      <Chip
                        size="small"
                        label={`${queuesData.emails.length} ${language === "vi" ? "tác vụ" : "jobs"}`}
                        sx={{ height: 22, fontSize: "0.75rem", fontWeight: 700 }}
                      />
                    )}
                  </Box>
                  {!queuesData || queuesData.emails.length === 0 ? (
                    <Typography sx={{ color: tokens.textSecondary, py: 3, display: "block", fontSize: "0.875rem" }}>
                      {language === "vi" ? "Không có tác vụ gửi email nào" : "No recent email jobs"}
                    </Typography>
                  ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
                      {queuesData.emails.map((em) => {
                        const statusCfg = getQueueStatusConfig(em.status);
                        return (
                          <Box key={em.id} sx={{ p: 1.6, borderRadius: "8px", border: `1px solid ${tokens.border}`, backgroundColor: tokens.surfaceSecondary }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.8 }}>
                              <Tooltip title={em.toEmail} placement="top">
                                <Typography
                                  noWrap
                                  sx={{
                                    fontWeight: 700,
                                    fontSize: "0.875rem",
                                    color: tokens.textPrimary,
                                    maxWidth: 240,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {em.toEmail}
                                </Typography>
                              </Tooltip>
                              <Chip
                                size="small"
                                label={statusCfg.label}
                                sx={{
                                  height: 22,
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  backgroundColor: statusCfg.bg,
                                  color: statusCfg.color,
                                }}
                              />
                            </Box>
                            <Tooltip title={em.subject} placement="top">
                              <Typography sx={{ color: tokens.textSecondary, fontSize: "0.8125rem", display: "block", mb: 0.8 }} noWrap>
                                {em.subject}
                              </Typography>
                            </Tooltip>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <Typography sx={{ color: tokens.textSecondary, fontSize: "0.75rem" }}>
                                {new Date(em.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} • {new Date(em.createdAt).toLocaleDateString()}
                              </Typography>
                              {em.attempts > 1 && (
                                <Chip
                                  size="small"
                                  label={`${language === "vi" ? "Đã thử lại" : "Retries"}: ${em.attempts}`}
                                  sx={{ height: 20, fontSize: "0.6875rem", fontWeight: 700, color: tokens.warning }}
                                />
                              )}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Paper>

                <Paper sx={{ p: 2.8, backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px" }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                      <Send size={18} color={tokens.accent} />
                      <Typography sx={{ fontWeight: 800, fontSize: "0.9375rem", color: tokens.textPrimary }}>
                        {language === "vi" ? "Outbox Events Gần Đây" : "Recent Outbox Events"}
                      </Typography>
                    </Box>
                    {queuesData && (
                      <Chip
                        size="small"
                        label={`${queuesData.outbox.length} ${language === "vi" ? "sự kiện" : "events"}`}
                        sx={{ height: 22, fontSize: "0.75rem", fontWeight: 700 }}
                      />
                    )}
                  </Box>
                  {!queuesData || queuesData.outbox.length === 0 ? (
                    <Typography sx={{ color: tokens.textSecondary, py: 3, display: "block", fontSize: "0.875rem" }}>
                      {language === "vi" ? "Không có sự kiện outbox nào" : "No recent outbox events"}
                    </Typography>
                  ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
                      {queuesData.outbox.map((ob) => {
                        const statusCfg = getQueueStatusConfig(ob.status);
                        const friendlyName = formatEventType(ob.eventType);
                        return (
                          <Box key={ob.id} sx={{ p: 1.6, borderRadius: "8px", border: `1px solid ${tokens.border}`, backgroundColor: tokens.surfaceSecondary }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.8 }}>
                              <Tooltip title={ob.eventType} placement="top">
                                <Typography
                                  noWrap
                                  sx={{
                                    fontWeight: 700,
                                    fontSize: "0.875rem",
                                    color: tokens.primary,
                                    maxWidth: 240,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {friendlyName}
                                </Typography>
                              </Tooltip>
                              <Chip
                                size="small"
                                label={statusCfg.label}
                                sx={{
                                  height: 22,
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  backgroundColor: statusCfg.bg,
                                  color: statusCfg.color,
                                }}
                              />
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.5 }}>
                              <Typography sx={{ color: tokens.textSecondary, fontSize: "0.75rem" }}>
                                {new Date(ob.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} • {new Date(ob.createdAt).toLocaleDateString()}
                              </Typography>
                              {ob.retryCount > 0 && (
                                <Chip
                                  size="small"
                                  label={`${language === "vi" ? "Đã thử lại" : "Retries"}: ${ob.retryCount}`}
                                  sx={{ height: 20, fontSize: "0.6875rem", fontWeight: 700, color: tokens.warning }}
                                />
                              )}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Paper>
              </Box>
            </Box>
          )}
        </Box>
      )}

      {visitedTabs.has(10) && (
        <Box sx={{ display: activeTab === 10 ? "block" : "none" }}>
          {loadingAuditLogs && auditLogsList.length === 0 ? (
            <AuditLogsSkeleton />
          ) : (
            <Box>
              {loadingAuditLogs && (
                <LinearProgress sx={{ height: 2, mb: 1.5, borderRadius: 1 }} />
              )}
              <TableContainer component={Paper} sx={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px", boxShadow: "none" }}>
                <Table sx={{ minWidth: 800, "& .MuiTableCell-root": { py: 1.6, px: 2, fontSize: "0.875rem" } }}>
                  <TableHead sx={{ backgroundColor: tokens.surfaceSecondary }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>{language === "vi" ? "Thời gian" : "Timestamp"}</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>{language === "vi" ? "Người thực hiện" : "Actor"}</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>{language === "vi" ? "Hành động" : "Action"}</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>{language === "vi" ? "Tài nguyên" : "Target Resource"}</TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>{language === "vi" ? "Địa chỉ IP" : "IP Address"}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.875rem", color: tokens.textPrimary }}>{language === "vi" ? "Chi tiết" : "Details"}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {auditLogsList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: tokens.textSecondary, fontSize: "0.9375rem" }}>
                      {language === "vi" ? "Không có bản ghi audit log nào" : "No audit log records found"}
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogsList.map((log) => (
                    <TableRow key={log.id} hover sx={{ "&:hover": { backgroundColor: tokens.hover } }}>
                      <TableCell>
                        <Typography sx={{ color: tokens.textSecondary, fontSize: "0.8125rem" }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 180 }}>
                        {log.actorUsername ? (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, minWidth: 0 }}>
                            <UserAvatar
                              user={{
                                id: log.actorId || "",
                                username: log.actorUsername,
                                displayName: log.actorDisplayName || log.actorUsername,
                                avatarUrl: log.actorAvatarUrl,
                                role: "USER" as any,
                              }}
                              size={28}
                              showTooltip={false}
                            />
                            <Tooltip title={`@${log.actorUsername}`} placement="top">
                              <Typography noWrap sx={{ fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", textOverflow: "ellipsis" }}>
                                @{log.actorUsername}
                              </Typography>
                            </Tooltip>
                          </Box>
                        ) : (
                          <Typography sx={{ color: tokens.textSecondary, fontSize: "0.875rem" }}>
                            {language === "vi" ? "Hệ thống tự động" : "Automated System"}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={formatAuditAction(log.action)}
                          sx={{
                            height: 24,
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            backgroundColor: log.action.includes("DELETE") ? "rgba(239, 68, 68, 0.15)" : "rgba(56, 139, 253, 0.15)",
                            color: log.action.includes("DELETE") ? tokens.error : tokens.primary,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ maxWidth: 220 }}>
                        <Tooltip title={log.targetResource} placement="top">
                          <Typography noWrap sx={{ color: tokens.textPrimary, fontSize: "0.8125rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>
                            {formatAuditTarget(log.targetResource)}
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: tokens.textSecondary, fontSize: "0.8125rem" }}>
                          {log.ipAddress || "-"}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          onClick={() => setInspectLogItem(log)}
                          sx={{ textTransform: "none", fontSize: "0.8125rem", py: 0.4, px: 1.2, fontWeight: 600 }}
                        >
                          Xem chi tiết
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {auditLogsTotalPages > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
              <Pagination count={auditLogsTotalPages} page={auditLogsPage} onChange={(_, p) => setAuditLogsPage(p)} />
            </Box>
          )}
            </Box>
          )}
        </Box>
      )}

      {visitedTabs.has(11) && (
        <Box sx={{ display: activeTab === 11 ? "block" : "none" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              mb: 3.5,
              flexWrap: "wrap",
            }}
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: tokens.textPrimary, fontSize: "1.25rem" }}>
                {language === "vi" ? "Trung Tâm Vận Hành & Chẩn Đoán Hệ Thống" : "System Operations & Diagnostics"}
              </Typography>
              <Typography sx={{ color: tokens.textSecondary, fontSize: "0.875rem" }}>
                {language === "vi"
                  ? "Giám sát máy chủ, cơ sở dữ liệu PostgreSQL, gửi thông báo hệ thống & bảo trì định kỳ"
                  : "Monitor hardware, PostgreSQL database, broadcast announcements & perform maintenance"}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.4 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshCw size={15} />}
                onClick={fetchDiagnostics}
                sx={{ borderColor: tokens.border, color: tokens.textPrimary, textTransform: "none", borderRadius: "6px", height: 38, px: 2, fontSize: "0.8125rem", fontWeight: 600 }}
              >
                {language === "vi" ? "Làm mới số liệu" : "Refresh"}
              </Button>
              <Button
                size="small"
                variant="contained"
                startIcon={<Megaphone size={15} />}
                onClick={() => setBroadcastOpen(true)}
                sx={{ backgroundColor: tokens.primary, textTransform: "none", borderRadius: "6px", height: 38, px: 2, fontSize: "0.8125rem", fontWeight: 600 }}
              >
                {language === "vi" ? "Gửi Thông Báo Hệ Thống" : "Broadcast Announcement"}
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="warning"
                startIcon={<Trash2 size={15} />}
                onClick={() => setCleanupDialogOpen(true)}
                sx={{ textTransform: "none", borderRadius: "6px", height: 38, px: 2, fontSize: "0.8125rem", fontWeight: 600 }}
              >
                {language === "vi" ? "Dọn Dẹp Dữ Liệu Hết Hạn" : "Cleanup Expired"}
              </Button>
            </Box>
          </Box>

          {loadingDiagnostics && !diagnosticsData ? (
            <DiagnosticsSkeleton />
          ) : diagnosticsData ? (
            <Box>
              {loadingDiagnostics && (
                <LinearProgress sx={{ height: 2, mb: 1.5, borderRadius: 1 }} />
              )}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" },
                  gap: 2.5,
                  mb: 3.5,
                }}
              >
                <Paper sx={{ p: 2.8, backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px" }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.8125rem", color: tokens.textSecondary, textTransform: "uppercase" }}>
                      {language === "vi" ? "ĐỘ TRỄ DATABASE" : "DATABASE LATENCY"}
                    </Typography>
                    <Server size={22} color="#10b981" />
                  </Box>
                  <Typography sx={{ fontSize: "2.25rem", fontWeight: 800, mt: 1.2, color: tokens.textPrimary, lineHeight: 1.1 }}>
                    {diagnosticsData.dbLatencyMs} ms
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mt: 0.8 }}>
                    <Chip label={language === "vi" ? "HOẠT ĐỘNG TỐT" : "ONLINE / HEALTHY"} size="small" sx={{ height: 22, fontSize: "0.6875rem", fontWeight: 800, backgroundColor: "rgba(16, 185, 129, 0.12)", color: "#10b981" }} />
                  </Box>
                </Paper>

                <Paper sx={{ p: 2.8, backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px" }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.8125rem", color: tokens.textSecondary, textTransform: "uppercase" }}>
                      {language === "vi" ? "BỘ NHỚ RAM (RSS)" : "MEMORY USAGE (RSS)"}
                    </Typography>
                    <Cpu size={22} color="#3b82f6" />
                  </Box>
                  <Typography sx={{ fontSize: "2.25rem", fontWeight: 800, mt: 1.2, color: tokens.textPrimary, lineHeight: 1.1 }}>
                    {diagnosticsData.memory.rssMb} MB
                  </Typography>
                  <Typography sx={{ color: tokens.textSecondary, fontSize: "0.8125rem", mt: 0.5 }}>
                    Heap: {diagnosticsData.memory.heapUsedMb} / {diagnosticsData.memory.heapTotalMb} MB
                  </Typography>
                </Paper>

                <Paper sx={{ p: 2.8, backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px" }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.8125rem", color: tokens.textSecondary, textTransform: "uppercase" }}>
                      {language === "vi" ? "THỜI GIAN HOẠT ĐỘNG" : "UPTIME"}
                    </Typography>
                    <Activity size={22} color="#f59e0b" />
                  </Box>
                  <Typography sx={{ fontSize: "2.25rem", fontWeight: 800, mt: 1.2, color: tokens.textPrimary, lineHeight: 1.1 }}>
                    {Math.floor(diagnosticsData.uptimeSeconds / 60)} {language === "vi" ? "phút" : "min"}
                  </Typography>
                  <Typography sx={{ color: tokens.textSecondary, fontSize: "0.8125rem", mt: 0.5 }}>
                    {diagnosticsData.uptimeSeconds} {language === "vi" ? "giây hoạt động" : "seconds elapsed"}
                  </Typography>
                </Paper>

                <Paper sx={{ p: 2.8, backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: "10px" }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography sx={{ fontWeight: 700, fontSize: "0.8125rem", color: tokens.textSecondary, textTransform: "uppercase" }}>
                      {language === "vi" ? "MÔI TRƯỜNG NODE.JS" : "NODE RUNTIME"}
                    </Typography>
                    <Wrench size={22} color="#a855f7" />
                  </Box>
                  <Typography sx={{ fontSize: "2.25rem", fontWeight: 800, mt: 1.2, color: tokens.textPrimary, lineHeight: 1.1 }}>
                    {diagnosticsData.nodeVersion}
                  </Typography>
                  <Typography sx={{ color: tokens.textSecondary, fontSize: "0.8125rem", mt: 0.5 }}>
                    Reported Engine Server
                  </Typography>
                </Paper>
              </Box>

              <Typography sx={{ fontWeight: 800, fontSize: "0.9375rem", color: tokens.textPrimary, mb: 2, letterSpacing: "0.04em" }}>
                {language === "vi" ? "SỐ LƯỢNG BẢN GHI THEO BẢNG DỮ LIỆU" : "POSTGRESQL TABLE RECORD VOLUMES"}
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", sm: "repeat(3, minmax(0, 1fr))", md: "repeat(5, minmax(0, 1fr))" },
                  gap: 2,
                  mb: 3.5,
                }}
              >
                {Object.entries(diagnosticsData.counts || {}).map(([key, val]) => (
                  <Paper
                    key={key}
                    sx={{
                      p: 2.2,
                      backgroundColor: tokens.surfaceSecondary,
                      border: `1px solid ${tokens.border}`,
                      borderRadius: "10px",
                    }}
                  >
                    <Typography sx={{ fontWeight: 700, fontSize: "0.8125rem", color: tokens.textSecondary, textTransform: "none" }}>
                      {getTableFriendlyName(key)}
                    </Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: "1.625rem", color: tokens.primary, mt: 0.6 }}>
                      {String(val)}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </Box>
          ) : null}
        </Box>
      )}

      <Drawer
        anchor="right"
        open={inspectDrawerOpen}
        onClose={() => setInspectDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 460 },
            p: 3,
            backgroundColor: tokens.surface,
            borderLeft: `1px solid ${tokens.border}`,
          },
        }}
      >
        {loadingInspectUser || !inspectedUser ? (
          <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Hồ Sơ Toàn Quyền
              </Typography>
              <IconButton size="small" onClick={() => setInspectDrawerOpen(false)}>
                <X size={18} />
              </IconButton>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
              <UserAvatar user={inspectedUser.user as any} size={50} showTooltip={false} />
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: tokens.textPrimary }}>
                  {inspectedUser.user.displayName}
                </Typography>
                <Typography variant="caption" sx={{ color: tokens.textSecondary, display: "block" }}>
                  @{inspectedUser.user.username} • {inspectedUser.user.email}
                </Typography>
                <Box sx={{ display: "flex", gap: 0.8, mt: 0.5 }}>
                  <Chip
                    size="small"
                    label={getRoleConfig(inspectedUser.user.role).label}
                    sx={{
                      height: 20,
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      backgroundColor: getRoleConfig(inspectedUser.user.role).bg,
                      color: getRoleConfig(inspectedUser.user.role).color,
                      border: `1px solid ${getRoleConfig(inspectedUser.user.role).border}`,
                    }}
                  />
                  {inspectedUser.user.twoFactorEnabled && (
                    <Chip size="small" label="2FA Bật" sx={{ height: 20, fontSize: "0.6875rem", backgroundColor: "rgba(63, 185, 80, 0.15)", color: tokens.success }} />
                  )}
                </Box>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="caption" sx={{ fontWeight: 700, color: tokens.textSecondary, textTransform: "uppercase", mb: 1, display: "block" }}>
              Workspaces Tham Gia ({inspectedUser.workspaces.length})
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.8, mb: 2.5 }}>
              {inspectedUser.workspaces.map((ws) => (
                <Box key={ws.workspaceId} sx={{ p: 1.2, borderRadius: "6px", border: `1px solid ${tokens.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.8125rem" }}>
                      {ws.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
                      @{ws.slug}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={getRoleConfig(ws.role).label}
                    sx={{
                      height: 20,
                      fontSize: "0.6875rem",
                      fontWeight: 600,
                      backgroundColor: getRoleConfig(ws.role).bg,
                      color: getRoleConfig(ws.role).color,
                      border: `1px solid ${getRoleConfig(ws.role).border}`,
                    }}
                  />
                </Box>
              ))}
            </Box>

            <Button
              variant="outlined"
              fullWidth
              startIcon={<ExternalLink size={16} />}
              onClick={() => {
                setInspectDrawerOpen(false);
                setLocation(`/users/${inspectedUser.user.username}`);
              }}
              sx={{ textTransform: "none", borderRadius: "6px", borderColor: tokens.border, color: tokens.textPrimary }}
            >
              Xem Trang Hồ Sơ Công Khai
            </Button>
          </Box>
        )}
      </Drawer>

      <Dialog open={createWsOpen} onClose={() => setCreateWsOpen(false)} PaperProps={{ sx: { width: 440, borderRadius: "8px", backgroundColor: tokens.surface } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Tạo Không Gian Làm Việc Mới</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField label="Tên Workspace" fullWidth size="small" value={wsName} onChange={(e) => setWsName(e.target.value)} />
          <TextField label="Slug định danh (viết thường)" fullWidth size="small" value={wsSlug} onChange={(e) => setWsSlug(e.target.value)} />
          <TextField label="Mô tả" fullWidth multiline rows={2} size="small" value={wsDesc} onChange={(e) => setWsDesc(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button size="small" onClick={() => setCreateWsOpen(false)} sx={{ textTransform: "none" }}>Hủy</Button>
          <Button size="small" variant="contained" disabled={submittingCreateWs} onClick={handleCreateWorkspace} sx={{ textTransform: "none", backgroundColor: tokens.primary }}>
            {submittingCreateWs ? "Đang tạo..." : "Tạo Workspace"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editWsItem)} onClose={() => setEditWsItem(null)} PaperProps={{ sx: { width: 440, borderRadius: "8px", backgroundColor: tokens.surface } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Chỉnh Sửa Workspace</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField label="Tên Workspace" fullWidth size="small" value={editWsName} onChange={(e) => setEditWsName(e.target.value)} />
          <TextField label="Slug định danh" fullWidth size="small" value={editWsSlug} onChange={(e) => setEditWsSlug(e.target.value)} />
          <TextField label="Mô tả" fullWidth multiline rows={2} size="small" value={editWsDesc} onChange={(e) => setEditWsDesc(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button size="small" onClick={() => setEditWsItem(null)} sx={{ textTransform: "none" }}>Hủy</Button>
          <Button size="small" variant="contained" disabled={submittingEditWs} onClick={handleEditWorkspace} sx={{ textTransform: "none", backgroundColor: tokens.primary }}>
            {submittingEditWs ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteWsItem)} onClose={() => setDeleteWsItem(null)} PaperProps={{ sx: { width: 400, borderRadius: "8px", backgroundColor: tokens.surface } }}>
        <DialogTitle sx={{ fontWeight: 700, color: tokens.error }}>Xác Nhận Xóa Workspace</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
            Bạn có chắc chắn muốn xóa không gian <strong>{deleteWsItem?.name}</strong>? Toàn bộ dự án và issues liên quan sẽ bị loại bỏ.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button size="small" onClick={() => setDeleteWsItem(null)} sx={{ textTransform: "none" }}>Hủy</Button>
          <Button size="small" variant="contained" disabled={submittingDeleteWs} onClick={handleDeleteWorkspace} sx={{ textTransform: "none", backgroundColor: tokens.error }}>
            {submittingDeleteWs ? "Đang xóa..." : "Xóa vĩnh viễn"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(memberWsItem)} onClose={() => setMemberWsItem(null)} PaperProps={{ sx: { width: 540, borderRadius: "8px", backgroundColor: tokens.surface } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Thành Viên Trong Không Gian: {memberWsItem?.name}
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Box sx={{ display: "flex", gap: 1, mb: 2.5, alignItems: "center" }}>
            <TextField
              size="small"
              placeholder="Nhập User ID để thêm..."
              value={addMemberUserId}
              onChange={(e) => setAddMemberUserId(e.target.value)}
              sx={{ flex: 1 }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select value={addMemberRole} onChange={(e) => setAddMemberRole(e.target.value)}>
                <MenuItem value="ADMIN">{language === "vi" ? "Quản trị viên (Admin)" : "Admin"}</MenuItem>
                <MenuItem value="MEMBER">{language === "vi" ? "Thành viên (Member)" : "Member"}</MenuItem>
                <MenuItem value="GUEST">{language === "vi" ? "Khách (Guest)" : "Guest"}</MenuItem>
              </Select>
            </FormControl>
            <Button
              size="small"
              variant="contained"
              disabled={submittingAddMember || !addMemberUserId}
              onClick={handleAddWorkspaceMember}
              sx={{ textTransform: "none", backgroundColor: tokens.primary }}
            >
              Thêm
            </Button>
          </Box>

          {loadingWsMembers ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {wsMembersList.map((m) => (
                <Box key={m.id} sx={{ p: 1.2, borderRadius: "6px", border: `1px solid ${tokens.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <UserAvatar user={{ id: m.userId, username: m.username, displayName: m.displayName, avatarUrl: m.avatarUrl, role: "USER" as any }} size={24} showTooltip={false} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 700, fontSize: "0.8125rem" }}>{m.displayName}</Typography>
                      <Typography variant="caption" sx={{ color: tokens.textSecondary }}>@{m.username}</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Select
                      size="small"
                      value={m.role}
                      onChange={(e) => handleChangeMemberRole(m.userId, e.target.value)}
                      sx={{ fontSize: "0.75rem", height: 28 }}
                    >
                      <MenuItem value="OWNER">{language === "vi" ? "Chủ sở hữu (Owner)" : "Owner"}</MenuItem>
                      <MenuItem value="ADMIN">{language === "vi" ? "Quản trị viên (Admin)" : "Admin"}</MenuItem>
                      <MenuItem value="MEMBER">{language === "vi" ? "Thành viên (Member)" : "Member"}</MenuItem>
                      <MenuItem value="GUEST">{language === "vi" ? "Khách (Guest)" : "Guest"}</MenuItem>
                    </Select>
                    <IconButton size="small" onClick={() => handleRemoveWorkspaceMember(m.userId)} sx={{ color: tokens.error }}>
                      <X size={14} />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button size="small" onClick={() => setMemberWsItem(null)} sx={{ textTransform: "none" }}>Đóng</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createProjOpen} onClose={() => setCreateProjOpen(false)} PaperProps={{ sx: { width: 440, borderRadius: "8px", backgroundColor: tokens.surface } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Tạo Dự Án Mới</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField label="Key viết tắt (VD: PROJ)" fullWidth size="small" value={projKey} onChange={(e) => setProjKey(e.target.value.toUpperCase())} />
          <TextField label="Tên Dự Án" fullWidth size="small" value={projName} onChange={(e) => setProjName(e.target.value)} />
          <TextField label="Slug định danh" fullWidth size="small" value={projSlug} onChange={(e) => setProjSlug(e.target.value)} />
          <TextField label="Mô tả dự án" fullWidth multiline rows={2} size="small" value={projDesc} onChange={(e) => setProjDesc(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button size="small" onClick={() => setCreateProjOpen(false)} sx={{ textTransform: "none" }}>Hủy</Button>
          <Button size="small" variant="contained" disabled={submittingCreateProj} onClick={handleCreateProject} sx={{ textTransform: "none", backgroundColor: tokens.primary }}>
            {submittingCreateProj ? "Đang tạo..." : "Tạo Dự Án"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editProjItem)} onClose={() => setEditProjItem(null)} PaperProps={{ sx: { width: 440, borderRadius: "8px", backgroundColor: tokens.surface } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Chỉnh Sửa Dự Án</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField label="Key viết tắt" fullWidth size="small" value={editProjKey} onChange={(e) => setEditProjKey(e.target.value.toUpperCase())} />
          <TextField label="Tên Dự Án" fullWidth size="small" value={editProjName} onChange={(e) => setEditProjName(e.target.value)} />
          <TextField label="Slug định danh" fullWidth size="small" value={editProjSlug} onChange={(e) => setEditProjSlug(e.target.value)} />
          <TextField label="Mô tả dự án" fullWidth multiline rows={2} size="small" value={editProjDesc} onChange={(e) => setEditProjDesc(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button size="small" onClick={() => setEditProjItem(null)} sx={{ textTransform: "none" }}>Hủy</Button>
          <Button size="small" variant="contained" disabled={submittingEditProj} onClick={handleEditProject} sx={{ textTransform: "none", backgroundColor: tokens.primary }}>
            {submittingEditProj ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteProjItem)} onClose={() => setDeleteProjItem(null)} PaperProps={{ sx: { width: 400, borderRadius: "8px", backgroundColor: tokens.surface } }}>
        <DialogTitle sx={{ fontWeight: 700, color: tokens.error }}>Xác Nhận Xóa Dự Án</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
            Bạn có chắc chắn muốn xóa dự án <strong>[{deleteProjItem?.key}] {deleteProjItem?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button size="small" onClick={() => setDeleteProjItem(null)} sx={{ textTransform: "none" }}>Hủy</Button>
          <Button size="small" variant="contained" disabled={submittingDeleteProj} onClick={handleDeleteProject} sx={{ textTransform: "none", backgroundColor: tokens.error }}>
            {submittingDeleteProj ? "Đang xóa..." : "Xóa vĩnh viễn"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createLabelOpen} onClose={() => setCreateLabelOpen(false)} PaperProps={{ sx: { width: 400, borderRadius: "8px", backgroundColor: tokens.surface } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Tạo Nhãn Phân Loại Mới</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField label="Tên nhãn" fullWidth size="small" value={labelName} onChange={(e) => setLabelName(e.target.value)} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <input type="color" value={labelColor} onChange={(e) => setLabelColor(e.target.value)} style={{ width: 40, height: 40, border: "none", borderRadius: 4, cursor: "pointer" }} />
            <TextField label="Mã màu HEX" size="small" value={labelColor} onChange={(e) => setLabelColor(e.target.value)} sx={{ flex: 1 }} />
          </Box>
          <TextField label="Mô tả nhãn" fullWidth multiline rows={2} size="small" value={labelDesc} onChange={(e) => setLabelDesc(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button size="small" onClick={() => setCreateLabelOpen(false)} sx={{ textTransform: "none" }}>Hủy</Button>
          <Button size="small" variant="contained" disabled={submittingCreateLabel} onClick={handleCreateLabel} sx={{ textTransform: "none", backgroundColor: tokens.primary }}>
            {submittingCreateLabel ? "Đang tạo..." : "Tạo Nhãn"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editLabelItem)} onClose={() => setEditLabelItem(null)} PaperProps={{ sx: { width: 400, borderRadius: "8px", backgroundColor: tokens.surface } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Chỉnh Sửa Nhãn Phân Loại</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField label="Tên nhãn" fullWidth size="small" value={editLabelName} onChange={(e) => setEditLabelName(e.target.value)} />
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <input type="color" value={editLabelColor} onChange={(e) => setEditLabelColor(e.target.value)} style={{ width: 40, height: 40, border: "none", borderRadius: 4, cursor: "pointer" }} />
            <TextField label="Mã màu HEX" size="small" value={editLabelColor} onChange={(e) => setEditLabelColor(e.target.value)} sx={{ flex: 1 }} />
          </Box>
          <TextField label="Mô tả nhãn" fullWidth multiline rows={2} size="small" value={editLabelDesc} onChange={(e) => setEditLabelDesc(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button size="small" onClick={() => setEditLabelItem(null)} sx={{ textTransform: "none" }}>Hủy</Button>
          <Button size="small" variant="contained" disabled={submittingEditLabel} onClick={handleEditLabel} sx={{ textTransform: "none", backgroundColor: tokens.primary }}>
            {submittingEditLabel ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteLabelItem)} onClose={() => setDeleteLabelItem(null)} PaperProps={{ sx: { width: 400, borderRadius: "8px", backgroundColor: tokens.surface } }}>
        <DialogTitle sx={{ fontWeight: 700, color: tokens.error }}>Xác Nhận Xóa Nhãn</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
            Bạn có chắc chắn muốn xóa nhãn <strong>{deleteLabelItem?.name}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button size="small" onClick={() => setDeleteLabelItem(null)} sx={{ textTransform: "none" }}>Hủy</Button>
          <Button size="small" variant="contained" disabled={submittingDeleteLabel} onClick={handleDeleteLabel} sx={{ textTransform: "none", backgroundColor: tokens.error }}>
            {submittingDeleteLabel ? "Đang xóa..." : "Xóa nhãn"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteRepoItem)} onClose={() => setDeleteRepoItem(null)} PaperProps={{ sx: { width: 400, borderRadius: "8px", backgroundColor: tokens.surface } }}>
        <DialogTitle sx={{ fontWeight: 700, color: tokens.error }}>Xác Nhận Ngắt Kết Nối Repository</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
            {language === "vi" ? "Bạn có chắc muốn ngắt liên kết repository " : "Are you sure you want to unlink repository "}<strong>{deleteRepoItem?.fullName}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button size="small" onClick={() => setDeleteRepoItem(null)} sx={{ textTransform: "none" }}>Hủy</Button>
          <Button size="small" variant="contained" disabled={submittingDeleteRepo} onClick={handleDeleteRepo} sx={{ textTransform: "none", backgroundColor: tokens.error }}>
            {submittingDeleteRepo ? "Đang gỡ..." : "Ngắt kết nối"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createUserOpen} onClose={() => setCreateUserOpen(false)} PaperProps={{ sx: { width: 440, borderRadius: "8px", backgroundColor: tokens.surface } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Tạo Tài Khoản Người Dùng Mới</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField label="Tên đăng nhập (username)" fullWidth size="small" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
          <TextField label="Tên hiển thị" fullWidth size="small" value={newDisplayName} onChange={(e) => setNewDisplayName(e.target.value)} />
          <TextField label="Địa chỉ Email" fullWidth size="small" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          <TextField label="Mật khẩu khởi tạo" type="password" fullWidth size="small" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <FormControl fullWidth size="small">
            <InputLabel>{language === "vi" ? "Vai trò hệ thống" : "System Role"}</InputLabel>
            <Select value={newUserRole} label={language === "vi" ? "Vai trò hệ thống" : "System Role"} onChange={(e) => setNewUserRole(e.target.value)}>
              <MenuItem value="ADMIN">{language === "vi" ? "Quản trị viên (Admin)" : "Admin"}</MenuItem>
              <MenuItem value="MAINTAINER">{language === "vi" ? "Bảo trì viên (Maintainer)" : "Maintainer"}</MenuItem>
              <MenuItem value="REVIEWER">{language === "vi" ? "Duyệt mã (Reviewer)" : "Reviewer"}</MenuItem>
              <MenuItem value="USER">{language === "vi" ? "Thành viên (User)" : "Member"}</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button size="small" onClick={() => setCreateUserOpen(false)} sx={{ textTransform: "none" }}>Hủy</Button>
          <Button size="small" variant="contained" disabled={submittingCreateUser} onClick={handleCreateUser} sx={{ textTransform: "none", backgroundColor: tokens.primary }}>
            {submittingCreateUser ? "Đang tạo..." : "Tạo người dùng"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={editUserModalOpen}
        onClose={() => {
          if (!submittingEditUser) {
            setEditUserModalOpen(false);
            setEditingUser(null);
          }
        }}
        PaperProps={{ sx: { width: 480, borderRadius: "8px", backgroundColor: tokens.surface } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {language === "vi" ? "Chỉnh Sửa Thông Tin Người Dùng" : "Edit User Profile"}
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            label={language === "vi" ? "Tên hiển thị" : "Display Name"}
            fullWidth
            size="small"
            value={editDisplayName}
            onChange={(e) => setEditDisplayName(e.target.value)}
          />
          <TextField
            label="Email"
            fullWidth
            size="small"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
          />
          <TextField
            label="GitHub Username"
            fullWidth
            size="small"
            value={editGithubUsername}
            onChange={(e) => setEditGithubUsername(e.target.value)}
            placeholder="octocat"
          />
          <FormControl fullWidth size="small">
            <InputLabel>{language === "vi" ? "Vai trò hệ thống" : "Platform Role"}</InputLabel>
            <Select
              value={editUserRole}
              label={language === "vi" ? "Vai trò hệ thống" : "Platform Role"}
              onChange={(e) => setEditUserRole(e.target.value)}
            >
              <MenuItem value="ADMIN">{language === "vi" ? "ADMIN (Quản trị viên toàn quyền)" : "ADMIN"}</MenuItem>
              <MenuItem value="MAINTAINER">{language === "vi" ? "MAINTAINER (Bảo trì viên)" : "MAINTAINER"}</MenuItem>
              <MenuItem value="REVIEWER">{language === "vi" ? "REVIEWER (Duyệt mã & nội dung)" : "REVIEWER"}</MenuItem>
              <MenuItem value="USER">{language === "vi" ? "USER (Thành viên tiêu chuẩn)" : "USER"}</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label={language === "vi" ? "Tiểu sử (Bio)" : "Bio"}
            fullWidth
            multiline
            rows={3}
            size="small"
            value={editBio}
            onChange={(e) => setEditBio(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            size="small"
            disabled={submittingEditUser}
            onClick={() => {
              setEditUserModalOpen(false);
              setEditingUser(null);
            }}
            sx={{ textTransform: "none" }}
          >
            {language === "vi" ? "Hủy" : "Cancel"}
          </Button>
          <Button
            size="small"
            variant="contained"
            disabled={submittingEditUser}
            onClick={handleSaveEditUser}
            sx={{ textTransform: "none", backgroundColor: tokens.primary }}
          >
            {submittingEditUser ? (language === "vi" ? "Đang lưu..." : "Saving...") : (language === "vi" ? "Lưu thay đổi" : "Save Changes")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(roleModalUser)} onClose={() => setRoleModalUser(null)} PaperProps={{ sx: { width: 420, borderRadius: "8px", backgroundColor: tokens.surface } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{language === "vi" ? "Thay Đổi Vai Trò Người Dùng" : "Change User Role"}</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ mb: 2, color: tokens.textSecondary }}>
            {language === "vi" ? "Phân quyền vai trò hệ thống cho tài khoản " : "Assign platform role to "}
            <strong>@{roleModalUser?.username}</strong> ({roleModalUser?.displayName}):
          </Typography>
          <FormControl fullWidth size="small">
            <InputLabel>{language === "vi" ? "Vai trò hệ thống" : "Platform Role"}</InputLabel>
            <Select value={selectedNewRole} label={language === "vi" ? "Vai trò hệ thống" : "Platform Role"} onChange={(e) => setSelectedNewRole(e.target.value)}>
              <MenuItem value="ADMIN">{language === "vi" ? "ADMIN (Quản trị viên toàn quyền)" : "ADMIN (Platform Admin)"}</MenuItem>
              <MenuItem value="MAINTAINER">{language === "vi" ? "MAINTAINER (Bảo trì viên)" : "MAINTAINER (System Maintainer)"}</MenuItem>
              <MenuItem value="REVIEWER">{language === "vi" ? "REVIEWER (Duyệt mã & nội dung)" : "REVIEWER (Reviewer)"}</MenuItem>
              <MenuItem value="USER">{language === "vi" ? "USER (Người dùng tiêu chuẩn)" : "USER (Standard User)"}</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button size="small" onClick={() => setRoleModalUser(null)} sx={{ textTransform: "none" }}>{language === "vi" ? "Hủy" : "Cancel"}</Button>
          <Button size="small" variant="contained" disabled={submittingRole} onClick={handleSaveRole} sx={{ textTransform: "none", backgroundColor: tokens.primary }}>
            {submittingRole ? (language === "vi" ? "Đang lưu..." : "Saving...") : (language === "vi" ? "Cập nhật vai trò" : "Save Role")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(resetPassUser)} onClose={() => setResetPassUser(null)} PaperProps={{ sx: { width: 400, borderRadius: "8px", backgroundColor: tokens.surface } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Đặt Lại Mật Khẩu</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ mb: 2, color: tokens.textSecondary }}>
            Đặt lại mật khẩu mới cho tài khoản <strong>@{resetPassUser?.username}</strong>.
          </Typography>
          <TextField
            label="Mật khẩu mới"
            type="password"
            fullWidth
            size="small"
            value={resetNewPass}
            onChange={(e) => setResetNewPass(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button size="small" onClick={() => setResetPassUser(null)} sx={{ textTransform: "none" }}>Hủy</Button>
          <Button size="small" variant="contained" disabled={submittingResetPass} onClick={handleResetPassword} sx={{ textTransform: "none", backgroundColor: tokens.warning }}>
            {submittingResetPass ? "Đang đặt..." : "Xác nhận đổi"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteUserItem)} onClose={() => setDeleteUserItem(null)} PaperProps={{ sx: { width: 400, borderRadius: "8px", backgroundColor: tokens.surface } }}>
        <DialogTitle sx={{ fontWeight: 700, color: tokens.error }}>Xác Nhận Xóa Tài Khoản</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
            Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản <strong>@{deleteUserItem?.username}</strong>? Thao tác này không thể hoàn tác.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button size="small" onClick={() => setDeleteUserItem(null)} sx={{ textTransform: "none" }}>Hủy</Button>
          <Button size="small" variant="contained" disabled={submittingDeleteUser} onClick={handleDeleteUser} sx={{ textTransform: "none", backgroundColor: tokens.error }}>
            {submittingDeleteUser ? "Đang xóa..." : "Xóa vĩnh viễn"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editPostItem)} onClose={() => setEditPostItem(null)} PaperProps={{ sx: { width: 500, borderRadius: "8px", backgroundColor: tokens.surface } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Chỉnh Sửa Bài Viết (#{editPostItem?.number})</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField label="Tiêu đề bài viết" fullWidth size="small" value={editPostTitle} onChange={(e) => setEditPostTitle(e.target.value)} />
          <Box sx={{ display: "flex", gap: 1.5 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Trạng thái</InputLabel>
              <Select value={editPostStatus} label="Trạng thái" onChange={(e) => setEditPostStatus(e.target.value)}>
                <MenuItem value="OPEN">{language === "vi" ? "Đang mở (Open)" : "Open"}</MenuItem>
                <MenuItem value="IN_PROGRESS">{language === "vi" ? "Đang xử lý (In Progress)" : "In Progress"}</MenuItem>
                <MenuItem value="RESOLVED">{language === "vi" ? "Đã giải quyết (Resolved)" : "Resolved"}</MenuItem>
                <MenuItem value="CLOSED">{language === "vi" ? "Đã đóng (Closed)" : "Closed"}</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Ưu tiên</InputLabel>
              <Select value={editPostPriority} label="Ưu tiên" onChange={(e) => setEditPostPriority(e.target.value)}>
                <MenuItem value="P0">P0 - Khẩn cấp</MenuItem>
                <MenuItem value="P1">P1 - Cao</MenuItem>
                <MenuItem value="P2">P2 - Trung bình</MenuItem>
                <MenuItem value="P3">P3 - Thấp</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <TextField label="Nội dung mô tả" fullWidth multiline rows={4} size="small" value={editPostDesc} onChange={(e) => setEditPostDesc(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button size="small" onClick={() => setEditPostItem(null)} sx={{ textTransform: "none" }}>Hủy</Button>
          <Button size="small" variant="contained" disabled={submittingEditPost} onClick={handleEditPost} sx={{ textTransform: "none", backgroundColor: tokens.primary }}>
            {submittingEditPost ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deletePostItem)} onClose={() => setDeletePostItem(null)} PaperProps={{ sx: { width: 400, borderRadius: "8px", backgroundColor: tokens.surface } }}>
        <DialogTitle sx={{ fontWeight: 700, color: tokens.error }}>Xác Nhận Xóa Bài Viết</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
            Bạn có chắc muốn xóa vĩnh viễn bài viết <strong>#{deletePostItem?.number} {deletePostItem?.title}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button size="small" onClick={() => setDeletePostItem(null)} sx={{ textTransform: "none" }}>Hủy</Button>
          <Button size="small" variant="contained" disabled={submittingDeletePost} onClick={handleDeletePost} sx={{ textTransform: "none", backgroundColor: tokens.error }}>
            {submittingDeletePost ? "Đang xóa..." : "Xóa vĩnh viễn"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editCommentItem)} onClose={() => setEditCommentItem(null)} PaperProps={{ sx: { width: 480, borderRadius: "8px", backgroundColor: tokens.surface } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Chỉnh Sửa Bình Luận Trực Tiếp</DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ mb: 1.5, color: tokens.textSecondary }}>
            Chỉnh sửa nội dung với đặc quyền Quản trị viên. Lịch sử sẽ được lưu vào bảng lịch sử phiên bản.
          </Typography>
          <TextField
            label="Nội dung bình luận"
            fullWidth
            multiline
            rows={4}
            size="small"
            value={editCommentContent}
            onChange={(e) => setEditCommentContent(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button size="small" onClick={() => setEditCommentItem(null)} sx={{ textTransform: "none" }}>Hủy</Button>
          <Button size="small" variant="contained" disabled={submittingEditComment} onClick={handleEditComment} sx={{ textTransform: "none", backgroundColor: tokens.primary }}>
            {submittingEditComment ? "Đang lưu..." : "Lưu nội dung"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteCommentItem)} onClose={() => setDeleteCommentItem(null)} PaperProps={{ sx: { width: 400, borderRadius: "8px", backgroundColor: tokens.surface } }}>
        <DialogTitle sx={{ fontWeight: 700, color: tokens.error }}>Xác Nhận Xóa Bình Luận</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
            Bạn có chắc chắn muốn xóa vĩnh viễn bình luận này khỏi hệ thống?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button size="small" onClick={() => setDeleteCommentItem(null)} sx={{ textTransform: "none" }}>Hủy</Button>
          <Button size="small" variant="contained" disabled={submittingDeleteComment} onClick={handleDeleteComment} sx={{ textTransform: "none", backgroundColor: tokens.error }}>
            {submittingDeleteComment ? "Đang xóa..." : "Xóa vĩnh viễn"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editHistoryComment)} onClose={() => setEditHistoryComment(null)} PaperProps={{ sx: { width: 520, borderRadius: "8px", backgroundColor: tokens.surface } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{language === "vi" ? "Lịch Sử Chỉnh Sửa Bình Luận" : "Comment Edit History"}</DialogTitle>
        <DialogContent>
          {loadingEditHistory ? (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : editHistoryList.length === 0 ? (
            <Typography variant="body2" sx={{ color: tokens.textSecondary, py: 2 }}>
              {language === "vi" ? "Không tìm thấy bản sửa đổi nào" : "No edit history found"}
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
              {editHistoryList.map((ed, idx) => (
                <Box key={ed.id} sx={{ p: 1.5, borderRadius: "6px", border: `1px solid ${tokens.border}`, backgroundColor: tokens.surfaceSecondary }}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {language === "vi" ? `Phiên bản #${editHistoryList.length - idx}` : `Version #${editHistoryList.length - idx}`} • @{ed.editorUsername}
                    </Typography>
                    <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
                      {new Date(ed.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: tokens.error, display: "block", textDecoration: "line-through", mb: 0.5 }}>
                    - {ed.previousContent}
                  </Typography>
                  <Typography variant="caption" sx={{ color: tokens.success, display: "block" }}>
                    + {ed.newContent}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button size="small" onClick={() => setEditHistoryComment(null)} sx={{ textTransform: "none" }}>{language === "vi" ? "Đóng" : "Close"}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(moderateCommentItem)} onClose={() => setModerateCommentItem(null)} PaperProps={{ sx: { width: 420, borderRadius: "8px", backgroundColor: tokens.surface } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {moderateCommentItem?.isHidden
            ? (language === "vi" ? "Mở Lại Bình Luận" : "Unhide Comment")
            : (language === "vi" ? "Kiểm Duyệt Bình Luận" : "Moderate Comment")}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: tokens.textSecondary }}>
            {moderateCommentItem?.isHidden
              ? (language === "vi" ? "Bình luận này sẽ được hiển thị công khai trở lại đối với tất cả thành viên." : "This comment will be made visible again to all users.")
              : (language === "vi" ? "Chọn lý do vi phạm để ẩn nội dung bình luận này khỏi bài viết:" : "Select the reason for moderating this comment:")}
          </Typography>
          {!moderateCommentItem?.isHidden && (
            <FormControl fullWidth size="small">
              <InputLabel>{language === "vi" ? "Lý do ẩn" : "Moderation Reason"}</InputLabel>
              <Select value={moderateReason} label={language === "vi" ? "Lý do ẩn" : "Moderation Reason"} onChange={(e) => setModerateReason(e.target.value)}>
                <MenuItem value="SPAM">{language === "vi" ? "SPAM (Quảng cáo / Tin rác vô nghĩa)" : "SPAM (Spam / Unsolicited)"}</MenuItem>
                <MenuItem value="ABUSE">{language === "vi" ? "ABUSE (Nội dung xúc phạm / Công kích)" : "ABUSE (Abusive / Hostile)"}</MenuItem>
                <MenuItem value="OFF_TOPIC">{language === "vi" ? "OFF TOPIC (Lạc đề / Không liên quan)" : "OFF TOPIC (Irrelevant)"}</MenuItem>
                <MenuItem value="RESOLVED">{language === "vi" ? "RESOLVED (Vấn đề đã giải quyết xong)" : "RESOLVED (Already addressed)"}</MenuItem>
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button size="small" onClick={() => setModerateCommentItem(null)} sx={{ textTransform: "none" }}>{language === "vi" ? "Hủy" : "Cancel"}</Button>
          <Button
            size="small"
            variant="contained"
            disabled={submittingModeration}
            onClick={() => handleSaveModeration(!moderateCommentItem?.isHidden)}
            sx={{ textTransform: "none", backgroundColor: moderateCommentItem?.isHidden ? tokens.success : tokens.error }}
          >
            {submittingModeration
              ? (language === "vi" ? "Đang xử lý..." : "Processing...")
              : moderateCommentItem?.isHidden
              ? (language === "vi" ? "Mở lại bình luận" : "Unhide Comment")
              : (language === "vi" ? "Xác nhận ẩn" : "Confirm Hide")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(inspectLogItem)} onClose={() => setInspectLogItem(null)} PaperProps={{ sx: { width: 500, borderRadius: "8px", backgroundColor: tokens.surface } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{language === "vi" ? "Chi Tiết Audit Log" : "Audit Log Details"}</DialogTitle>
        <DialogContent>
          {inspectLogItem && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, pt: 1 }}>
              <Box>
                <Typography variant="caption" sx={{ color: tokens.textSecondary, fontWeight: 700 }}>{language === "vi" ? "HÀNH ĐỘNG" : "ACTION"}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: tokens.primary }}>
                  {formatAuditAction(inspectLogItem.action)} ({inspectLogItem.action})
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: tokens.textSecondary, fontWeight: 700 }}>{language === "vi" ? "TÀI NGUYÊN" : "TARGET RESOURCE"}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatAuditTarget(inspectLogItem.targetResource)} ({inspectLogItem.targetResource})
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: tokens.textSecondary, fontWeight: 700 }}>{language === "vi" ? "NGƯỜI THỰC HIỆN" : "ACTOR"}</Typography>
                <Typography variant="body2">@{inspectLogItem.actorUsername || (language === "vi" ? "Hệ thống" : "System")}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: tokens.textSecondary, fontWeight: 700 }}>CHI TIẾT DỮ LIỆU (PAYLOAD / DETAILS)</Typography>
                <Paper sx={{ p: 1.5, mt: 0.5, backgroundColor: tokens.surfaceSecondary, border: `1px solid ${tokens.border}`, maxHeight: 200, overflowY: "auto" }}>
                  <pre style={{ margin: 0, fontSize: "0.75rem", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
                    {JSON.stringify(inspectLogItem.details, null, 2)}
                  </pre>
                </Paper>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button size="small" onClick={() => setInspectLogItem(null)} sx={{ textTransform: "none" }}>Đóng</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={broadcastOpen} onClose={() => setBroadcastOpen(false)} PaperProps={{ sx: { width: 480, borderRadius: "8px", backgroundColor: tokens.surface } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>{language === "vi" ? "Gửi Thông Báo Toàn Hệ Thống" : "Broadcast System Announcement"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
            {language === "vi" ? "Thông báo này sẽ được gửi tới tất cả người dùng trong toàn hệ thống." : "This notification will be broadcast to all registered users across the system."}
          </Typography>
          <TextField
            label={language === "vi" ? "Tiêu đề thông báo" : "Announcement title"}
            fullWidth
            size="small"
            value={broadcastTitle}
            onChange={(e) => setBroadcastTitle(e.target.value)}
          />
          <TextField
            label={language === "vi" ? "Nội dung thông báo" : "Announcement content"}
            fullWidth
            multiline
            rows={3}
            size="small"
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
          />
          <TextField
            label={language === "vi" ? "Liên kết đính kèm (tùy chọn)" : "Attached link (optional)"}
            fullWidth
            size="small"
            placeholder="/"
            value={broadcastLink}
            onChange={(e) => setBroadcastLink(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button size="small" onClick={() => setBroadcastOpen(false)} sx={{ textTransform: "none" }}>{language === "vi" ? "Hủy" : "Cancel"}</Button>
          <Button
            size="small"
            variant="contained"
            disabled={submittingBroadcast}
            onClick={handleSendBroadcast}
            sx={{ textTransform: "none", backgroundColor: tokens.primary }}
          >
            {submittingBroadcast ? (language === "vi" ? "Đang gửi..." : "Sending...") : (language === "vi" ? "Gửi thông báo hệ thống" : "Send announcement")}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={cleanupDialogOpen} onClose={() => setCleanupDialogOpen(false)} PaperProps={{ sx: { width: 420, borderRadius: "8px", backgroundColor: tokens.surface } }}>
        <DialogTitle sx={{ fontWeight: 700, color: tokens.warning }}>{language === "vi" ? "Dọn Dẹp Dữ Liệu Hết Hạn" : "Cleanup Expired Data"}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
            {language === "vi"
              ? "Hệ thống sẽ dọn dẹp các phiên đăng nhập đã hết hạn, các sự kiện outbox đã xử lý thành công và các email job đã hoàn tất. Hành động này không ảnh hưởng đến dữ liệu người dùng."
              : "The system will clean up expired login sessions, processed outbox events, and completed email jobs. This action will not affect user data."}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button size="small" onClick={() => setCleanupDialogOpen(false)} sx={{ textTransform: "none" }}>{language === "vi" ? "Hủy" : "Cancel"}</Button>
          <Button
            size="small"
            variant="contained"
            disabled={cleaningSystem}
            onClick={handleCleanSystem}
            color="warning"
            sx={{ textTransform: "none" }}
          >
            {cleaningSystem ? (language === "vi" ? "Đang dọn dẹp..." : "Cleaning...") : (language === "vi" ? "Tiến hành dọn dẹp" : "Proceed with cleanup")}
          </Button>
        </DialogActions>
      </Dialog>
        </Box>
      </Box>
    </Box>
  );
};
