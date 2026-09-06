export interface LabelStyle {
  bg: string;
  text: string;
  border: string;
  color: string;
}

export function getLabelColor(name: string, customColor?: string): LabelStyle {
  const n = (name || '').toLowerCase().trim();

  if (n.includes('bug') || n.includes('defect') || n.includes('error')) {
    return {
      bg: 'rgba(239, 68, 68, 0.12)',
      text: '#ef4444',
      border: 'rgba(239, 68, 68, 0.3)',
      color: '#ef4444'
    };
  }

  if (n.includes('security') || n.includes('vulnerability') || n.includes('auth')) {
    return {
      bg: 'rgba(168, 85, 247, 0.12)',
      text: '#a855f7',
      border: 'rgba(168, 85, 247, 0.3)',
      color: '#a855f7'
    };
  }

  if (n.includes('perf') || n.includes('latency') || n.includes('memory')) {
    return {
      bg: 'rgba(245, 158, 11, 0.12)',
      text: '#f59e0b',
      border: 'rgba(245, 158, 11, 0.3)',
      color: '#f59e0b'
    };
  }

  if (n.includes('arch') || n.includes('rfc') || n.includes('design')) {
    return {
      bg: 'rgba(59, 130, 246, 0.12)',
      text: '#3b82f6',
      border: 'rgba(59, 130, 246, 0.3)',
      color: '#3b82f6'
    };
  }

  if (n.includes('db') || n.includes('data') || n.includes('sql') || n.includes('schema')) {
    return {
      bg: 'rgba(6, 182, 212, 0.12)',
      text: '#06b6d4',
      border: 'rgba(6, 182, 212, 0.3)',
      color: '#06b6d4'
    };
  }

  if (n.includes('feat') || n.includes('ui') || n.includes('frontend')) {
    return {
      bg: 'rgba(16, 185, 129, 0.12)',
      text: '#10b981',
      border: 'rgba(16, 185, 129, 0.3)',
      color: '#10b981'
    };
  }

  if (customColor) {
    return {
      bg: `${customColor}20`,
      text: customColor,
      border: `${customColor}40`,
      color: customColor
    };
  }

  return {
    bg: 'rgba(99, 102, 241, 0.12)',
    text: '#6366f1',
    border: 'rgba(99, 102, 241, 0.3)',
    color: '#6366f1'
  };
}

