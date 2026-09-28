export const APP_CONFIG = {
  name: "Reported",
  version: "1.0.0",
  taglineVi: "Nền tảng quản lý Issue & Code Review tập trung",
  taglineEn: "Engineering-First Issue & Review Platform",
  descriptionVi:
    "Reported được xây dựng nhằm chuẩn hóa và nâng tầm quy trình phát triển phần mềm trong nhóm kỹ thuật. Nền tảng kết hợp chặt chẽ việc báo cáo lỗi chi tiết, đề xuất kỹ thuật (RFC/Proposal), và quy trình code review chuẩn mực với độ sâu kỹ thuật cao.",
  descriptionEn:
    "Reported was created to streamline and elevate the software development lifecycle in engineering teams. It unifies detailed issue tracking, architectural proposals (RFCs), and rigorous code reviews with deep technical clarity.",
  copyright: "Reported © 2026 Trần Kính Hoàng. All rights reserved.",
} as const;

export const AUTHOR_CONFIG = {
  name: "Trần Kính Hoàng",
  username: "hoaug-tran",
  email: "hi@trkhoang.com",
  githubUrl: "https://github.com/hoaug-tran",
  repoUrl: "https://github.com/hoaug-tran/reported",
} as const;

export const CACHE_CONFIG = {
  ttlDefaultMs: 30_000,
  ttlFastMs: 10_000,
  ttlStaticMs: 120_000,
  ttlZeroMs: 0,
} as const;

export const SYNC_CONFIG = {
  workspacePollingMs: 15_000,
  notificationsPollingMs: 30_000,
  debounceDraftMs: 1_000,
  clipboardToastDurationMs: 2_000,
} as const;

export const STORAGE_KEYS = {
  sidebarCollapsed: "reported_sidebar_collapsed",
  themeMode: "reported_theme_mode",
  reviewDraft: "reported_review_draft",
  issueDraft: "reported_issue_draft",
  codeLangPrefix: "reported_code_lang_",
  token: "reported_token",
  activeWorkspaceId: "reported_active_workspace_id",
} as const;

export const UPLOAD_CONFIG = {
  chunkSize: 2 * 1024 * 1024,
  maxSingleFileSize: 50 * 1024 * 1024,
} as const;

export const CODE_BLOCK_LIMITS = {
  autoHighlightCharacterLimit: 40_000,
  lineNumberLimit: 2_000,
  minAutoDetectChars: 15,
  confidenceRelevanceThreshold: 16,
  minRelevanceMargin: 4,
} as const;

export const TIME_CONSTANTS = {
  oneMinuteSec: 60,
  oneHourSec: 3600,
  oneDaySec: 86400,
  oneMonthSec: 2592000,
  oneYearSec: 31536000,
} as const;

export const ERROR_FALLBACKS = {
  unauthorized: "Yêu cầu đăng nhập hoặc phiên làm việc đã hết hạn.",
  forbidden: "Bạn không có quyền thực hiện thao tác này.",
  notFound: "Tài nguyên không tồn tại hoặc đã bị xóa.",
  conflict: "Dữ liệu bị trùng lặp hoặc xung đột trạng thái.",
  internal: "Hệ thống gặp sự cố xử lý. Vui lòng thử lại sau.",
} as const;
