import React, { useState, useEffect, useCallback } from "react";
import { Box, Typography, Button, IconButton, Portal } from "@mui/material";
import {
  X,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Compass,
  Bug,
  GitPullRequest,
  Globe,
  Shield,
  Terminal,
  MessageSquare,
  Layers,
  Search,
  Bell,
} from "lucide-react";
import { useLocation } from "wouter";
import { useThemeContext } from "../../contexts/ThemeContext";
import { useAuthContext } from "../../contexts/AuthContext";
import { useI18n } from "../../contexts/I18nContext";

export interface TourStep {
  targetId: string;
  titleVi: string;
  titleEn: string;
  contentVi: string;
  contentEn: string;
  icon: React.ReactNode;
  position?: "bottom" | "top" | "left" | "right" | "center";
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: "tour-dev-station",
    titleVi: "Trạm làm việc Dev Station",
    titleEn: "Your Dev Station",
    contentVi:
      "Trung tâm khởi đầu ngày làm việc: hiển thị lời chào cá nhân hóa, đồng hồ thời gian thực, thời tiết trực tiếp theo vị trí và câu danh ngôn Clean Code / Architecture mỗi ngày giúp khởi động ngày mới tràn đầy cảm hứng.",
    contentEn:
      "Your daily launchpad featuring personalized greetings, real-time clock, live local weather, and an inspiring Clean Code quote to kick off your day.",
    icon: <Terminal size={20} color="#6366f1" />,
    position: "bottom",
  },
  {
    targetId: "tour-action-buttons",
    titleVi: "Khởi tạo nhanh & Thao tác kỹ thuật",
    titleEn: "Quick Actions & Reports",
    contentVi:
      "Nơi tạo nhanh bài viết theo đúng mục đích kỹ thuật: Báo lỗi (Bug) với cấu trúc chi tiết môi trường & các bước tái hiện, Yêu cầu Duyệt mã (PR Review), Đặt câu hỏi hoặc Đề xuất ý tưởng mới. Bạn cũng có thể bấm [Ctrl + K] để mở Command Palette mọi lúc.",
    contentEn:
      "Fast entry points to report bugs with structured environments and steps, request PR reviews, ask technical questions, or propose ideas. Press [Ctrl + K] anytime for Command Palette.",
    icon: <Bug size={20} color="#ef4444" />,
    position: "bottom",
  },
  {
    targetId: "tour-quick-filters",
    titleVi: "Bộ lọc ưu tiên & Nhiệm vụ khẩn cấp",
    titleEn: "Smart Filters & Critical Tasks",
    contentVi:
      "Nắm bắt ngay các tác vụ cần bạn xử lý tức thì: PR đang chờ bạn duyệt, Bug P0/P1 nghiêm trọng đang blocker hệ thống, công việc đang chờ đồng nghiệp phản hồi và danh sách repository đã liên kết. Nhấp vào để lọc danh sách ngay.",
    contentEn:
      "Instantly spot high-priority items: reviews waiting on you, P0/P1 critical blockers, work pending teammate feedback, and linked repositories. Click any pill to filter immediately.",
    icon: <GitPullRequest size={20} color="#a855f7" />,
    position: "bottom",
  },
  {
    targetId: "tour-recent-conversations",
    titleVi: "Luồng thảo luận kỹ thuật (Feed)",
    titleEn: "Recent Conversations & Feed",
    contentVi:
      "Cập nhật thảo luận kỹ thuật thời gian thực giữa các thành viên: hỗ trợ trình soạn thảo Markdown cao cấp, chèn đoạn code tô màu cú pháp (Syntax Highlight), ghi âm giọng nói trực tiếp (Voice Notes) và trình phát video xem ngay clip tái hiện lỗi.",
    contentEn:
      "Real-time technical discussions among team members. Features rich Markdown, syntax-highlighted code blocks, live voice notes recording, and inline HTML5 video playback for bug reproduction clips.",
    icon: <MessageSquare size={20} color="#3b82f6" />,
    position: "top",
  },
  {
    targetId: "tour-workspace",
    titleVi: "Workspace & Phân loại Dự án",
    titleEn: "Workspaces & Projects",
    contentVi:
      "Hỗ trợ mô hình đa tổ chức (Multi-tenancy): chuyển đổi linh hoạt giữa các Workspace. Mỗi dự án bên trong sở hữu kho mã nguồn, bộ nhãn, danh sách Issues và Reviews riêng biệt, đảm bảo dữ liệu luôn ngăn nắp và bảo mật.",
    contentEn:
      "Multi-tenant workspace switcher. Organize work cleanly by project—each project isolates its repositories, labels, issues, and reviews with dedicated access control.",
    icon: <Compass size={20} color="#06b6d4" />,
    position: "right",
  },
  {
    targetId: "tour-sidebar",
    titleVi: "Hệ thống mô-đun nghiệp vụ",
    titleEn: "Platform Modules",
    contentVi:
      "Thanh điều hướng truy cập toàn bộ chức năng cốt lõi: Bảng tổng quan (Dashboard), Luồng tin (Feed), Quản lý lỗi (Issues), Duyệt mã (Reviews), Kho lưu trữ GitHub (Repositories), Danh mục Dự án (Projects) và Thành viên nhóm (Members).",
    contentEn:
      "Navigation center for all platform modules: Dashboard, Technical Feed, Bug Issues, PR Reviews, GitHub Repositories, Projects Management, and Workspace Members.",
    icon: <Layers size={20} color="#10b981" />,
    position: "right",
  },
  {
    targetId: "tour-search",
    titleVi: "Tìm kiếm toàn năng (Command Palette)",
    titleEn: "Global Command Palette",
    contentVi:
      "Tìm kiếm tức thời mọi đối tượng trong toàn bộ workspace: tìm theo mã số bài (#12), tên thành viên (@username), Pull Request, commit hash hoặc nhãn. Hỗ trợ điều hướng hoàn toàn bằng bàn phím với phím tắt [Ctrl + K].",
    contentEn:
      "Instantly query anything across your workspace: search by issue number (#12), teammate (@username), pull request, commit hash, or labels. Fully keyboard-driven via [Ctrl + K].",
    icon: <Search size={20} color="#f59e0b" />,
    position: "bottom",
  },
  {
    targetId: "tour-notifications",
    titleVi: "Trung tâm thông báo & Email Outbox",
    titleEn: "Notifications & Email Inspector",
    contentVi:
      "Nhận thông báo khi được nhắc tên (@mention), giao việc hoặc có quyết định duyệt mã. Tích hợp sẵn Email Inspector giúp kiểm tra chi tiết nội dung email OTP, email kích hoạt và mã xác nhận hệ thống gửi ra mà không cần mở hộp thư thật.",
    contentEn:
      "Receive instant alerts for mentions, assignments, and review approvals. Includes an integrated Email Inspector to preview outgoing OTPs, activation links, and system notifications.",
    icon: <Bell size={20} color="#ec4899" />,
    position: "bottom",
  },
  {
    targetId: "tour-theme-lang",
    titleVi: "Chế độ hiển thị & Song ngữ",
    titleEn: "Theme & Dual-Language",
    contentVi:
      "Chuyển đổi giao diện Dark Mode tương phản cao (chống mỏi mắt khi code ban đêm) hoặc Light Mode trang nhã. Chuyển đổi linh hoạt song ngữ chuẩn xác Tiếng Việt và English trên toàn bộ hệ thống bất cứ lúc nào.",
    contentEn:
      "Toggle between high-contrast Dark Mode and clean Light Mode. Switch seamlessly between Vietnamese and English across all UI labels, views, and system messages.",
    icon: <Globe size={20} color="#3b82f6" />,
    position: "bottom",
  },
  {
    targetId: "tour-user-menu",
    titleVi: "Hồ sơ cá nhân, Sinh trắc học & Bảo mật",
    titleEn: "Account & Biometric Security",
    contentVi:
      "Quản lý hồ sơ lập trình viên, kích hoạt bảo mật 2 lớp (2FA TOTP), đăng nhập một chạm không cần mật khẩu với Passkeys (vân tay / khuôn mặt / Windows Hello) và liên kết tài khoản GitHub, GitLab hoặc Google.",
    contentEn:
      "Manage your developer profile, enable 2FA TOTP, sign in passwordless with biometric Passkeys (Touch ID, Face ID, Windows Hello), and connect your GitHub, GitLab, or Google accounts.",
    icon: <Shield size={20} color="#8b5cf6" />,
    position: "left",
  },
];

export const OnboardingTour: React.FC = () => {
  const { tokens } = useThemeContext();
  const { user } = useAuthContext();
  const { language } = useI18n();
  const isVi = language === "vi";
  const [location, setLocation] = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const markTourAsSeen = useCallback(() => {
    try {
      localStorage.setItem("reported_tour_seen", "true");
      if (user?.id) {
        localStorage.setItem(`reported_tour_seen_${user.id}`, "true");
      }
    } catch {}
  }, [user?.id]);

  const updateTargetRect = useCallback((targetId: string) => {
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, []);

  const startTour = useCallback(() => {
    if (location !== "/") {
      setLocation("/");
    }
    setTimeout(() => {
      setCurrentStepIndex(0);
      setIsOpen(true);
    }, 150);
  }, [location, setLocation]);

  useEffect(() => {
    const handleStartEvent = () => startTour();
    window.addEventListener("reported-start-tour", handleStartEvent);
    return () =>
      window.removeEventListener("reported-start-tour", handleStartEvent);
  }, [startTour]);

  useEffect(() => {
    try {
      const userSeen = user?.id
        ? localStorage.getItem(`reported_tour_seen_${user.id}`)
        : null;
      const globalSeen = localStorage.getItem("reported_tour_seen");
      if (userSeen || globalSeen) {
        return;
      }
      const timer = setTimeout(() => {
        startTour();
      }, 1500);
      return () => clearTimeout(timer);
    } catch {}
  }, [startTour, user?.id]);

  useEffect(() => {
    if (!isOpen) return;

    const step = TOUR_STEPS[currentStepIndex];
    if (!step) return;

    updateTargetRect(step.targetId);

    const handleResize = () => updateTargetRect(step.targetId);
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleSkip();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, currentStepIndex, updateTargetRect]);

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    markTourAsSeen();
    setIsOpen(false);
  };

  const handleComplete = () => {
    markTourAsSeen();
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[currentStepIndex];
  const progressPercent = ((currentStepIndex + 1) / TOUR_STEPS.length) * 100;

  const pad = 4;
  const spotlight = targetRect
    ? {
        x: Math.max(3, targetRect.left - pad),
        y: Math.max(3, targetRect.top - pad),
        w: Math.min(
          window.innerWidth - Math.max(3, targetRect.left - pad) - 3,
          targetRect.width + pad * 2,
        ),
        h: Math.min(
          window.innerHeight - Math.max(3, targetRect.top - pad) - 3,
          targetRect.height + pad * 2,
        ),
      }
    : null;

  let tooltipTop = 0;
  let tooltipLeft = 0;
  const tooltipWidth = 410;
  const padding = 14;

  if (targetRect) {
    const pos = currentStep.position || "bottom";

    if (pos === "bottom") {
      tooltipTop = targetRect.bottom + padding;
      tooltipLeft = Math.max(
        padding,
        Math.min(
          window.innerWidth - tooltipWidth - padding,
          targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        ),
      );
    } else if (pos === "top") {
      tooltipTop = Math.max(padding, targetRect.top - 320 - padding);
      tooltipLeft = Math.max(
        padding,
        Math.min(
          window.innerWidth - tooltipWidth - padding,
          targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
        ),
      );
    } else if (pos === "right") {
      tooltipTop = Math.max(
        padding,
        Math.min(window.innerHeight - 340, targetRect.top),
      );
      tooltipLeft = Math.min(
        window.innerWidth - tooltipWidth - padding,
        targetRect.right + padding,
      );
    } else if (pos === "left") {
      tooltipTop = Math.max(
        padding,
        Math.min(window.innerHeight - 340, targetRect.top),
      );
      tooltipLeft = Math.max(padding, targetRect.left - tooltipWidth - padding);
    } else {
      tooltipTop = window.innerHeight / 2 - 160;
      tooltipLeft = window.innerWidth / 2 - tooltipWidth / 2;
    }

    if (tooltipTop + 340 > window.innerHeight) {
      tooltipTop = Math.max(padding, window.innerHeight - 350);
    }
  } else {
    tooltipTop = window.innerHeight / 2 - 160;
    tooltipLeft = window.innerWidth / 2 - tooltipWidth / 2;
  }

  return (
    <Portal>
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 99999,
          pointerEvents: "auto",
          overflow: "hidden",
        }}
      >
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "auto",
          }}
          onClick={handleSkip}
        >
          <defs>
            <mask id="tour-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {spotlight && (
                <rect
                  x={spotlight.x}
                  y={spotlight.y}
                  width={spotlight.w}
                  height={spotlight.h}
                  rx="8"
                  ry="8"
                  fill="black"
                  style={{
                    transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(10, 15, 26, 0.48)"
            mask="url(#tour-spotlight-mask)"
          />
        </svg>

        {spotlight && (
          <Box
            sx={{
              position: "absolute",
              top: spotlight.y,
              left: spotlight.x,
              width: spotlight.w,
              height: spotlight.h,
              borderRadius: "8px",
              border: `2px solid ${tokens.primary}`,
              boxShadow: `0 0 0 3px ${tokens.primary}25`,
              pointerEvents: "none",
              transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        )}

        <Box
          sx={{
            position: "absolute",
            top: tooltipTop,
            left: tooltipLeft,
            width: { xs: "calc(100vw - 32px)", sm: tooltipWidth },
            maxWidth: tooltipWidth,
            backgroundColor: tokens.surface,
            borderRadius: "12px",
            border: `1px solid ${tokens.border}`,
            boxShadow: "0 18px 40px rgba(0, 0, 0, 0.4)",
            backdropFilter: "blur(24px)",
            p: 2.5,
            zIndex: 100000,
            transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              backgroundColor: tokens.surfaceSecondary,
            }}
          >
            <Box
              sx={{
                height: "100%",
                width: `${progressPercent}%`,
                backgroundColor: tokens.primary,
                transition: "width 0.25s ease",
              }}
            />
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 1.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  backgroundColor: tokens.surfaceSecondary,
                  border: `1px solid ${tokens.border}`,
                }}
              >
                {currentStep.icon}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  fontSize: "0.72rem",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: tokens.primary,
                }}
              >
                {isVi
                  ? `BƯỚC ${currentStepIndex + 1} / ${TOUR_STEPS.length}`
                  : `STEP ${currentStepIndex + 1} OF ${TOUR_STEPS.length}`}
              </Typography>
            </Box>

            <IconButton
              size="small"
              onClick={handleSkip}
              sx={{ color: tokens.textSecondary, p: 0.5 }}
            >
              <X size={16} />
            </IconButton>
          </Box>

          <Typography
            variant="h6"
            sx={{
              fontSize: "0.98rem",
              fontWeight: 700,
              color: tokens.textPrimary,
              mb: 0.8,
              lineHeight: 1.35,
            }}
          >
            {isVi ? currentStep.titleVi : currentStep.titleEn}
          </Typography>

          <Typography
            variant="body2"
            sx={{
              fontSize: "0.84rem",
              color: tokens.textSecondary,
              lineHeight: 1.55,
              mb: 2,
            }}
          >
            {isVi ? currentStep.contentVi : currentStep.contentEn}
          </Typography>

          {!targetRect && (
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                setLocation("/");
                setTimeout(() => updateTargetRect(currentStep.targetId), 250);
              }}
              sx={{
                mb: 2,
                textTransform: "none",
                fontSize: "0.78rem",
                borderRadius: "6px",
                borderColor: tokens.border,
                color: tokens.primary,
              }}
            >
              {isVi
                ? "Đi đến Dashboard để xem vị trí này"
                : "Go to Dashboard to highlight this"}
            </Button>
          )}

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              pt: 1.2,
              borderTop: `1px solid ${tokens.border}`,
            }}
          >
            <Button
              size="small"
              variant="text"
              onClick={handleSkip}
              sx={{
                color: tokens.textSecondary,
                textTransform: "none",
                fontSize: "0.78rem",
              }}
            >
              {isVi ? "Đóng hướng dẫn" : "Dismiss"}
            </Button>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {currentStepIndex > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handlePrev}
                  startIcon={<ChevronLeft size={14} />}
                  sx={{
                    height: 30,
                    px: 1.2,
                    fontSize: "0.78rem",
                    textTransform: "none",
                    borderRadius: "6px",
                    borderColor: tokens.border,
                    color: tokens.textSecondary,
                  }}
                >
                  {isVi ? "Trước" : "Back"}
                </Button>
              )}

              <Button
                size="small"
                variant="contained"
                onClick={handleNext}
                endIcon={
                  currentStepIndex === TOUR_STEPS.length - 1 ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )
                }
                sx={{
                  height: 30,
                  px: 1.6,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  textTransform: "none",
                  borderRadius: "6px",
                  backgroundColor: tokens.primary,
                  boxShadow: "none",
                  "&:hover": {
                    backgroundColor: tokens.primaryHover,
                  },
                }}
              >
                {currentStepIndex === TOUR_STEPS.length - 1
                  ? isVi
                    ? "Bắt đầu dùng!"
                    : "Get Started!"
                  : isVi
                    ? "Tiếp tục"
                    : "Next"}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Portal>
  );
};
