import React from 'react';
import { Box, Tooltip } from '@mui/material';
import { AlertTriangle, ChevronUp, ChevronsUp, ChevronDown, Minus } from 'lucide-react';
import { IssuePriority, IssueSeverity } from '@reported/contracts';

interface PriorityBadgeProps {
  priority: IssuePriority | string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  let color = '#8b949e';
  let label = 'P4 - None';
  let icon = <Minus size={13} />;

  switch (priority) {
    case IssuePriority.P0:
      color = '#f85149';
      label = 'P0 - Urgent';
      icon = <AlertTriangle size={13} color={color} />;
      break;
    case IssuePriority.P1:
      color = '#f0883e';
      label = 'P1 - High';
      icon = <ChevronsUp size={13} color={color} />;
      break;
    case IssuePriority.P2:
      color = '#d29922';
      label = 'P2 - Medium';
      icon = <ChevronUp size={13} color={color} />;
      break;
    case IssuePriority.P3:
      color = '#58a6ff';
      label = 'P3 - Low';
      icon = <ChevronDown size={13} color={color} />;
      break;
    case IssuePriority.P4:
      color = '#8b949e';
      label = 'P4 - None';
      icon = <Minus size={13} color={color} />;
      break;
  }

  return (
    <Tooltip title={`Priority: ${label}`}>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          color,
          fontSize: '0.75rem',
          fontWeight: 600,
          userSelect: 'none'
        }}
      >
        {icon}
        <span>{priority}</span>
      </Box>
    </Tooltip>
  );
};

export const SeverityBadge: React.FC<{ severity: IssueSeverity | string }> = ({ severity }) => {
  let color = '#8b949e';
  switch (severity) {
    case IssueSeverity.BLOCKER:
      color = '#f85149';
      break;
    case IssueSeverity.CRITICAL:
      color = '#f0883e';
      break;
    case IssueSeverity.MAJOR:
      color = '#d29922';
      break;
    case IssueSeverity.MINOR:
      color = '#58a6ff';
      break;
    case IssueSeverity.TRIVIAL:
      color = '#8b949e';
      break;
  }

  return (
    <Box
      sx={{
        display: 'inline-block',
        px: 0.8,
        py: 0.2,
        borderRadius: '3px',
        backgroundColor: `${color}15`,
        color,
        border: `1px solid ${color}33`,
        fontSize: '0.6875rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em'
      }}
    >
      {severity}
    </Box>
  );
};

