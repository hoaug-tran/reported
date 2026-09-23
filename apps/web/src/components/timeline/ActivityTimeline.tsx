import React from "react";
import { Box } from "@mui/material";
import {
  CircleDot,
  UserPlus,
  GitMerge,
  RefreshCw,
  Eye,
  Link as LinkIcon,
  Trash2,
} from "lucide-react";
import { UserAvatar } from "../common/UserAvatar";
import { useThemeContext } from "../../contexts/ThemeContext";
import { useI18n } from "../../contexts/I18nContext";
import { ActivityTimelineDto } from "@reported/contracts";

interface ActivityTimelineProps {
  activities: ActivityTimelineDto[];
}

const statusLabels: Record<string, { vi: string; en: string }> = {
  OPEN: { vi: "Đang mở", en: "Open" },
  IN_PROGRESS: { vi: "Đang xử lý", en: "In progress" },
  NEEDS_INFO: { vi: "Cần thêm thông tin", en: "Needs information" },
  RESOLVED: { vi: "Đã giải quyết", en: "Resolved" },
  CLOSED: { vi: "Đã đóng", en: "Closed" },
  REOPENED: { vi: "Đã mở lại", en: "Reopened" },
  PENDING_REVIEW: { vi: "Chờ review", en: "Pending review" },
  IN_REVIEW: { vi: "Đang review", en: "In review" },
  CHANGES_REQUESTED: { vi: "Cần chỉnh sửa", en: "Changes requested" },
  APPROVED: { vi: "Đã duyệt", en: "Approved" },
  COMPLETED: { vi: "Hoàn thành", en: "Completed" },
};

const fieldLabels: Record<string, string> = {
  title: "tiêu đề",
  description: "mô tả",
  environment: "môi trường",
  precondition: "điều kiện tiên quyết",
  stepsToReproduce: "các bước tái hiện",
  actualResult: "kết quả thực tế",
  expectedResult: "kết quả mong đợi",
  frequency: "tần suất",
  evidenceJsonOrLogs: "bằng chứng / log",
  priority: "mức ưu tiên",
  severity: "mức độ nghiêm trọng",
  assigneeIds: "người phụ trách",
  labels: "nhãn",
};

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  activities,
}) => {
  const { tokens } = useThemeContext();
  const { language } = useI18n();
  const isVi = language === "vi";

  if (!activities || activities.length === 0) return null;

  const sortedActivities = [...activities].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const filteredActivities = sortedActivities.filter(
    (act) =>
      act.actionType !== "COMMENT_ADDED" &&
      act.actionType !== "COMMENT_HIDDEN" &&
      act.actionType !== "COMMENT_UNHIDDEN",
  );
  if (filteredActivities.length === 0) return null;

  const deduped: ActivityTimelineDto[] = [];
  filteredActivities.forEach((act, idx) => {
    if (idx === 0) {
      deduped.push(act);
      return;
    }
    const prev = deduped[deduped.length - 1];
    const sameActor = prev.actor.id === act.actor.id;
    const sameAction = prev.actionType === act.actionType;
    const sameTime =
      Math.abs(
        new Date(prev.createdAt).getTime() - new Date(act.createdAt).getTime(),
      ) < 60000;
    if (!(sameActor && sameAction && sameTime)) {
      const isDuplicateStatusAndEdit =
        ((act.actionType === "EDITED" && prev.actionType === "STATUS_CHANGED") ||
          (act.actionType === "STATUS_CHANGED" && prev.actionType === "EDITED")) &&
        sameActor &&
        sameTime;
      if (isDuplicateStatusAndEdit) {
        if (act.actionType === "STATUS_CHANGED") {
          deduped[deduped.length - 1] = act;
        }
        return;
      }
      deduped.push(act);
    }
  });

  const renderAction = (act: ActivityTimelineDto) => {
    const meta = (act.metadata || {}) as Record<string, unknown>;
    const assignedUser =
      typeof meta.assignedUser === "string" ? meta.assignedUser : "";
    const fromStatus = typeof meta.from === "string" ? meta.from : "";
    const toStatus = typeof meta.to === "string" ? meta.to : "";
    const prNumber =
      typeof meta.prNumber === "number" || typeof meta.prNumber === "string"
        ? String(meta.prNumber)
        : "";
    const decision = typeof meta.decision === "string" ? meta.decision : "";
    const note = typeof meta.note === "string" ? meta.note : "";
    const statusLabel = (status: string) => {
      const label = statusLabels[status];
      return label ? (isVi ? label.vi : label.en) : status;
    };

    switch (act.actionType) {
      case "CREATED":
        return (
          <>
            <CircleDot size={15} color={tokens.primary} />
            <span>{isVi ? "đã tạo mục này" : "created this work item"}</span>
          </>
        );
      case "ASSIGNED":
        return (
          <>
            <UserPlus size={15} color={tokens.textSecondary} />
            <span>
              {isVi ? "đã phân công cho " : "assigned "}
              <strong>
                @{assignedUser || (isVi ? "thành viên" : "someone")}
              </strong>
            </span>
          </>
        );
      case "STATUS_CHANGED":
        return (
          <>
            <RefreshCw size={15} color={tokens.warning} />
            <span>
              {isVi ? "đã đổi trạng thái từ " : "changed status from "}
              <strong style={{ fontWeight: 600, color: tokens.textPrimary }}>
                {statusLabel(fromStatus)}
              </strong>
              {isVi ? " sang " : " to "}
              <strong style={{ fontWeight: 600, color: tokens.textPrimary }}>
                {statusLabel(toStatus)}
              </strong>
            </span>
          </>
        );
      case "PR_LINKED":
        return (
          <>
            <LinkIcon size={15} color={tokens.info} />
            <span>
              {isVi ? "đã liên kết pull request " : "linked pull request "}
              <strong>#{prNumber}</strong>
            </span>
          </>
        );
      case "PR_MERGED":
        return (
          <>
            <GitMerge size={15} color="#a371f7" />
            <span>
              {isVi ? "đã gộp pull request " : "merged linked pull request "}
              <strong>#{prNumber}</strong>
            </span>
          </>
        );
      case "PR_UPDATED":
        return (
          <>
            <RefreshCw size={15} color={tokens.primary} />
            <span>
              {isVi ? "Pull Request " : "Pull Request "}
              <strong>#{prNumber}</strong>
              {isVi
                ? " có thay đổi mới từ mã nguồn"
                : " updated with new changes"}
              {toStatus
                ? ` (${isVi ? "trạng thái chuyển sang Chờ review" : "status changed to Pending"})`
                : ""}
            </span>
          </>
        );
      case "REVIEW_SUBMITTED":
        return (
          <>
            <Eye
              size={15}
              color={decision === "APPROVED" ? tokens.success : tokens.error}
            />
            <span>
              {isVi ? "đã gửi kết quả review: " : "submitted review decision: "}
              <strong>{decision}</strong>
              {note && ` ("${note}")`}
            </span>
          </>
        );
      case "EDITED": {
        const fields = Array.isArray(meta.fields)
          ? (meta.fields as string[])
              .map((field) => (isVi ? fieldLabels[field] || field : field))
              .slice(0, 3)
              .join(", ")
          : "";
        const fieldCount = Array.isArray(meta.fields) ? meta.fields.length : 0;
        return (
          <>
            <RefreshCw size={15} color={tokens.info} />
            <span>
              {isVi ? "đã chỉnh sửa nội dung" : "edited details"}
              {fields ? ` (${fields}${fieldCount > 3 ? ", …" : ""})` : ""}
            </span>
          </>
        );
      }
      case "DELETED":
      case "COMMENT_DELETED":
        return (
          <>
            <Trash2 size={15} color={tokens.error} />
            <span>{isVi ? "đã xóa mục này" : "deleted this item"}</span>
          </>
        );
      default:
        return (
          <>
            <RefreshCw size={15} color={tokens.textSecondary} />
            <span>{isVi ? "đã cập nhật thông tin" : "updated details"}</span>
          </>
        );
    }
  };

  return (
    <Box sx={{ my: 2 }}>
      {deduped.map((act) => (
        <Box
          key={act.id}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            py: 0.75,
            fontSize: "0.8125rem",
            color: tokens.textSecondary,
          }}
        >
          <UserAvatar user={act.actor} size={20} />
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.6,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontWeight: 600, color: tokens.textPrimary }}>
              {act.actor.displayName}
            </span>
            {renderAction(act)}
            <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>
              •{" "}
              {new Date(act.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </Box>
        </Box>
      ))}
    </Box>
  );
};
