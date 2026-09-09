import React from 'react';
import { Box, Chip } from '@mui/material';
import {
  CircleDot,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
  XCircle,
  Eye,
  Check,
  AlertCircle
} from 'lucide-react';
import { IssueStatus, ReviewStatus } from '@reported/contracts';

interface StatusBadgeProps {
  status: IssueStatus | ReviewStatus | string;
  size?: 'small' | 'medium';
  width?: number | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'small', width }) => {
  let label = status;
  let color = '#8b949e';
  let bg = 'rgba(139, 148, 158, 0.15)';
  let icon = <CircleDot size={13} />;

  switch (status) {
    case IssueStatus.OPEN:
      label = 'Open';
      color = '#3fb950';
      bg = 'rgba(63, 185, 80, 0.15)';
      icon = <CircleDot size={13} color={color} />;
      break;
    case IssueStatus.IN_PROGRESS:
      label = 'In Progress';
      color = '#d29922';
      bg = 'rgba(210, 153, 34, 0.15)';
      icon = <RefreshCw size={13} color={color} />;
      break;
    case IssueStatus.NEEDS_INFO:
      label = 'Needs Info';
      color = '#58a6ff';
      bg = 'rgba(88, 166, 255, 0.15)';
      icon = <HelpCircle size={13} color={color} />;
      break;
    case IssueStatus.RESOLVED:
      label = 'Resolved';
      color = '#a371f7';
      bg = 'rgba(163, 113, 247, 0.15)';
      icon = <CheckCircle2 size={13} color={color} />;
      break;
    case IssueStatus.CLOSED:
      label = 'Closed';
      color = '#8b949e';
      bg = 'rgba(139, 148, 158, 0.15)';
      icon = <XCircle size={13} color={color} />;
      break;
    case IssueStatus.REOPENED:
      label = 'Reopened';
      color = '#f0883e';
      bg = 'rgba(240, 136, 62, 0.15)';
      icon = <CircleDot size={13} color={color} />;
      break;

    case ReviewStatus.PENDING_REVIEW:
      label = 'Pending Review';
      color = '#d29922';
      bg = 'rgba(210, 153, 34, 0.15)';
      icon = <Eye size={13} color={color} />;
      break;
    case ReviewStatus.IN_REVIEW:
      label = 'In Review';
      color = '#58a6ff';
      bg = 'rgba(88, 166, 255, 0.15)';
      icon = <Eye size={13} color={color} />;
      break;
    case ReviewStatus.CHANGES_REQUESTED:
      label = 'Changes Requested';
      color = '#f85149';
      bg = 'rgba(248, 81, 73, 0.15)';
      icon = <AlertCircle size={13} color={color} />;
      break;
    case ReviewStatus.APPROVED:
      label = 'Approved';
      color = '#3fb950';
      bg = 'rgba(63, 185, 80, 0.15)';
      icon = <Check size={13} color={color} />;
      break;
    case ReviewStatus.COMPLETED:
      label = 'Completed';
      color = '#a371f7';
      bg = 'rgba(163, 113, 247, 0.15)';
      icon = <CheckCircle2 size={13} color={color} />;
      break;
  }

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: width ? 'center' : 'flex-start',
        width: width,
        minWidth: width,
        maxWidth: width,
        gap: 0.6,
        px: 1.1,
        py: 0,
        height: size === 'small' ? 24 : 28,
        boxSizing: 'border-box',
        borderRadius: '6px',
        backgroundColor: bg,
        color,
        fontSize: size === 'small' ? '0.75rem' : '0.8125rem',
        fontWeight: 600,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        border: `1px solid ${color}33`,
        userSelect: 'none'
      }}
    >
      {icon}
      <span>{label}</span>
    </Box>
  );
};

