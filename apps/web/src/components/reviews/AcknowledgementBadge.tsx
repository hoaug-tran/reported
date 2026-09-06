import React, { useState } from 'react';
import { Box, Typography, Button, Tooltip, CircularProgress, Chip } from '@mui/material';
import { Eye, ListChecks, Code2, CheckCircle2 } from 'lucide-react';
import { useThemeContext } from '../../contexts/ThemeContext';
import { useAuthContext } from '../../contexts/AuthContext';
import { useI18n } from '../../contexts/I18nContext';
import { apiFetch } from '../../api/client';
import { ReviewerAssignmentDto, AcknowledgementStatus } from '@reported/contracts';

interface AcknowledgementBadgeProps {
  reviewId: string;
  reviewers: ReviewerAssignmentDto[];
  onUpdated?: () => void;
}

const statusConfig = {
  SEEN: {
    labelVi: 'Đã xem',
    labelEn: 'Seen',
    icon: <Eye size={15} />,
    color: '#64748b',
    bg: 'rgba(100, 116, 139, 0.12)'
  },
  CHECKING: {
    labelVi: 'Sẽ xem',
    labelEn: "I'll check",
    icon: <ListChecks size={15} />,
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.12)'
  },
  REVIEWING: {
    labelVi: 'Đang review',
    labelEn: 'Reviewing',
    icon: <Code2 size={15} />,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)'
  },
  DONE: {
    labelVi: 'Đã xong',
    labelEn: 'Done',
    icon: <CheckCircle2 size={15} />,
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)'
  }
};

export const AcknowledgementBadge: React.FC<AcknowledgementBadgeProps> = ({
  reviewId,
  reviewers,
  onUpdated
}) => {
  const { tokens } = useThemeContext();
  const { user } = useAuthContext();
  const { language } = useI18n();
  const isVi = language === 'vi';

  const [loadingStatus, setLoadingStatus] = useState<string | null>(null);

  const myAssignment = reviewers.find((r) => r.user.id === user?.id);
  const currentStatus = myAssignment?.acknowledgementStatus as AcknowledgementStatus | undefined;

  const handleUpdate = async (status: AcknowledgementStatus) => {
    if (loadingStatus) return;
    try {
      setLoadingStatus(status);
      await apiFetch(`/reviews/${reviewId}/acknowledgement`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error('Failed to update acknowledgement:', err);
    } finally {
      setLoadingStatus(null);
    }
  };

  const statuses: AcknowledgementStatus[] = [
    AcknowledgementStatus.SEEN,
    AcknowledgementStatus.CHECKING,
    AcknowledgementStatus.REVIEWING,
    AcknowledgementStatus.DONE
  ];

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: '8px',
        backgroundColor: tokens.surfaceSecondary,
        border: `1px solid ${tokens.border}`,
        mb: 2.5
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tokens.textPrimary, fontSize: '0.88rem' }}>
            {isVi ? 'Tình trạng phản hồi (Acknowledgement)' : 'Quick Acknowledgement'}
          </Typography>
          <Typography variant="caption" sx={{ color: tokens.textSecondary, fontSize: '0.74rem' }}>
            {isVi
              ? 'Báo nhanh trạng thái cho tác giả mà không cần gửi nhận xét chính thức'
              : 'Let author know you have seen or are reviewing without formal comments'}
          </Typography>
        </Box>
      </Box>

      {/* Buttons for current user */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {statuses.map((s) => {
          const cfg = statusConfig[s];
          const isSelected = currentStatus === s;
          const isLoading = loadingStatus === s;

          return (
            <Button
              key={s}
              size="small"
              variant={isSelected ? 'contained' : 'outlined'}
              disabled={loadingStatus !== null}
              onClick={() => handleUpdate(s)}
              startIcon={isLoading ? <CircularProgress size={14} color="inherit" /> : cfg.icon}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontSize: '0.8rem',
                fontWeight: isSelected ? 700 : 500,
                backgroundColor: isSelected ? cfg.color : 'transparent',
                borderColor: isSelected ? cfg.color : tokens.border,
                color: isSelected ? '#ffffff' : tokens.textPrimary,
                '&:hover': {
                  backgroundColor: isSelected ? cfg.color : cfg.bg,
                  borderColor: cfg.color
                }
              }}
            >
              {isVi ? cfg.labelVi : cfg.labelEn}
            </Button>
          );
        })}
      </Box>

      {/* Overview of all reviewers' acknowledgement */}
      {reviewers.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2, pt: 1.5, borderTop: `1px solid ${tokens.divider}` }}>
          {reviewers.map((r) => {
            const statusKey = (r.acknowledgementStatus as AcknowledgementStatus) || null;
            const cfg = statusKey ? statusConfig[statusKey] : null;

            return (
              <Chip
                key={r.user.id}
                size="small"
                icon={cfg ? cfg.icon : <Eye size={14} />}
                label={
                  <span>
                    <strong>@{r.user.username}</strong>:{' '}
                    {cfg ? (isVi ? cfg.labelVi : cfg.labelEn) : isVi ? 'Chưa phản hồi' : 'No response'}
                  </span>
                }
                sx={{
                  height: 24,
                  fontSize: '0.72rem',
                  backgroundColor: cfg ? cfg.bg : 'transparent',
                  color: cfg ? cfg.color : tokens.textSecondary,
                  border: `1px solid ${cfg ? cfg.color + '40' : tokens.border}`
                }}
              />
            );
          })}
        </Box>
      )}
    </Box>
  );
};
