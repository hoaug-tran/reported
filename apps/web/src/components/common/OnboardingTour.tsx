import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, IconButton, Checkbox, FormControlLabel, Portal
} from '@mui/material';
import {
  Sparkles, X, ChevronRight, ChevronLeft, CheckCircle2,
  Compass, Bug, GitPullRequest, Globe, Shield, Terminal
} from 'lucide-react';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useI18n } from '../../contexts/I18nContext';

export interface TourStep {
  targetId: string;
  titleVi: string;
  titleEn: string;
  contentVi: string;
  contentEn: string;
  icon: React.ReactNode;
  position?: 'bottom' | 'top' | 'left' | 'right' | 'center';
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-dev-station',
    titleVi: 'Góc làm việc của bạn',
    titleEn: 'Your Dev Station',
    contentVi:
      'Một góc nhỏ dành riêng cho bạn với lời chào, thời tiết, đồng hồ theo thời gian thực và một câu nói về Clean Code mỗi ngày.',
    contentEn:
      'Your personal space with a greeting, weather, live clock, and a daily Clean Code quote.',
    icon: <Terminal size={20} color="#6366f1" />,
    position: 'bottom'
  },
  {
    targetId: 'tour-action-buttons',
    titleVi: 'Bắt đầu nhanh',
    titleEn: 'Quick Actions',
    contentVi:
      'Tạo Bug Report, gửi yêu cầu Review PR hoặc bắt đầu một cuộc thảo luận. Bạn cũng có thể nhấn [Ctrl + K] để mở Command Palette.',
    contentEn:
      'Create a bug report, request a PR review, or start a discussion. You can also press [Ctrl + K] to open the Command Palette.',
    icon: <Bug size={20} color="#ef4444" />,
    position: 'bottom'
  },
  {
    targetId: 'tour-quick-filters',
    titleVi: 'Theo dõi nhanh',
    titleEn: 'Quick Filters',
    contentVi:
      'Xem nhanh những gì cần chú ý: Review đang chờ bạn, Bug P0/P1, công việc đang chờ người khác và các repository đã liên kết. Chọn một mục để lọc ngay.',
    contentEn:
      'See what needs your attention: reviews waiting for you, P0/P1 bugs, work waiting on others, and linked repositories. Select one to filter instantly.',
    icon: <GitPullRequest size={20} color="#a855f7" />,
    position: 'bottom'
  },
  {
    targetId: 'tour-workspace',
    titleVi: 'Workspace & Dự án',
    titleEn: 'Workspaces & Projects',
    contentVi:
      'Chuyển đổi giữa các Workspace và làm việc theo từng Project. Mỗi dự án có Issues, Reviews và repository riêng để mọi thứ luôn rõ ràng.',
    contentEn:
      'Switch between workspaces and organize your work by project. Each project keeps its issues, reviews, and repositories in one place.',
    icon: <Compass size={20} color="#3b82f6" />,
    position: 'right'
  },
  {
    targetId: 'tour-sidebar',
    titleVi: 'Khám phá workspace',
    titleEn: 'Explore Your Workspace',
    contentVi:
      'Đi đến Issues, Reviews, Repositories, Members hoặc Feed — mọi thứ trong workspace đều có thể truy cập từ đây.',
    contentEn:
      'Jump to Issues, Reviews, Repositories, Members, or Feed — everything in your workspace is accessible from here.',
    icon: <Compass size={20} color="#10b981" />,
    position: 'right'
  },
  {
    targetId: 'tour-search',
    titleVi: 'Tìm mọi thứ',
    titleEn: 'Find Anything',
    contentVi:
      'Tìm nhanh Issue, Pull Request, commit, thành viên hoặc label mà không cần nhớ chúng nằm ở đâu.',
    contentEn:
      'Quickly find issues, pull requests, commits, teammates, or labels without worrying about where they live.',
    icon: <Sparkles size={20} color="#f59e0b" />,
    position: 'bottom'
  },
  {
    targetId: 'tour-notifications',
    titleVi: 'Không bỏ lỡ cập nhật',
    titleEn: 'Stay in the Loop',
    contentVi:
      'Theo dõi mention, phân công và các cập nhật liên quan đến bạn. Email Outbox cũng cho phép kiểm tra email đã gửi, OTP và mã xác thực.',
    contentEn:
      'Keep up with mentions, assignments, and updates that involve you. The Email Outbox also lets you inspect sent emails, OTPs, and verification codes.',
    icon: <Sparkles size={20} color="#ec4899" />,
    position: 'bottom'
  },
  {
    targetId: 'tour-theme-lang',
    titleVi: 'Giao diện & Ngôn ngữ',
    titleEn: 'Theme & Language',
    contentVi:
      'Chọn giao diện Sáng hoặc Tối và chuyển đổi giữa Tiếng Việt và English bất cứ lúc nào.',
    contentEn:
      'Switch between Light and Dark themes, and choose Vietnamese or English whenever you like.',
    icon: <Globe size={20} color="#06b6d4" />,
    position: 'bottom'
  },
  {
    targetId: 'tour-user-menu',
    titleVi: 'Tài khoản & Bảo mật',
    titleEn: 'Account & Security',
    contentVi:
      'Quản lý hồ sơ, thiết lập 2FA, đăng nhập bằng Passkey và liên kết tài khoản GitHub, GitLab hoặc Google.',
    contentEn:
      'Manage your profile, set up 2FA, sign in with Passkeys, and connect your GitHub, GitLab, or Google account.',
    icon: <Shield size={20} color="#8b5cf6" />,
    position: 'left'
  }
];

export const OnboardingTour: React.FC = () => {
  const { tokens } = useThemeContext();
  const { language } = useI18n();
  const isVi = language === 'vi';

  const [isOpen, setIsOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const updateTargetRect = useCallback((targetId: string) => {
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, []);

  const startTour = useCallback(() => {
    setCurrentStepIndex(0);
    setIsOpen(true);
  }, []);

  useEffect(() => {
    const handleStartEvent = () => startTour();
    window.addEventListener('reported-start-tour', handleStartEvent);
    return () => window.removeEventListener('reported-start-tour', handleStartEvent);
  }, [startTour]);

  useEffect(() => {
    const seen = localStorage.getItem('reported_tour_seen');
    if (!seen) {
      const timer = setTimeout(() => {
        startTour();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [startTour]);

  useEffect(() => {
    if (!isOpen) return;

    const step = TOUR_STEPS[currentStepIndex];
    if (!step) return;

    updateTargetRect(step.targetId);

    const handleResize = () => updateTargetRect(step.targetId);
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, currentStepIndex, updateTargetRect]);

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    if (dontShowAgain) {
      localStorage.setItem('reported_tour_seen', 'true');
    }
    setIsOpen(false);
  };

  const handleComplete = () => {
    localStorage.setItem('reported_tour_seen', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const currentStep = TOUR_STEPS[currentStepIndex];
  const progressPercent = ((currentStepIndex + 1) / TOUR_STEPS.length) * 100;

  let tooltipTop = 0;
  let tooltipLeft = 0;
  const tooltipWidth = 380;
  const padding = 16;

  if (targetRect) {
    const pos = currentStep.position || 'bottom';

    if (pos === 'bottom') {
      tooltipTop = targetRect.bottom + padding;
      tooltipLeft = Math.max(padding, Math.min(window.innerWidth - tooltipWidth - padding, targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2)));
    } else if (pos === 'top') {
      tooltipTop = Math.max(padding, targetRect.top - 260 - padding);
      tooltipLeft = Math.max(padding, Math.min(window.innerWidth - tooltipWidth - padding, targetRect.left + (targetRect.width / 2) - (tooltipWidth / 2)));
    } else if (pos === 'right') {
      tooltipTop = Math.max(padding, Math.min(window.innerHeight - 300, targetRect.top));
      tooltipLeft = Math.min(window.innerWidth - tooltipWidth - padding, targetRect.right + padding);
    } else if (pos === 'left') {
      tooltipTop = Math.max(padding, Math.min(window.innerHeight - 300, targetRect.top));
      tooltipLeft = Math.max(padding, targetRect.left - tooltipWidth - padding);
    } else {
      tooltipTop = (window.innerHeight / 2) - 140;
      tooltipLeft = (window.innerWidth / 2) - (tooltipWidth / 2);
    }

    if (tooltipTop + 260 > window.innerHeight) {
      tooltipTop = Math.max(padding, window.innerHeight - 280);
    }
  } else {
    tooltipTop = (window.innerHeight / 2) - 140;
    tooltipLeft = (window.innerWidth / 2) - (tooltipWidth / 2);
  }

  return (
    <Portal>
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          pointerEvents: 'auto',
          overflow: 'hidden'
        }}
      >
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'auto'
          }}
          onClick={handleSkip}
        >
          <defs>
            <mask id="tour-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - 6}
                  y={targetRect.top - 6}
                  width={targetRect.width + 12}
                  height={targetRect.height + 12}
                  rx="10"
                  ry="10"
                  fill="black"
                  style={{
                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
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
            fill="rgba(5, 7, 15, 0.76)"
            mask="url(#tour-spotlight-mask)"
          />
        </svg>

        {targetRect && (
          <Box
            sx={{
              position: 'absolute',
              top: targetRect.top - 6,
              left: targetRect.left - 6,
              width: targetRect.width + 12,
              height: targetRect.height + 12,
              borderRadius: '10px',
              border: `2px solid ${tokens.primary}`,
              boxShadow: `0 0 0 4px ${tokens.primary}33, 0 0 35px ${tokens.primary}66`,
              pointerEvents: 'none',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          />
        )}

        <Box
          sx={{
            position: 'absolute',
            top: tooltipTop,
            left: tooltipLeft,
            width: { xs: 'calc(100vw - 32px)', sm: tooltipWidth },
            maxWidth: tooltipWidth,
            backgroundColor: tokens.surface,
            borderRadius: '14px',
            border: `1px solid ${tokens.border}`,
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.45), 0 0 1px rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(24px)',
            p: 2.6,
            zIndex: 100000,
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            overflow: 'hidden'
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              backgroundColor: tokens.surfaceSecondary
            }}
          >
            <Box
              sx={{
                height: '100%',
                width: `${progressPercent}%`,
                backgroundColor: tokens.primary,
                transition: 'width 0.3s ease'
              }}
            />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: '8px',
                  backgroundColor: tokens.surfaceSecondary,
                  border: `1px solid ${tokens.border}`
                }}
              >
                {currentStep.icon}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: tokens.primary
                }}
              >
                {isVi ? `BƯỚC ${currentStepIndex + 1} / ${TOUR_STEPS.length}` : `STEP ${currentStepIndex + 1} OF ${TOUR_STEPS.length}`}
              </Typography>
            </Box>

            <IconButton size="small" onClick={handleSkip} sx={{ color: tokens.textSecondary }}>
              <X size={16} />
            </IconButton>
          </Box>

          <Typography
            variant="h6"
            sx={{
              fontSize: '1rem',
              fontWeight: 700,
              color: tokens.textPrimary,
              mb: 0.8,
              lineHeight: 1.3
            }}
          >
            {isVi ? currentStep.titleVi : currentStep.titleEn}
          </Typography>

          <Typography
            variant="body2"
            sx={{
              fontSize: '0.84rem',
              color: tokens.textSecondary,
              lineHeight: 1.5,
              mb: 2.2
            }}
          >
            {isVi ? currentStep.contentVi : currentStep.contentEn}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1, borderTop: `1px solid ${tokens.border}` }}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  sx={{ p: 0.5, color: tokens.textSecondary }}
                />
              }
              label={
                <Typography sx={{ fontSize: '0.72rem', color: tokens.textSecondary, userSelect: 'none' }}>
                  {isVi ? 'Không tự mở lại' : 'Don\'t auto-show'}
                </Typography>
              }
            />

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {currentStepIndex > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handlePrev}
                  startIcon={<ChevronLeft size={14} />}
                  sx={{
                    height: 30,
                    px: 1.2,
                    fontSize: '0.75rem',
                    textTransform: 'none',
                    borderRadius: '6px',
                    borderColor: tokens.border,
                    color: tokens.textSecondary
                  }}
                >
                  {isVi ? 'Trước' : 'Back'}
                </Button>
              )}

              <Button
                size="small"
                variant="contained"
                onClick={handleNext}
                endIcon={currentStepIndex === TOUR_STEPS.length - 1 ? <CheckCircle2 size={14} /> : <ChevronRight size={14} />}
                sx={{
                  height: 30,
                  px: 1.6,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  borderRadius: '6px',
                  backgroundColor: tokens.primary,
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
                  '&:hover': {
                    backgroundColor: tokens.primaryHover
                  }
                }}
              >
                {currentStepIndex === TOUR_STEPS.length - 1
                  ? (isVi ? 'Bắt đầu dùng!' : 'Get Started!')
                  : (isVi ? 'Tiếp tục' : 'Next')}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Portal>
  );
};
