import React, { useState } from 'react';
import { Box, Typography, Tooltip, Link, IconButton } from '@mui/material';
import {
  CheckCircle2, XCircle, Clock, MinusCircle, SkipForward, ExternalLink,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { useThemeContext } from '../../contexts/ThemeContext';

interface CheckRun {
  name: string;
  status: 'completed' | 'in_progress' | 'queued' | 'waiting';
  conclusion?: 'success' | 'failure' | 'cancelled' | 'skipped' | 'neutral' | 'timed_out' | null;
  html_url?: string;
  started_at?: string;
  completed_at?: string;
}

interface CICheckRunsListProps {
  rawMetadata?: Record<string, unknown> | null;
  aggregateStatus?: string;
}

const CheckIcon: React.FC<{ run: CheckRun }> = ({ run }) => {
  const { tokens } = useThemeContext();

  if (run.status !== 'completed') {
    return <Clock size={14} color={tokens.warning} />;
  }

  switch (run.conclusion) {
    case 'success':
      return <CheckCircle2 size={14} color={tokens.success} />;
    case 'failure':
    case 'timed_out':
      return <XCircle size={14} color={tokens.error} />;
    case 'cancelled':
      return <MinusCircle size={14} color={tokens.textSecondary} />;
    case 'skipped':
      return <SkipForward size={14} color={tokens.textSecondary} />;
    default:
      return <MinusCircle size={14} color={tokens.textSecondary} />;
  }
};

const getStatusColor = (run: CheckRun, tokens: { success: string; error: string; textSecondary: string; warning: string }) => {
  if (run.status !== 'completed') return tokens.warning;
  switch (run.conclusion) {
    case 'success': return tokens.success;
    case 'failure':
    case 'timed_out': return tokens.error;
    default: return tokens.textSecondary;
  }
};

export const CICheckRunsList: React.FC<CICheckRunsListProps> = ({
  rawMetadata,
  aggregateStatus
}) => {
  const { tokens } = useThemeContext();

  const checkRuns: CheckRun[] = Array.isArray(rawMetadata?.check_runs)
    ? (rawMetadata!.check_runs as CheckRun[])
    : [];

  if (checkRuns.length === 0) {
    if (!aggregateStatus) return null;

    const isPass = aggregateStatus === 'PASSING';
    const isFail = aggregateStatus === 'FAILING';
    const isPending = aggregateStatus === 'PENDING';

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {isPass && <CheckCircle2 size={14} color={tokens.success} />}
        {isFail && <XCircle size={14} color={tokens.error} />}
        {isPending && <Clock size={14} color={tokens.warning} />}
        <Typography variant="caption" sx={{ color: isPass ? tokens.success : isFail ? tokens.error : tokens.warning }}>
          {isPass ? 'All checks passed' : isFail ? 'Checks failing' : 'Checks pending'}
        </Typography>
      </Box>
    );
  }

  const passCount = checkRuns.filter(r => r.conclusion === 'success').length;
  const failCount = checkRuns.filter(r => r.conclusion === 'failure' || r.conclusion === 'timed_out').length;
  const pendingCount = checkRuns.filter(r => r.status !== 'completed').length;
  const [expanded, setExpanded] = useState(failCount > 0);

  return (
    <Box>
      <Box
        onClick={() => setExpanded(!expanded)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          py: 0.5,
          userSelect: 'none',
          '&:hover': { opacity: 0.85 }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          {passCount > 0 && (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: tokens.success, fontSize: '0.75rem', fontWeight: 600 }}>
              <CheckCircle2 size={13} />
              <span>{passCount} passed</span>
            </Box>
          )}
          {failCount > 0 && (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: tokens.error, fontSize: '0.75rem', fontWeight: 600 }}>
              <XCircle size={13} />
              <span>{failCount} failed</span>
            </Box>
          )}
          {pendingCount > 0 && (
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, color: tokens.warning, fontSize: '0.75rem', fontWeight: 600 }}>
              <Clock size={13} />
              <span>{pendingCount} running</span>
            </Box>
          )}
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: tokens.textSecondary, fontSize: '0.75rem', ml: 'auto' }}>
          <span>{expanded ? 'Thu gọn' : 'Chi tiết'}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </Box>
      </Box>

      {expanded && (
        <Box
          sx={{
            mt: 1,
            borderRadius: '6px',
            border: `1px solid ${tokens.border}`,
            overflow: 'hidden',
            maxHeight: 160,
            overflowY: 'auto',
            '&::-webkit-scrollbar': { width: 4 },
            '&::-webkit-scrollbar-thumb': { backgroundColor: tokens.border, borderRadius: 2 }
          }}
        >
        {checkRuns.map((run, idx) => (
          <Box
            key={`${run.name}-${idx}`}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1.5,
              px: 1.5,
              py: 0.75,
              borderBottom: idx < checkRuns.length - 1 ? `1px solid ${tokens.divider}` : 'none',
              '&:hover': { backgroundColor: tokens.hover }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
              <CheckIcon run={run} />
              <Typography
                variant="caption"
                sx={{
                  color: getStatusColor(run, tokens),
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {run.name}
              </Typography>
            </Box>

            {run.html_url && (
              <Tooltip title="View check details">
                <Link
                  href={run.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  sx={{ color: tokens.textSecondary, display: 'flex', alignItems: 'center' }}
                >
                  <ExternalLink size={12} />
                </Link>
              </Tooltip>
            )}
          </Box>
        ))}
        </Box>
      )}
    </Box>
  );
};
