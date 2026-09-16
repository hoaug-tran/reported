import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  MenuItem,
  Chip,
  Grid,
  Alert,
  Tooltip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  CircularProgress,
  Collapse,
  Divider,
} from "@mui/material";
import { Page } from "../components/common/Page";
import { toast } from "../contexts/ToastContext";
import {
  Bug,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  Link,
  Code,
  ListOrdered,
  Sliders,
  HelpCircle,
  Lightbulb,
  AlertTriangle,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  FolderGit2,
  GitPullRequest,
  GitBranch,
  Lock,
  Globe,
  Sparkles,
  Layers,
  FileCode,
  Table,
  Check,
  ShieldCheck,
  Zap,
  Wrench,
  Compass,
  FileText,
} from "lucide-react";
import { useLocation } from "wouter";
import { useThemeContext } from "../contexts/ThemeContext";
import { useWorkspace } from "../contexts/WorkspaceContext";
import { useI18n } from "../contexts/I18nContext";
import { apiFetch } from "../api/client";
import { MarkdownEditor } from "../components/editor/MarkdownEditor";
import { getLabelColor } from "../utils/labels";
import {
  IssueType,
  IssuePriority,
  IssueSeverity,
  BugFrequency,
  UserSummaryDto,
  RepositoryDto,
  PullRequestSummaryDto,
} from "@reported/contracts";

interface LivePullRequest {
  number: number;
  title: string;
  state?: string;
  headBranch: string;
  baseBranch: string;
  headSha?: string;
  authorLogin?: string;
  authorAvatar?: string;
  htmlUrl: string;
  isDraft?: boolean;
}

const PROPOSAL_CATEGORIES = [
  { id: "architecture", labelVi: "Kiến trúc", labelEn: "Architecture", icon: Layers, color: "#6366f1" },
  { id: "feature", labelVi: "Tính năng", labelEn: "Feature", icon: Sparkles, color: "#10b981" },
  { id: "performance", labelVi: "Hiệu năng", labelEn: "Performance", icon: Zap, color: "#f59e0b" },
  { id: "refactoring", labelVi: "Tái cấu trúc", labelEn: "Refactoring", icon: Wrench, color: "#8b5cf6" },
  { id: "security", labelVi: "Bảo mật", labelEn: "Security", icon: ShieldCheck, color: "#ef4444" },
  { id: "tooling", labelVi: "Quy trình / DX", labelEn: "Tooling / DX", icon: Compass, color: "#06b6d4" },
];

export const CreateIssuePage: React.FC = () => {
  const { tokens } = useThemeContext();
  const { t, language } = useI18n();
  const { activeWorkspace, projects } = useWorkspace();
  const [, setLocation] = useLocation();
  const isVi = language === "vi";

  const searchParams = new URLSearchParams(window.location.search);
  const intentParam = searchParams.get("intent") || "bug";
  const isProposal = intentParam === "idea" || intentParam === "discussion";
  const isFromPosts =
    isProposal ||
    intentParam === "question" ||
    intentParam === "help" ||
    searchParams.get("from") === "posts";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [proposalCategory, setProposalCategory] = useState<string>("architecture");
  const [problemStatement, setProblemStatement] = useState<string>("");
  const [proposalScope, setProposalScope] = useState<string>("system");
  const [alternativesText, setAlternativesText] = useState<string>("");
  const [risksText, setRisksText] = useState<string>("");
  const [showAlternatives, setShowAlternatives] = useState<boolean>(false);

  const [type, setType] = useState<IssueType>(
    intentParam === "question"
      ? IssueType.TASK
      : intentParam === "idea"
        ? IssueType.FEATURE
        : intentParam === "discussion"
          ? IssueType.TASK
          : IssueType.BUG,
  );
  const [priority, setPriority] = useState<IssuePriority>(
    intentParam === "help" ? IssuePriority.P0 : IssuePriority.P2,
  );
  const [severity, setSeverity] = useState<IssueSeverity>(IssueSeverity.MAJOR);

  const [showPrLink, setShowPrLink] = useState(intentParam !== "question");
  const [showBugDetails, setShowBugDetails] = useState(
    intentParam === "bug" || intentParam === "help",
  );
  const [showEnvDetails, setShowEnvDetails] = useState(
    intentParam === "bug" || intentParam === "help",
  );
  const [showMetadata, setShowMetadata] = useState(true);

  const [projectId, setProjectId] = useState<string>("");
  const [repositoryId, setRepositoryId] = useState<string>("");
  const [branch, setBranch] = useState("");
  const [commitHash, setCommitHash] = useState("");
  const [prUrl, setPrUrl] = useState("");

  const [environment, setEnvironment] = useState("");
  const [precondition, setPrecondition] = useState("");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [actualResult, setActualResult] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [frequency, setFrequency] = useState<BugFrequency>(BugFrequency.ALWAYS);
  const [evidenceJsonOrLogs, setEvidenceJsonOrLogs] = useState("");

  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>(
    intentParam === "question"
      ? ["question"]
      : intentParam === "idea"
        ? ["proposal", "architecture"]
        : intentParam === "help"
          ? ["urgent", "blocker"]
          : intentParam === "discussion"
            ? ["discussion", "architecture"]
            : ["bug"],
  );

  const [usersList, setUsersList] = useState<UserSummaryDto[]>([]);
  const [repositoriesList, setRepositoriesList] = useState<RepositoryDto[]>([]);
  const [prPreview, setPrPreview] = useState<PullRequestSummaryDto | null>(
    null,
  );
  const [livePulls, setLivePulls] = useState<LivePullRequest[]>([]);
  const [selectedPr, setSelectedPr] = useState<LivePullRequest | null>(null);
  const [loadingLivePulls, setLoadingLivePulls] = useState(false);
  const [livePullsError, setLivePullsError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const setErrorMsg = (msg: string | null) => {
    if (msg) toast.error(msg);
  };
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("reported_issue_draft");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title) setTitle(parsed.title);
        if (parsed.description) setDescription(parsed.description);
        if (parsed.type) setType(parsed.type);
        if (parsed.priority) setPriority(parsed.priority);
        if (parsed.severity) setSeverity(parsed.severity);
        if (parsed.proposalCategory) setProposalCategory(parsed.proposalCategory);
        if (parsed.problemStatement) setProblemStatement(parsed.problemStatement);
        if (parsed.proposalScope) setProposalScope(parsed.proposalScope);
        if (parsed.alternativesText) {
          setAlternativesText(parsed.alternativesText);
          setShowAlternatives(true);
        }
        if (parsed.risksText) {
          setRisksText(parsed.risksText);
          setShowAlternatives(true);
        }
        if (parsed.environment) {
          setEnvironment(parsed.environment);
          setShowEnvDetails(true);
        }
        if (parsed.stepsToReproduce) {
          setStepsToReproduce(parsed.stepsToReproduce);
          setShowBugDetails(true);
        }
        if (parsed.actualResult) setActualResult(parsed.actualResult);
        if (parsed.expectedResult) setExpectedResult(parsed.expectedResult);
        if (parsed.prUrl) {
          setPrUrl(parsed.prUrl);
          setShowPrLink(true);
        }
        if (parsed.selectedLabels) setSelectedLabels(parsed.selectedLabels);
        setLastSaved(parsed.savedAt || null);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (title || description || stepsToReproduce || problemStatement) {
        const payload = {
          title,
          description,
          type,
          priority,
          severity,
          environment,
          stepsToReproduce,
          actualResult,
          expectedResult,
          prUrl,
          selectedLabels,
          proposalCategory,
          problemStatement,
          proposalScope,
          alternativesText,
          risksText,
          savedAt: new Date().toLocaleTimeString(),
        };
        localStorage.setItem("reported_issue_draft", JSON.stringify(payload));
        setLastSaved(payload.savedAt);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [
    title,
    description,
    type,
    priority,
    severity,
    environment,
    stepsToReproduce,
    actualResult,
    expectedResult,
    prUrl,
    selectedLabels,
    proposalCategory,
    problemStatement,
    proposalScope,
    alternativesText,
    risksText,
  ]);

  useEffect(() => {
    const fetchMetadata = async () => {
      if (!activeWorkspace) return;
      try {
        const [membersRes, rRes] = await Promise.all([
          apiFetch<
            Array<{
              userId: string;
              username: string;
              displayName: string;
              avatarUrl?: string | null;
              role: string;
            }>
          >(`/workspaces/${activeWorkspace.id}/members`),
          apiFetch<RepositoryDto[]>("/github/repositories"),
        ]);
        const mappedUsers: UserSummaryDto[] = (membersRes || []).map((m) => ({
          id: m.userId,
          username: m.username,
          displayName: m.displayName,
          avatarUrl: m.avatarUrl,
          email: "",
          role: m.role as any,
        }));
        setUsersList(mappedUsers);
        setRepositoriesList(rRes || []);
      } catch {}
    };
    fetchMetadata();
  }, [activeWorkspace?.id]);

  useEffect(() => {
    if (projects.length > 0 && !projectId) {
      setProjectId(projects[0].id);
    }
  }, [projects, projectId]);

  useEffect(() => {
    if (repositoriesList.length > 0 && !repositoryId) {
      setRepositoryId(repositoriesList[0].id);
    }
  }, [repositoriesList, projectId, repositoryId]);

  useEffect(() => {
    if (!repositoryId || !showPrLink) {
      setLivePulls([]);
      setSelectedPr(null);
      return;
    }
    const fetchLivePulls = async () => {
      setLoadingLivePulls(true);
      setLivePullsError(null);
      try {
        const data = await apiFetch<{
          pulls: LivePullRequest[];
          error?: string;
        }>(`/github/repositories/${repositoryId}/github-pulls`);
        const openPulls = (data.pulls || []).filter((p: LivePullRequest) => {
          const s = (p.state || "").toLowerCase();
          return s === "open" || s === "opened";
        });
        setLivePulls(openPulls);
        if (data.error) setLivePullsError(data.error);
      } catch {
        setLivePulls([]);
        setLivePullsError(
          isVi
            ? "Không tải được Pull Request từ GitHub."
            : "Failed to load Pull Requests from GitHub.",
        );
      } finally {
        setLoadingLivePulls(false);
      }
    };
    fetchLivePulls();
  }, [repositoryId, showPrLink]);

  useEffect(() => {
    if (!selectedPr) return;
    if (!title.trim()) setTitle(`#${selectedPr.number}: ${selectedPr.title}`);
    if (selectedPr.headBranch) setBranch(selectedPr.headBranch);
    if (selectedPr.headSha) setCommitHash(selectedPr.headSha);
    if (selectedPr.htmlUrl) setPrUrl(selectedPr.htmlUrl);
  }, [selectedPr]);

  useEffect(() => {
    if (!prUrl) {
      setPrPreview(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const preview = await apiFetch<PullRequestSummaryDto>(
          `/github/preview-pr?url=${encodeURIComponent(prUrl)}`,
        );
        setPrPreview(preview);
        if (
          (preview as unknown as { repository?: { fullName: string } })
            .repository
        ) {
          const matched = repositoriesList.find(
            (r) =>
              r.fullName ===
              (preview as unknown as { repository: { fullName: string } })
                .repository.fullName,
          );
          if (matched) setRepositoryId(matched.id);
        }
        if (preview.headBranch) setBranch(preview.headBranch);
      } catch {
        setPrPreview(null);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [prUrl, repositoriesList]);

  const handleSelectProposalCategory = (catId: string) => {
    setProposalCategory(catId);
    setSelectedLabels((prev) => {
      const filtered = prev.filter(
        (l) =>
          l !== "architecture" &&
          l !== "feature" &&
          l !== "performance" &&
          l !== "refactoring" &&
          l !== "security" &&
          l !== "tooling",
      );
      return Array.from(new Set([...filtered, "proposal", catId]));
    });
  };

  const loadRfcTemplate = () => {
    const template = `## 1. Bối cảnh & Động lực (Context & Motivation)
Mô tả rõ ràng vấn đề hoặc điểm nghẽn hiện tại:
${problemStatement ? `> ${problemStatement}\n\n` : ""}- Hiện tại hệ thống đang gặp hạn chế...
- Mục tiêu chính: giải quyết triệt để vấn đề trên.

## 2. Giải pháp Kiến trúc Đề xuất (Proposed Solution)
Trình bày chi tiết giải pháp kỹ thuật, luồng dữ liệu hoặc cấu trúc mới:

\`\`\`mermaid
flowchart TD
    Client[Client / Web UI] --> API[API Gateway / Router]
    API --> Service[Core Service Module]
    Service --> Cache[(Redis Cache)]
    Service --> DB[(PostgreSQL)]
\`\`\`

### Các thay đổi chính:
1. **Component A**: Tách rời logic xử lý và tối ưu truy vấn.
2. **Component B**: Bổ sung bộ đệm (cache) tự động invalidate.

## 3. Lợi ích & Giá trị Dự kiến (Expected Impact)
| Tiêu chí | Trước khi áp dụng | Sau khi áp dụng |
| :--- | :--- | :--- |
| **Hiệu năng / Tốc độ** | Chậm khi tải nhiều bản ghi | Nhanh hơn 70%, phản hồi < 200ms |
| **Khả năng mở rộng** | Khó mở rộng module | Module hóa độc lập, dễ test |

## 4. Các Phương án Thay thế & Đánh đổi (Alternatives & Trade-offs)
- **Phương án A**: Giữ nguyên giải pháp cũ và tăng cấu hình phần cứng (Chi phí cao, không triệt để).
- **Phương án B (Được chọn)**: Tái cấu trúc theo thiết kế mới (Bền vững, tối ưu tài nguyên).

## 5. Rủi ro & Kế hoạch Triển khai (Risks & Rollout Plan)
- [ ] Giai đoạn 1: Thiết kế schema & contracts
- [ ] Giai đoạn 2: Triển khai kiểm thử nội bộ (dogfooding)
- [ ] Giai đoạn 3: Ra mắt toàn bộ hệ thống
`;
    setDescription(template);
    toast.success(isVi ? "Đã nạp mẫu RFC chuẩn" : "Standard RFC template loaded");
  };

  const insertMermaidDiagram = () => {
    const diagram = `\n\`\`\`mermaid\nflowchart TD\n    A[Client / UI] --> B[API Router]\n    B --> C{Xác thực}\n    C -->|Hợp lệ| D[Business Logic]\n    C -->|Lỗi| E[401 Unauthorized]\n\`\`\`\n`;
    setDescription((prev) => prev + diagram);
  };

  const insertDrawioDiagram = () => {
    const diagram = `\n\`\`\`drawio\n<mxfile host="app.diagrams.net">\n  <diagram name="Kiến trúc đề xuất" id="diag-rfc">\n    <mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="827" pageHeight="1169">\n      <root>\n        <mxCell id="0" />\n        <mxCell id="1" parent="0" />\n        <mxCell id="c1" value="Frontend (Client)" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#dae8fc;strokeColor=#6c8ebf;" vertex="1" parent="1">\n          <mxGeometry x="100" y="100" width="140" height="60" as="geometry" />\n        </mxCell>\n        <mxCell id="c2" value="API Gateway" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#d5e8d4;strokeColor=#82b366;" vertex="1" parent="1">\n          <mxGeometry x="320" y="100" width="140" height="60" as="geometry" />\n        </mxCell>\n        <mxCell id="c3" value="Microservice / Core" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#fff2cc;strokeColor=#d6b656;" vertex="1" parent="1">\n          <mxGeometry x="540" y="100" width="140" height="60" as="geometry" />\n        </mxCell>\n        <mxCell id="e1" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;" edge="1" parent="1" source="c1" target="c2">\n          <mxGeometry relative="1" as="geometry" />\n        </mxCell>\n        <mxCell id="e2" style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;" edge="1" parent="1" source="c2" target="c3">\n          <mxGeometry relative="1" as="geometry" />\n        </mxCell>\n      </root>\n    </mxGraphModel>\n  </diagram>\n</mxfile>\n\`\`\`\n`;
    setDescription((prev) => prev + diagram);
  };

  const insertImpactTable = () => {
    const table = `\n| Tiêu chí | Hiện tại | Đề xuất mới |\n| :--- | :--- | :--- |\n| Hiệu năng | Trung bình | Tối ưu |\n| Độ phức tạp | Cao | Thấp |\n`;
    setDescription((prev) => prev + table);
  };

  const handleClearDraft = () => {
    localStorage.removeItem("reported_issue_draft");
    setTitle("");
    setDescription("");
    setProblemStatement("");
    setAlternativesText("");
    setRisksText("");
    setEnvironment("");
    setPrecondition("");
    setStepsToReproduce("");
    setActualResult("");
    setExpectedResult("");
    setEvidenceJsonOrLogs("");
    setPrUrl("");
    setLastSaved(null);
  };

  const handleInsertLogSnippet = () => {
    const snippet =
      "\n```\nPaste stacktrace, terminal output, or logs here\n\n```\n";
    setDescription((prev) => prev + snippet);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg(
        isVi ? "Vui lòng nhập tiêu đề bài viết" : "Please enter a title",
      );
      return;
    }

    let finalDesc = description.trim();
    let bugDetailsPayload = null;

    if (isProposal) {
      if (
        problemStatement.trim() &&
        !finalDesc.toLowerCase().includes("bối cảnh") &&
        !finalDesc.toLowerCase().includes("context")
      ) {
        finalDesc =
          `> **${isVi ? "Vấn đề cốt lõi" : "Core Problem"}**: ${problemStatement.trim()}\n\n` +
          finalDesc;
      }
      if (
        alternativesText.trim() &&
        !finalDesc.toLowerCase().includes("phương án thay thế") &&
        !finalDesc.toLowerCase().includes("alternatives")
      ) {
        finalDesc += `\n\n### ${isVi ? "Phương án thay thế đã xem xét" : "Alternatives Considered"}\n${alternativesText.trim()}`;
      }
      if (
        risksText.trim() &&
        !finalDesc.toLowerCase().includes("rủi ro") &&
        !finalDesc.toLowerCase().includes("risks")
      ) {
        finalDesc += `\n\n### ${isVi ? "Rủi ro & Biện pháp giảm thiểu" : "Risks & Mitigations"}\n${risksText.trim()}`;
      }
    } else if (
      stepsToReproduce.trim() ||
      actualResult.trim() ||
      expectedResult.trim()
    ) {
      bugDetailsPayload = {
        environment: environment || "Default Environment",
        precondition,
        stepsToReproduce: stepsToReproduce.trim() || "See description",
        actualResult: actualResult.trim() || "See description",
        expectedResult: expectedResult.trim() || "See description",
        frequency,
        evidenceJsonOrLogs,
      };

      if (!finalDesc) {
        finalDesc = `### Steps to reproduce:\n${stepsToReproduce}\n\n### Actual:\n${actualResult}\n\n### Expected:\n${expectedResult}`;
      }
    }

    if (!finalDesc) {
      setErrorMsg(
        isVi
          ? "Vui lòng nhập nội dung mô tả hoặc đính kèm các bước tái hiện"
          : "Please enter a description or reproduction steps",
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiFetch<{ id: string; number: number }>("/issues", {
        method: "POST",
        body: JSON.stringify({
          workspaceId: activeWorkspace?.id,
          projectId: projectId || undefined,
          title: title.trim(),
          description: finalDesc,
          type,
          priority,
          severity,
          labels: selectedLabels,
          assigneeIds,
          repositoryId: repositoryId || undefined,
          prUrl: prUrl.trim() || undefined,
          branch: branch.trim() || undefined,
          commitHash: commitHash.trim() || undefined,
          bugDetails: bugDetailsPayload,
        }),
      });

      localStorage.removeItem("reported_issue_draft");
      setLocation(`/issues/${res.number}`);
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ||
            "Không thể tạo bài viết. Vui lòng thử lại.";
      setErrorMsg(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleLabel = (lbl: string) => {
    if (selectedLabels.includes(lbl)) {
      setSelectedLabels(selectedLabels.filter((l) => l !== lbl));
    } else {
      setSelectedLabels([...selectedLabels, lbl]);
    }
  };

  const intentCopy = {
    bug: {
      icon: <Bug size={24} color="#ef4444" />,
      title: isVi ? "Báo lỗi" : "Report Bug",
      placeholder: isVi
        ? "Ví dụ: Lưu hồ sơ lỗi 500 khi thiếu ảnh đại diện"
        : "e.g., Saving profile returns 500 when avatar is missing",
      body: isVi
        ? "Lỗi xảy ra ở đâu? Bạn đã làm gì trước đó? Có log hoặc ảnh chụp thì dán luôn."
        : "Where does it fail? What happened before it? Paste logs or screenshots if available.",
    },
    question: {
      icon: <HelpCircle size={24} color="#3b82f6" />,
      title: isVi ? "Hỏi kỹ thuật" : "Ask Question",
      placeholder: isVi
        ? "Ví dụ: Refresh token khi nhiều request gọi cùng lúc nên xử lý thế nào?"
        : "e.g., How should token refresh work when many requests run together?",
      body: isVi
        ? "Nêu bối cảnh, điều đã thử và chỗ đang phân vân. Repo liên quan sẽ được gắn tự động nếu chọn bên dưới."
        : "Share context, what you tried, and what feels unclear. Pick related repo below if needed.",
    },
    idea: {
      icon: <Lightbulb size={24} color="#10b981" />,
      title: isVi ? "Tạo đề xuất / Cải tiến (RFC)" : "New Proposal / RFC",
      placeholder: isVi
        ? "Ví dụ: RFC - Tách notification worker và bổ sung Redis cache phân tán"
        : "e.g., RFC - Decouple notification worker and add distributed Redis cache",
      body: isVi
        ? "Mô tả bối cảnh, kiến trúc đề xuất và giá trị mang lại. Sử dụng mẫu RFC chuẩn bên dưới để có cấu trúc tối ưu."
        : "Describe context, proposed architecture, and expected impact. Use the standard RFC template below.",
    },
    help: {
      icon: <AlertTriangle size={24} color="#f59e0b" />,
      title: isVi ? "Cần hỗ trợ gấp" : "Urgent Help",
      placeholder: isVi
        ? "Ví dụ: Staging không deploy được sau migration auth"
        : "e.g., Staging cannot deploy after auth migration",
      body: isVi
        ? "Nói rõ mức độ ảnh hưởng, log mới nhất và ai cần vào xử lý ngay."
        : "State impact, latest logs, and who should jump in now.",
    },
    discussion: {
      icon: <MessageSquare size={24} color="#06b6d4" />,
      title: isVi ? "Thảo luận kiến trúc hệ thống" : "Architecture Discussion",
      placeholder: isVi
        ? "Ví dụ: Tách notification worker ra service riêng hay giữ trong API?"
        : "e.g., Split notification worker into its own service or keep it in API?",
      body: isVi
        ? "Đưa các phương án, trade-off và quyết định cần chốt. Giữ ngắn để mọi người phản hồi nhanh."
        : "List options, trade-offs, and the decision needed. Keep it short so people can respond fast.",
    },
  };
  const copy =
    intentCopy[
      (intentParam as keyof typeof intentCopy) in intentCopy
        ? (intentParam as keyof typeof intentCopy)
        : "bug"
    ];
  const headerTitle = copy.title;
  const titlePlaceholder = copy.placeholder;

  return (
    <Page variant="form">
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Tooltip title={isVi ? "Quay lại" : "Back"}>
            <IconButton
              onClick={() => setLocation(isFromPosts ? "/posts" : "/issues")}
              sx={{ border: `1px solid ${tokens.border}` }}
            >
              <ArrowLeft size={18} />
            </IconButton>
          </Tooltip>
          <Box>
            <Typography
              variant="h5"
              sx={{ fontWeight: 700, color: tokens.textPrimary }}
            >
              {headerTitle}
            </Typography>
          </Box>
        </Box>

        {lastSaved && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              icon={<CheckCircle2 size={14} color="#10b981" />}
              label={`${isVi ? "Đã lưu nháp" : "Draft saved"} ${lastSaved}`}
              size="small"
              sx={{
                backgroundColor: tokens.surfaceSecondary,
                color: tokens.textSecondary,
                fontSize: "0.75rem",
              }}
            />
            <Tooltip title={isVi ? "Xóa bản nháp" : "Clear draft"}>
              <IconButton
                size="small"
                onClick={handleClearDraft}
                sx={{ color: tokens.textSecondary }}
              >
                <Trash2 size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      <form onSubmit={handleSubmit}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 3, md: 3.5 },
            borderRadius: "8px",
            border: `1px solid ${tokens.border}`,
            backgroundColor: tokens.surface,
            mb: 3,
          }}
        >
          {isProposal && (
            <Box sx={{ mb: 2.5 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: tokens.textSecondary,
                  display: "block",
                  mb: 1,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {isVi ? "Phân loại đề xuất:" : "Proposal Category:"}
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {PROPOSAL_CATEGORIES.map((cat) => {
                  const isSelected = proposalCategory === cat.id;
                  const IconComp = cat.icon;
                  return (
                    <Chip
                      key={cat.id}
                      icon={<IconComp size={15} color={isSelected ? "#fff" : cat.color} />}
                      label={isVi ? cat.labelVi : cat.labelEn}
                      clickable
                      onClick={() => handleSelectProposalCategory(cat.id)}
                      sx={{
                        backgroundColor: isSelected ? cat.color : tokens.surfaceSecondary,
                        color: isSelected ? "#fff" : tokens.textPrimary,
                        border: `1px solid ${isSelected ? cat.color : tokens.border}`,
                        fontWeight: isSelected ? 700 : 500,
                        px: 0.5,
                        py: 1.8,
                        borderRadius: "8px",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        "&:hover": {
                          backgroundColor: isSelected ? cat.color : tokens.surface,
                          borderColor: cat.color,
                        },
                        "& .MuiChip-icon": {
                          color: isSelected ? "#fff" : cat.color,
                        },
                      }}
                    />
                  );
                })}
              </Box>
            </Box>
          )}

          <TextField
            fullWidth
            label={isVi ? "Tiêu đề bài viết" : "Issue Title"}
            placeholder={titlePlaceholder}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            variant="outlined"
            required
            autoFocus
            InputLabelProps={{ shrink: true }}
            sx={{
              mb: 2.5,
              "& .MuiOutlinedInput-root": {
                fontSize: "0.95rem",
                fontWeight: 600,
                borderRadius: "8px",
              },
              "& input::placeholder": {
                fontSize: "0.875rem !important",
                fontWeight: "400 !important",
                color: `${tokens.textSecondary} !important`,
                opacity: "0.7 !important",
              },
            }}
          />

          {isProposal && (
            <TextField
              fullWidth
              label={isVi ? "Vấn đề cốt lõi / Động lực đề xuất" : "Core Problem / Motivation"}
              placeholder={
                isVi
                  ? "Tóm tắt ngắn gọn khó khăn, điểm nghẽn hoặc lý do cần thực hiện đề xuất này..."
                  : "Briefly explain the bottleneck, friction, or motivation behind this proposal..."
              }
              value={problemStatement}
              onChange={(e) => setProblemStatement(e.target.value)}
              variant="outlined"
              size="small"
              multiline
              rows={2}
              InputLabelProps={{ shrink: true }}
              sx={{
                mb: 2.5,
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                },
              }}
            />
          )}

          {isProposal && (
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 1,
                mb: 1.5,
              }}
            >
              <Button
                size="small"
                variant="outlined"
                startIcon={<FileText size={14} />}
                onClick={loadRfcTemplate}
                sx={{
                  borderRadius: "8px",
                  textTransform: "none",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: tokens.primary,
                  borderColor: tokens.primary,
                  "&:hover": {
                    backgroundColor: tokens.surfaceSecondary,
                  },
                }}
              >
                {isVi ? "Nạp mẫu RFC chuẩn" : "Load RFC Template"}
              </Button>

              <Button
                size="small"
                variant="outlined"
                startIcon={<Layers size={14} />}
                onClick={insertMermaidDiagram}
                sx={{
                  borderRadius: "8px",
                  textTransform: "none",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                {isVi ? "Sơ đồ kiến trúc (Mermaid)" : "Architecture Diagram"}
              </Button>

              <Button
                size="small"
                variant="outlined"
                startIcon={<FileCode size={14} />}
                onClick={insertDrawioDiagram}
                sx={{
                  borderRadius: "8px",
                  textTransform: "none",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#f97316",
                  borderColor: "#f9731640",
                  "&:hover": {
                    borderColor: "#f97316",
                    backgroundColor: "#f9731610",
                  },
                }}
              >
                {isVi ? "Sơ đồ Draw.io" : "Draw.io Diagram"}
              </Button>

              <Button
                size="small"
                variant="outlined"
                startIcon={<Table size={14} />}
                onClick={insertImpactTable}
                sx={{
                  borderRadius: "8px",
                  textTransform: "none",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                {isVi ? "Bảng so sánh tác động" : "Impact Table"}
              </Button>

              <Button
                size="small"
                variant={showAlternatives ? "contained" : "outlined"}
                startIcon={<Sliders size={14} />}
                onClick={() => setShowAlternatives((prev) => !prev)}
                sx={{
                  borderRadius: "8px",
                  textTransform: "none",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                {showAlternatives
                  ? isVi
                    ? "Đang mở: Phương án phụ & Rủi ro"
                    : "Alternatives & Risks open"
                  : isVi
                    ? "Phương án phụ & Rủi ro"
                    : "Alternatives & Risks"}
              </Button>
            </Box>
          )}

          <Collapse in={isProposal && showAlternatives}>
            <Box
              sx={{
                p: 2.5,
                mb: 2.5,
                borderRadius: "8px",
                backgroundColor: tokens.surfaceSecondary,
                border: `1px solid ${tokens.border}`,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: tokens.textPrimary }}
              >
                {isVi
                  ? "Phương án phụ & Đánh giá rủi ro (Tùy chọn)"
                  : "Alternatives & Risks (Optional)"}
              </Typography>
              <TextField
                fullWidth
                label={
                  isVi
                    ? "Các phương án thay thế đã xem xét"
                    : "Alternatives Considered"
                }
                placeholder={
                  isVi
                    ? "Tại sao chọn phương án này thay vì các giải pháp khác?"
                    : "Why choose this approach over other alternatives?"
                }
                value={alternativesText}
                onChange={(e) => setAlternativesText(e.target.value)}
                multiline
                rows={2}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                fullWidth
                label={
                  isVi
                    ? "Rủi ro tiềm ẩn & Biện pháp giảm thiểu"
                    : "Potential Risks & Mitigations"
                }
                placeholder={
                  isVi
                    ? "Có rủi ro breaking change hay downtime không? Biện pháp kiểm soát?"
                    : "Any breaking changes or risks? How to mitigate them?"
                }
                value={risksText}
                onChange={(e) => setRisksText(e.target.value)}
                multiline
                rows={2}
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </Collapse>

          <Box sx={{ mb: 2 }}>
            <MarkdownEditor
              value={description}
              onChange={setDescription}
              placeholder={isVi ? copy.body : copy.body}
              minRows={6}
            />
          </Box>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 1,
              pt: 1,
              pb: 2,
              borderBottom: `1px solid ${tokens.divider}`,
              mb: 2,
            }}
          >
            <Button
              size="small"
              variant={showPrLink ? "contained" : "outlined"}
              startIcon={<Link size={15} />}
              onClick={() => setShowPrLink((prev) => !prev)}
              sx={{
                borderRadius: "8px",
                textTransform: "none",
                fontSize: "0.8rem",
                fontWeight: 600,
              }}
            >
              {showPrLink
                ? isVi
                  ? "Đã liên kết Repo/PR"
                  : "Repo/PR linked"
                : isVi
                  ? "Liên kết Repo/PR"
                  : "Link Repo/PR"}
            </Button>

            {!isProposal && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Code size={15} />}
                  onClick={handleInsertLogSnippet}
                  sx={{
                    borderRadius: "8px",
                    textTransform: "none",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                  }}
                >
                  {isVi ? "Chèn log / trace" : "Paste logs"}
                </Button>

                <Button
                  size="small"
                  variant={showBugDetails ? "contained" : "outlined"}
                  startIcon={<ListOrdered size={15} />}
                  onClick={() => setShowBugDetails((prev) => !prev)}
                  sx={{
                    borderRadius: "8px",
                    textTransform: "none",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                  }}
                >
                  {showBugDetails
                    ? isVi
                      ? "Các bước tái hiện"
                      : "Repro steps added"
                    : isVi
                      ? "Thêm bước tái hiện"
                      : "Add repro steps"}
                </Button>

                <Button
                  size="small"
                  variant={showEnvDetails ? "contained" : "outlined"}
                  startIcon={<Sliders size={15} />}
                  onClick={() => setShowEnvDetails((prev) => !prev)}
                  sx={{
                    borderRadius: "8px",
                    textTransform: "none",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                  }}
                >
                  {showEnvDetails
                    ? isVi
                      ? "Môi trường đã thêm"
                      : "Environment added"
                    : isVi
                      ? "Thêm môi trường"
                      : "Add environment"}
                </Button>
              </>
            )}

            <Button
              size="small"
              variant={showMetadata ? "contained" : "text"}
              startIcon={
                showMetadata ? (
                  <ChevronUp size={15} />
                ) : (
                  <ChevronDown size={15} />
                )
              }
              onClick={() => setShowMetadata((prev) => !prev)}
              sx={{
                borderRadius: "8px",
                textTransform: "none",
                fontSize: "0.8rem",
                fontWeight: 700,
                color: showMetadata ? "#fff" : tokens.textSecondary,
                "& svg": {
                  color: showMetadata ? "#fff" : tokens.textSecondary,
                  stroke: showMetadata ? "#fff" : tokens.textSecondary,
                },
              }}
            >
              {showMetadata
                ? isVi
                  ? "Ẩn phân loại"
                  : "Hide metadata"
                : isProposal
                  ? isVi
                    ? "Phạm vi & Người review"
                    : "Scope & Reviewers"
                  : isVi
                    ? "Người nhận & Phân loại"
                    : "Assignees & Metadata"}
            </Button>
          </Box>

          <Collapse in={showPrLink}>
            <Box
              sx={{
                p: 2,
                mb: 2.5,
                borderRadius: "8px",
                backgroundColor: tokens.surfaceSecondary,
                border: `1px solid ${tokens.border}`,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, mb: 1, color: tokens.textPrimary }}
              >
                {isVi
                  ? "Liên kết repo / Pull Request"
                  : "Link Repo / Pull Request"}
              </Typography>

              <FormControl fullWidth size="small" sx={{ mb: 1.5 }}>
                <InputLabel>
                  {isVi ? "Repository đã liên kết" : "Linked Repository"}
                </InputLabel>
                <Select
                  value={repositoryId}
                  label={isVi ? "Repository đã liên kết" : "Linked Repository"}
                  onChange={(e) => setRepositoryId(e.target.value)}
                >
                  {repositoriesList.length === 0 && (
                    <MenuItem value="" disabled>
                      {isVi
                        ? "Chưa có repository nào được liên kết"
                        : "No linked repositories yet"}
                    </MenuItem>
                  )}
                  {repositoriesList.map((repo) => (
                    <MenuItem key={repo.id} value={repo.id}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        {repo.isPrivate ? (
                          <Lock size={14} />
                        ) : (
                          <Globe size={14} />
                        )}
                        <span>{repo.fullName}</span>
                        <Chip
                          label={repo.defaultBranch}
                          size="small"
                          sx={{ height: 18, fontSize: "0.68rem" }}
                        />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {repositoryId && (
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 0.8 }}
                >
                  {loadingLivePulls ? (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        py: 1,
                        color: tokens.textSecondary,
                      }}
                    >
                      <CircularProgress size={14} />
                      <span>
                        {isVi
                          ? "Đang tải Pull Request..."
                          : "Loading Pull Requests..."}
                      </span>
                    </Box>
                  ) : livePullsError ? (
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                    >
                      <Alert
                        severity="warning"
                        sx={{
                          borderRadius: "6px",
                          fontSize: "0.8rem",
                          py: 0.5,
                        }}
                      >
                        {livePullsError}
                      </Alert>
                      {(livePullsError.toLowerCase().includes("token") ||
                        livePullsError.toLowerCase().includes("access")) && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() =>
                            setLocation("/settings/connected-accounts")
                          }
                          sx={{
                            alignSelf: "flex-start",
                            fontSize: "0.75rem",
                            textTransform: "none",
                            borderRadius: "6px",
                          }}
                        >
                          {isVi
                            ? "Đến trang Cài đặt để kết nối lại GitHub"
                            : "Go to Settings to Reconnect GitHub"}
                        </Button>
                      )}
                    </Box>
                  ) : livePulls.length === 0 ? (
                    <Alert
                      severity="info"
                      sx={{ borderRadius: "6px", fontSize: "0.8rem", py: 0.5 }}
                    >
                      {isVi
                        ? "Repo này chưa có Pull Request đang mở."
                        : "No open Pull Requests for this repository."}
                    </Alert>
                  ) : (
                    livePulls.map((pr) => {
                      const isSelected = selectedPr?.number === pr.number;
                      return (
                        <Box
                          key={pr.number}
                          onClick={() => setSelectedPr(isSelected ? null : pr)}
                          sx={{
                            p: 1.25,
                            borderRadius: "6px",
                            border: `1px solid ${isSelected ? tokens.primary : tokens.border}`,
                            backgroundColor: isSelected
                              ? tokens.primary
                              : tokens.surface,
                            color: isSelected
                              ? "#ffffff !important"
                              : tokens.textPrimary,
                            cursor: "pointer",
                            "& svg, & svg *": {
                              color: isSelected
                                ? "#ffffff !important"
                                : undefined,
                              stroke: isSelected
                                ? "#ffffff !important"
                                : undefined,
                            },
                            "&:hover": {
                              backgroundColor: isSelected
                                ? tokens.primaryHover
                                : tokens.hover,
                            },
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <GitPullRequest
                              size={14}
                              color={isSelected ? "#ffffff" : undefined}
                            />
                            <Typography
                              variant="body2"
                              sx={{
                                fontWeight: 700,
                                color: isSelected
                                  ? "#ffffff !important"
                                  : "inherit",
                              }}
                              noWrap
                            >
                              #{pr.number} {pr.title}
                            </Typography>
                            {pr.isDraft && (
                              <Chip
                                label="Draft"
                                size="small"
                                sx={{ height: 18 }}
                              />
                            )}
                          </Box>
                          <Typography
                            variant="caption"
                            sx={{
                              color: isSelected
                                ? "#ffffff !important"
                                : tokens.textSecondary,
                            }}
                          >
                            {pr.headBranch} → {pr.baseBranch}
                            {pr.authorLogin ? ` • @${pr.authorLogin}` : ""}
                          </Typography>
                        </Box>
                      );
                    })
                  )}
                </Box>
              )}
            </Box>
          </Collapse>

          <Collapse in={!isProposal && showBugDetails}>
            <Box
              sx={{
                p: 2.5,
                mb: 2.5,
                borderRadius: "8px",
                backgroundColor: tokens.surfaceSecondary,
                border: `1px solid ${tokens.border}`,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: tokens.textPrimary }}
              >
                {isVi
                  ? "Cấu trúc chi tiết tái hiện lỗi"
                  : "Reproduction Details"}
              </Typography>

              <TextField
                fullWidth
                multiline
                rows={3}
                label={isVi ? "Các bước tái hiện" : "Steps to reproduce"}
                placeholder={"1. Vào trang...\n2. Bấm nút...\n3. Nhìn thấy..."}
                value={stepsToReproduce}
                onChange={(e) => setStepsToReproduce(e.target.value)}
              />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label={isVi ? "Kết quả thực tế" : "Actual result"}
                    placeholder={
                      isVi
                        ? "Ứng dụng phản hồi 500..."
                        : "App returns 500 error..."
                    }
                    value={actualResult}
                    onChange={(e) => setActualResult(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label={isVi ? "Kết quả mong đợi" : "Expected result"}
                    placeholder={
                      isVi
                        ? "Phải hiển thị thông báo validation rõ ràng..."
                        : "Should display clean validation message..."
                    }
                    value={expectedResult}
                    onChange={(e) => setExpectedResult(e.target.value)}
                  />
                </Grid>
              </Grid>
            </Box>
          </Collapse>

          <Collapse in={!isProposal && showEnvDetails}>
            <Box
              sx={{
                p: 2.5,
                mb: 2.5,
                borderRadius: "8px",
                backgroundColor: tokens.surfaceSecondary,
                border: `1px solid ${tokens.border}`,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, color: tokens.textPrimary }}
              >
                {isVi ? "Môi trường hệ thống" : "Environment & Setup"}
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={8}>
                  <TextField
                    fullWidth
                    size="small"
                    label={
                      isVi ? "Môi trường / Phiên bản" : "Environment / Version"
                    }
                    placeholder="e.g. Node 22, Docker, Chrome 128, macOS"
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{isVi ? "Tần suất" : "Frequency"}</InputLabel>
                    <Select
                      value={frequency}
                      label={isVi ? "Tần suất" : "Frequency"}
                      onChange={(e) =>
                        setFrequency(e.target.value as BugFrequency)
                      }
                    >
                      <MenuItem value={BugFrequency.ALWAYS}>
                        {isVi ? "Luôn luôn (100%)" : "Always (100%)"}
                      </MenuItem>
                      <MenuItem value={BugFrequency.OFTEN}>
                        {isVi ? "Thường xuyên" : "Often (> 50%)"}
                      </MenuItem>
                      <MenuItem value={BugFrequency.SOMETIMES}>
                        {isVi ? "Thỉnh thoảng" : "Sometimes"}
                      </MenuItem>
                      <MenuItem value={BugFrequency.RARE}>
                        {isVi ? "Hiếm khi" : "Rare"}
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>
          </Collapse>

          <Collapse in={showMetadata}>
            <Box
              sx={{
                p: 2.5,
                mb: 2.5,
                borderRadius: "8px",
                backgroundColor: tokens.surfaceSecondary,
                border: `1px solid ${tokens.border}`,
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{ fontWeight: 700, mb: 2, color: tokens.textPrimary }}
              >
                {isProposal
                  ? isVi
                    ? "Phạm vi tác động & Người review"
                    : "Scope & Reviewers"
                  : isVi
                    ? "Người nhận & Phân loại"
                    : "Assignees & Metadata"}
              </Typography>

              <Grid container spacing={2}>
                {isProposal ? (
                  <>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>
                          {isVi ? "Phạm vi tác động" : "Impact Scope"}
                        </InputLabel>
                        <Select
                          value={proposalScope}
                          label={isVi ? "Phạm vi tác động" : "Impact Scope"}
                          onChange={(e) => setProposalScope(e.target.value)}
                        >
                          <MenuItem value="system">
                            {isVi
                              ? "Toàn hệ thống (System-wide)"
                              : "System-wide"}
                          </MenuItem>
                          <MenuItem value="backend">
                            {isVi ? "Core API / Backend" : "Core API / Backend"}
                          </MenuItem>
                          <MenuItem value="frontend">
                            {isVi ? "Web UI / Frontend" : "Web UI / Frontend"}
                          </MenuItem>
                          <MenuItem value="database">
                            {isVi
                              ? "Cơ sở dữ liệu / Schema"
                              : "Database / Schema"}
                          </MenuItem>
                          <MenuItem value="devops">
                            {isVi
                              ? "DevOps / Hạ tầng & CI/CD"
                              : "DevOps / Infra"}
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>
                          {isVi ? "Mức độ ưu tiên" : "Priority"}
                        </InputLabel>
                        <Select
                          value={priority}
                          label={isVi ? "Mức độ ưu tiên" : "Priority"}
                          onChange={(e) =>
                            setPriority(e.target.value as IssuePriority)
                          }
                        >
                          <MenuItem value={IssuePriority.P1}>
                            {isVi ? "P1 - Cần thảo luận sớm" : "P1 - High Urgency"}
                          </MenuItem>
                          <MenuItem value={IssuePriority.P2}>
                            {isVi ? "P2 - Bình thường" : "P2 - Normal"}
                          </MenuItem>
                          <MenuItem value={IssuePriority.P3}>
                            {isVi ? "P3 - Cải tiến dài hạn" : "P3 - Low"}
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </>
                ) : (
                  <>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>
                          {isVi ? "Mức độ ưu tiên" : "Priority"}
                        </InputLabel>
                        <Select
                          value={priority}
                          label={isVi ? "Mức độ ưu tiên" : "Priority"}
                          onChange={(e) =>
                            setPriority(e.target.value as IssuePriority)
                          }
                        >
                          <MenuItem value={IssuePriority.P0}>P0 - Blocker</MenuItem>
                          <MenuItem value={IssuePriority.P1}>
                            P1 - Critical
                          </MenuItem>
                          <MenuItem value={IssuePriority.P2}>P2 - Major</MenuItem>
                          <MenuItem value={IssuePriority.P3}>P3 - Minor</MenuItem>
                          <MenuItem value={IssuePriority.P4}>P4 - Trivial</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small">
                        <InputLabel>
                          {isVi ? "Mức độ nghiêm trọng" : "Severity"}
                        </InputLabel>
                        <Select
                          value={severity}
                          label={isVi ? "Mức độ nghiêm trọng" : "Severity"}
                          onChange={(e) =>
                            setSeverity(e.target.value as IssueSeverity)
                          }
                        >
                          <MenuItem value={IssueSeverity.BLOCKER}>Blocker</MenuItem>
                          <MenuItem value={IssueSeverity.CRITICAL}>
                            Critical
                          </MenuItem>
                          <MenuItem value={IssueSeverity.MAJOR}>Major</MenuItem>
                          <MenuItem value={IssueSeverity.MINOR}>Minor</MenuItem>
                          <MenuItem value={IssueSeverity.TRIVIAL}>
                            Trivial
                          </MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </>
                )}

                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{isVi ? "Dự án" : "Project"}</InputLabel>
                    <Select
                      value={projectId}
                      label={isVi ? "Dự án" : "Project"}
                      onChange={(e) => setProjectId(e.target.value)}
                    >
                      {projects.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.name} ({p.key})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={isProposal ? 12 : 4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>
                      {isProposal
                        ? isVi
                          ? "Mời người thảo luận & Review đề xuất"
                          : "Invite Reviewers / Collaborators"
                        : isVi
                          ? "Người thực hiện"
                          : "Assignee"}
                    </InputLabel>
                    <Select
                      multiple
                      value={assigneeIds}
                      label={
                        isProposal
                          ? isVi
                            ? "Mời người thảo luận & Review đề xuất"
                            : "Invite Reviewers / Collaborators"
                          : isVi
                            ? "Người thực hiện"
                            : "Assignee"
                      }
                      onChange={(e) =>
                        setAssigneeIds(
                          typeof e.target.value === "string"
                            ? e.target.value.split(",")
                            : e.target.value,
                        )
                      }
                      renderValue={(selected) => (
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}
                        >
                          {selected.map((uid) => {
                            const u = usersList.find((usr) => usr.id === uid);
                            return (
                              <Chip
                                key={uid}
                                label={u?.displayName || uid}
                                size="small"
                              />
                            );
                          })}
                        </Box>
                      )}
                    >
                      {usersList.map((u) => (
                        <MenuItem key={u.id} value={u.id}>
                          {u.displayName} (@{u.username})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      color: tokens.textSecondary,
                      mb: 1,
                      display: "block",
                    }}
                  >
                    {isVi ? "Nhãn phân loại:" : "Labels:"}
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
                    {(isProposal
                      ? [
                          "proposal",
                          "rfc",
                          "architecture",
                          "enhancement",
                          "frontend",
                          "backend",
                          "performance",
                          "security",
                          "database",
                          "tooling",
                        ]
                      : [
                          "bug",
                          "frontend",
                          "backend",
                          "auth",
                          "database",
                          "api",
                          "ui/ux",
                          "performance",
                          "security",
                        ]
                    ).map((lbl) => {
                      const isSelected = selectedLabels.includes(lbl);
                      const style = getLabelColor(lbl, undefined, isSelected);
                      return (
                        <Chip
                          key={lbl}
                          label={lbl}
                          clickable
                          size="small"
                          onClick={() => toggleLabel(lbl)}
                          sx={{
                            backgroundColor: style.bg,
                            color: style.text,
                            border: `1px solid ${style.border}`,
                            fontWeight: isSelected ? 700 : 500,
                            fontSize: "0.75rem",
                            transition: "all 0.15s ease",
                            "&:hover": {
                              backgroundColor: style.bg,
                              filter: "brightness(1.1)",
                            },
                          }}
                        />
                      );
                    })}
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Collapse>

          <Box
            sx={{
              position: { xs: "sticky", md: "static" },
              bottom: 0,
              left: 0,
              right: 0,
              zIndex: 10,
              bgcolor: tokens.surface,
              borderTop: `1px solid ${tokens.border}`,
              backdropFilter: "blur(12px)",
              pt: 2,
              pb: { xs: 2, md: 0 },
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mt: 3,
            }}
          >
            <Button
              variant="outlined"
              onClick={() => setLocation(isFromPosts ? "/posts" : "/issues")}
              sx={{
                borderRadius: "8px",
                textTransform: "none",
                color: tokens.textSecondary,
                borderColor: tokens.border,
                px: { xs: 2, sm: 3 },
              }}
            >
              {isVi ? "Hủy bỏ" : "Cancel"}
            </Button>

            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              endIcon={
                isSubmitting ? (
                  <CircularProgress size={16} />
                ) : (
                  <Send size={15} />
                )
              }
              sx={{
                backgroundColor: tokens.primary,
                borderRadius: "8px",
                px: { xs: 2.5, sm: 3.5 },
                py: 1,
                fontWeight: 700,
                textTransform: "none",
                boxShadow: "0 4px 14px rgba(99, 102, 241, 0.3)",
                "&:hover": {
                  backgroundColor: tokens.primaryHover,
                },
              }}
            >
              {isProposal
                ? isVi
                  ? "Đăng đề xuất"
                  : "Post Proposal"
                : isVi
                  ? "Đăng bài"
                  : "Post"}
            </Button>
          </Box>
        </Paper>
      </form>
    </Page>
  );
};
