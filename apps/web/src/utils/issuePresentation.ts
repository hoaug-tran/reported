import { IssueType, BugTemplateData } from "@reported/contracts";
import {
  Bug,
  Lightbulb,
  HelpCircle,
  MessageSquare,
  CheckSquare,
  LucideIcon,
} from "lucide-react";

export type IssueKind = "BUG" | "PROPOSAL" | "QUESTION" | "DISCUSSION" | "TASK";

export interface IssuePresentation {
  kind: IssueKind;
  icon: LucideIcon;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  isBug: boolean;
  showSeverity: boolean;
  showBugDetails: boolean;
}

export function hasActualBugDetails(
  bugDetails?: BugTemplateData | null,
): boolean {
  if (!bugDetails) return false;
  return Boolean(
    bugDetails.stepsToReproduce?.trim() ||
      bugDetails.actualResult?.trim() ||
      bugDetails.expectedResult?.trim() ||
      bugDetails.environment?.trim() ||
      bugDetails.precondition?.trim() ||
      bugDetails.evidenceJsonOrLogs?.trim(),
  );
}

export function getIssuePresentation(
  issue: {
    type?: IssueType | string;
    labels?: Array<{ name: string }> | string[];
    bugDetails?: BugTemplateData | null;
  },
  isVi: boolean,
): IssuePresentation {
  const rawLabels = issue.labels || [];
  const labelNames = rawLabels.map((l) =>
    (typeof l === "string" ? l : l.name || "").toLowerCase().trim(),
  );

  const isBugType = issue.type === IssueType.BUG || issue.type === "BUG";

  if (isBugType) {
    return {
      kind: "BUG",
      icon: Bug,
      label: isVi ? "Báo lỗi" : "Bug Report",
      color: "#ef4444",
      bgColor: "rgba(239, 68, 68, 0.12)",
      borderColor: "rgba(239, 68, 68, 0.35)",
      isBug: true,
      showSeverity: true,
      showBugDetails: hasActualBugDetails(issue.bugDetails),
    };
  }

  const isFeature =
    issue.type === IssueType.FEATURE ||
    issue.type === "FEATURE" ||
    labelNames.includes("proposal");

  if (isFeature) {
    return {
      kind: "PROPOSAL",
      icon: Lightbulb,
      label: isVi ? "Đề xuất (RFC)" : "Proposal (RFC)",
      color: "#10b981",
      bgColor: "rgba(16, 185, 129, 0.12)",
      borderColor: "rgba(16, 185, 129, 0.35)",
      isBug: false,
      showSeverity: false,
      showBugDetails: false,
    };
  }

  if (labelNames.includes("question")) {
    return {
      kind: "QUESTION",
      icon: HelpCircle,
      label: isVi ? "Hỏi kỹ thuật" : "Question",
      color: "#3b82f6",
      bgColor: "rgba(59, 130, 246, 0.12)",
      borderColor: "rgba(59, 130, 246, 0.35)",
      isBug: false,
      showSeverity: false,
      showBugDetails: false,
    };
  }

  if (labelNames.includes("discussion")) {
    return {
      kind: "DISCUSSION",
      icon: MessageSquare,
      label: isVi ? "Thảo luận" : "Discussion",
      color: "#06b6d4",
      bgColor: "rgba(6, 182, 212, 0.12)",
      borderColor: "rgba(6, 182, 212, 0.35)",
      isBug: false,
      showSeverity: false,
      showBugDetails: false,
    };
  }

  return {
    kind: "TASK",
    icon: CheckSquare,
    label: isVi ? "Công việc" : "Task",
    color: "#8b5cf6",
    bgColor: "rgba(139, 92, 246, 0.12)",
    borderColor: "rgba(139, 92, 246, 0.35)",
    isBug: false,
    showSeverity: false,
    showBugDetails: false,
  };
}
