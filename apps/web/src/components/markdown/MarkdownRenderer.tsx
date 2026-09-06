import React from 'react';
import { Box, Typography, Link, Checkbox } from '@mui/material';
import DOMPurify from 'dompurify';
import { CodeBlock } from '../code/CodeBlock';
import { JsonViewer } from '../json/JsonViewer';
import { useThemeContext } from '../../contexts/ThemeContext';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const { tokens } = useThemeContext();

  const segments = React.useMemo(() => {
    const raw = content || '';
    const regex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts: Array<{ type: 'text' | 'code' | 'json'; language?: string; content: string }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(raw)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: raw.substring(lastIndex, match.index)
        });
      }
      const lang = match[1] || 'text';
      const code = match[2];
      if (lang.toLowerCase() === 'json') {
        parts.push({ type: 'json', language: 'json', content: code });
      } else {
        parts.push({ type: 'code', language: lang, content: code });
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < raw.length) {
      parts.push({
        type: 'text',
        content: raw.substring(lastIndex)
      });
    }

    return parts;
  }, [content]);

  const renderTextSegment = (text: string) => {
    let formatted = text.replace(
      /@([a-zA-Z0-9_-]+)/g,
      '<a href="/users/$1" class="mention-tag">@$1</a>'
    );

    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/~~(.*?)~~/g, '<del>$1</del>');

    formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    formatted = formatted.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    formatted = formatted.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    formatted = formatted.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    formatted = formatted.replace(/(?:^[ \t]*>[ \t]?(?:.*(?:\r?\n|$)))+/gm, (match) => {
      const inner = match
        .split(/\r?\n/)
        .map(line => line.replace(/^[ \t]*>[ \t]?/, '').trim())
        .filter(line => line.length > 0)
        .join('<br/>');
      return `<blockquote>${inner}</blockquote>\n`;
    });

    formatted = formatted.replace(/^- \[x\] (.*$)/gim, '<div class="checklist-item checked"><input type="checkbox" checked disabled /> <span>$1</span></div>');
    formatted = formatted.replace(/^- \[ \] (.*$)/gim, '<div class="checklist-item"><input type="checkbox" disabled /> <span>$1</span></div>');

    formatted = formatted.replace(/^- (.*$)/gim, '<li>$1</li>');

    formatted = formatted.replace(/\n\n/g, '<br/><br/>');
    formatted = formatted.replace(/<\/blockquote>\s*(?:<br\s*\/?>)+/gi, '</blockquote>');

    const cleanHtml = DOMPurify.sanitize(formatted, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'strong', 'em', 'del', 'code', 'blockquote',
        'li', 'ul', 'ol', 'p', 'br', 'a', 'div', 'span', 'input'
      ],
      ALLOWED_ATTR: ['href', 'class', 'type', 'checked', 'disabled']
    });

    return (
      <Box
        sx={{
          lineHeight: 1.65,
          color: tokens.textPrimary,
          fontSize: '0.875rem',
          '& h1': { fontSize: '1.4rem', fontWeight: 600, my: 1.5, pb: 0.5, borderBottom: `1px solid ${tokens.border}` },
          '& h2': { fontSize: '1.2rem', fontWeight: 600, my: 1.25, pb: 0.5, borderBottom: `1px solid ${tokens.border}` },
          '& h3': { fontSize: '1.05rem', fontWeight: 600, my: 1 },
          '& blockquote': {
            m: 0,
            mt: 0.5,
            mb: 0.75,
            py: 0.25,
            pl: 1.5,
            borderLeft: `3px solid ${tokens.border}`,
            color: tokens.textSecondary,
            fontStyle: 'normal'
          },
          '& .inline-code': {
            px: 0.6,
            py: 0.15,
            borderRadius: '4px',
            backgroundColor: tokens.surfaceSecondary,
            color: tokens.textPrimary,
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.8125rem'
          },
          '& .mention-tag': {
            color: tokens.primary,
            backgroundColor: tokens.selected,
            borderRadius: '3px',
            px: 0.5,
            py: 0.1,
            fontWeight: 600,
            textDecoration: 'none',
            fontSize: '0.8125rem',
            '&:hover': { textDecoration: 'underline' }
          },
          '& .checklist-item': {
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            my: '4px'
          },
          '& li': {
            ml: 2,
            my: 0.25
          }
        }}
        dangerouslySetInnerHTML={{ __html: cleanHtml }}
      />
    );
  };

  return (
    <Box sx={{ width: '100%' }}>
      {segments.map((seg, idx) => {
        if (seg.type === 'code') {
          return <CodeBlock key={idx} code={seg.content} language={seg.language} />;
        }
        if (seg.type === 'json') {
          return <JsonViewer key={idx} data={seg.content} title="JSON Payload" />;
        }
        return <React.Fragment key={idx}>{renderTextSegment(seg.content)}</React.Fragment>;
      })}
    </Box>
  );
};

