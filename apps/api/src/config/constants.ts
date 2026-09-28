export const API_CONSTANTS = {
  defaultPageLimit: 20,
  maxPageLimit: 100,
  invitationExpireDays: 7,
  githubPullCacheTtlSec: 10,
  outboxBatchSize: 50,
  authRateLimitWindowMs: 15 * 60 * 1000,
  authRateLimitMaxRequests: 30,
} as const;

export const DB_ERROR_CODES = {
  invalidIdentifier: "22P02",
  uniqueViolation: "23505",
  foreignKeyViolation: "23503",
} as const;

export const MESSAGES = {
  invalidIdentifier: "Định dạng ID hoặc UUID không hợp lệ",
  conflict: "Dữ liệu đã tồn tại trong hệ thống (trùng lặp bản ghi)",
  foreignKeyViolation: "Tài nguyên liên kết không tồn tại hoặc đã bị gỡ bỏ",
  validationError: "Dữ liệu yêu cầu không hợp lệ",
  unauthorized: "Yêu cầu đăng nhập hoặc phiên làm việc đã hết hạn",
  forbidden: "Bạn không có quyền thực hiện thao tác này",
  notFound: "Tài nguyên không tồn tại hoặc đã bị xóa",
  internalError: "Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau.",
} as const;
