export interface LabelStyle {
  bg: string;
  text: string;
  border: string;
  color: string;
  activeBg: string;
  activeText: string;
}

export function getLabelColor(name: string, customColor?: string, isSelected?: boolean): LabelStyle {
  const n = (name || '').toLowerCase().trim();

  let base = {
    bg: 'rgba(99, 102, 241, 0.12)',
    text: '#818cf8',
    border: 'rgba(99, 102, 241, 0.35)',
    color: '#818cf8',
    activeBg: '#6366f1',
    activeText: '#ffffff'
  };

  if (n.includes('bug') || n.includes('defect') || n.includes('error') || n.includes('lỗi')) {
    base = {
      bg: 'rgba(248, 81, 73, 0.15)',
      text: '#f85149',
      border: 'rgba(248, 81, 73, 0.4)',
      color: '#f85149',
      activeBg: '#da3633',
      activeText: '#ffffff'
    };
  } else if (n.includes('security') || n.includes('vulnerability') || n.includes('auth')) {
    base = {
      bg: 'rgba(188, 140, 255, 0.15)',
      text: '#bc8cff',
      border: 'rgba(188, 140, 255, 0.4)',
      color: '#bc8cff',
      activeBg: '#8957e5',
      activeText: '#ffffff'
    };
  } else if (n.includes('perf') || n.includes('latency') || n.includes('memory')) {
    base = {
      bg: 'rgba(210, 153, 34, 0.15)',
      text: '#d29922',
      border: 'rgba(210, 153, 34, 0.4)',
      color: '#d29922',
      activeBg: '#9e6a03',
      activeText: '#ffffff'
    };
  } else if (n.includes('backend') || n.includes('api') || n.includes('server')) {
    base = {
      bg: 'rgba(88, 166, 255, 0.15)',
      text: '#58a6ff',
      border: 'rgba(88, 166, 255, 0.4)',
      color: '#58a6ff',
      activeBg: '#1f6feb',
      activeText: '#ffffff'
    };
  } else if (n.includes('feat') || n.includes('ui') || n.includes('frontend') || n.includes('ux')) {
    base = {
      bg: 'rgba(63, 185, 80, 0.15)',
      text: '#3fb950',
      border: 'rgba(63, 185, 80, 0.4)',
      color: '#3fb950',
      activeBg: '#238636',
      activeText: '#ffffff'
    };
  } else if (n.includes('db') || n.includes('data') || n.includes('sql') || n.includes('schema')) {
    base = {
      bg: 'rgba(57, 197, 207, 0.15)',
      text: '#39c5cf',
      border: 'rgba(57, 197, 207, 0.4)',
      color: '#39c5cf',
      activeBg: '#1b7c83',
      activeText: '#ffffff'
    };
  } else if (n.includes('doc') || n.includes('guide')) {
    base = {
      bg: 'rgba(163, 113, 247, 0.15)',
      text: '#a371f7',
      border: 'rgba(163, 113, 247, 0.4)',
      color: '#a371f7',
      activeBg: '#7057ff',
      activeText: '#ffffff'
    };
  } else if (customColor && customColor.startsWith('#')) {
    base = {
      bg: `${customColor}22`,
      text: customColor,
      border: `${customColor}55`,
      color: customColor,
      activeBg: customColor,
      activeText: '#ffffff'
    };
  }

  if (isSelected) {
    return {
      ...base,
      bg: base.activeBg,
      text: base.activeText,
      border: base.activeBg
    };
  }

  return base;
}

