import React, { useState, useMemo } from 'react';
import { Box, Button, IconButton, Tooltip, Typography, Collapse } from '@mui/material';
import { Copy, Check, ChevronDown, ChevronRight, ChevronsUpDown, AlertTriangle } from 'lucide-react';
import { useThemeContext } from '../../contexts/ThemeContext';

interface JsonViewerProps {
  data: unknown;
  title?: string;
  initialCollapsedDepth?: number;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({
  data,
  title = 'JSON Payload',
  initialCollapsedDepth = 2
}) => {
  const { tokens, resolvedMode } = useThemeContext();
  const [copied, setCopied] = useState(false);
  const [isMinified, setIsMinified] = useState(false);
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());

  const { parsed, isValid, error } = useMemo(() => {
    if (typeof data === 'object' && data !== null) {
      return { parsed: data, isValid: true, error: null };
    }
    if (typeof data === 'string') {
      try {
        const p = JSON.parse(data);
        return { parsed: p, isValid: true, error: null };
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        return { parsed: null, isValid: false, error: errMsg };
      }
    }
    return { parsed: data, isValid: true, error: null };
  }, [data]);

  const handleCopy = () => {
    const text = isMinified ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleNode = (path: string) => {
    setCollapsedKeys(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const expandAll = () => setCollapsedKeys(new Set());

  const renderValue = (value: unknown, path: string, depth: number): React.ReactNode => {
    if (value === null) return <span style={{ color: '#79c0ff' }}>null</span>;
    if (typeof value === 'boolean') return <span style={{ color: '#ff7b72' }}>{value ? 'true' : 'false'}</span>;
    if (typeof value === 'number') return <span style={{ color: '#79c0ff' }}>{value}</span>;
    if (typeof value === 'string') return <span style={{ color: '#a5d6ff' }}>"{value}"</span>;

    const isArray = Array.isArray(value);
    const obj = (value && typeof value === 'object') ? (value as Record<string, unknown>) : {};
    const keys = Object.keys(obj);
    const isCollapsed = collapsedKeys.has(path) || (depth >= initialCollapsedDepth && !collapsedKeys.has(`open_${path}`));

    if (keys.length === 0) {
      return <span>{isArray ? '[]' : '{}'}</span>;
    }

    return (
      <Box component="span" sx={{ display: 'inline-block' }}>
        <Box
          component="span"
          onClick={() => toggleNode(path)}
          sx={{
            cursor: 'pointer',
            userSelect: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            color: tokens.textSecondary,
            '&:hover': { color: tokens.textPrimary }
          }}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          <span>{isArray ? `Array(${keys.length})` : '{...}'}</span>
        </Box>

        <Collapse in={!isCollapsed}>
          <Box sx={{ pl: 2, borderLeft: `1px dashed ${tokens.border}`, my: 0.25 }}>
            {keys.map((k) => {
              const currentPath = `${path}.${k}`;
              return (
                <Box key={k} sx={{ lineHeight: 1.5 }}>
                  <span style={{ color: resolvedMode === 'dark' ? '#7ee787' : '#116329', fontWeight: 500 }}>
                    "{k}"
                  </span>
                  <span style={{ color: tokens.textSecondary, marginRight: 6 }}>: </span>
                  {renderValue(obj[k], currentPath, depth + 1)}
                </Box>
              );
            })}
          </Box>
        </Collapse>
      </Box>
    );
  };

  if (!isValid) {
    return (
      <Box
        sx={{
          my: 1.5,
          p: 1.5,
          borderRadius: '6px',
          border: `1px solid ${tokens.error}`,
          backgroundColor: 'rgba(248, 81, 73, 0.08)',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '0.8125rem'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: tokens.error, mb: 1 }}>
          <AlertTriangle size={18} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'inherit' }}>
            Invalid JSON: {error}
          </Typography>
        </Box>
        <Box
          component="pre"
          sx={{ m: 0, p: 1, backgroundColor: tokens.surface, borderRadius: '6px', overflowX: 'auto' }}
        >
          {String(data)}
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        my: 1.5,
        borderRadius: '6px',
        border: `1px solid ${tokens.border}`,
        backgroundColor: tokens.codeBackground,
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: '0.8125rem',
        overflow: 'hidden'
      }}
    >

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 0.5,
          borderBottom: `1px solid ${tokens.border}`,
          backgroundColor: resolvedMode === 'dark' ? '#161b22' : '#f6f8fa'
        }}
      >
        <Typography
          variant="caption"
          sx={{ fontWeight: 600, color: tokens.textSecondary, textTransform: 'uppercase' }}
        >
          {title}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Button
            size="small"
            variant="text"
            onClick={() => setIsMinified(!isMinified)}
            sx={{ px: 1, py: 0.25, fontSize: '0.75rem', minWidth: 'auto', color: tokens.textSecondary }}
          >
            {isMinified ? 'Prettify' : 'Minify'}
          </Button>

          {!isMinified && (
            <Tooltip title="Expand all">
              <IconButton size="small" onClick={expandAll} sx={{ color: tokens.textSecondary }}>
                <ChevronsUpDown size={16} />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title={copied ? 'Copied!' : 'Copy JSON'}>
            <IconButton size="small" onClick={handleCopy} sx={{ color: tokens.textSecondary }}>
              {copied ? <Check size={16} color={tokens.success} /> : <Copy size={16} />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ p: 1.5, overflowX: 'auto', maxHeight: 420 }}>
        {isMinified ? (
          <code>{JSON.stringify(parsed)}</code>
        ) : (
          renderValue(parsed, 'root', 0)
        )}
      </Box>
    </Box>
  );
};

