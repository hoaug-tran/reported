import React, { useState } from 'react';
import { Box, Typography, Link, Checkbox } from '@mui/material';
import DOMPurify from 'dompurify';
import { CodeBlock } from '../code/CodeBlock';
import { JsonViewer } from '../json/JsonViewer';
import { useThemeContext } from '../../contexts/ThemeContext';
import { MediaLightbox } from '../common/MediaLightbox';
import { AudioPlayer } from '../common/AudioPlayer';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const { tokens } = useThemeContext();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState('');
  const [lightboxAlt, setLightboxAlt] = useState('');

  const handleContainerClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target && target.tagName === 'IMG' && target.classList.contains('markdown-img')) {
      const img = target as HTMLImageElement;
      setLightboxSrc(img.src);
      setLightboxAlt(img.alt || 'Image Preview');
      setLightboxOpen(true);
    }
  };

  const segments = React.useMemo(() => {
    const raw = content || '';
    const blockRegex = /(?:```([a-zA-Z0-9_-]*)\n([\s\S]*?)```)|(?:\[(?:🎙️|Voice|Audio|Tin nhắn thoại)[^\]]*\]\(([^)]+)\))|(?:\[(?:🎬|Video|Clip|[^\]]*\.(?:mp4|mov|webm|mkv|avi))[^\]]*\]\(([^)]+)\))|(?:\[[^\]]*\]\(([^)]+\.(?:mp4|mov|webm|mkv|avi)(?:\?[^)]*)?)\))/gi;
    const parts: Array<{ type: 'text' | 'code' | 'json' | 'audio' | 'video'; language?: string; content: string }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = blockRegex.exec(raw)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: raw.substring(lastIndex, match.index)
        });
      }

      if (match[2] !== undefined) {
        const lang = match[1] || 'text';
        const code = match[2];
        if (lang.toLowerCase() === 'json') {
          parts.push({ type: 'json', language: 'json', content: code });
        } else {
          parts.push({ type: 'code', language: lang, content: code });
        }
      } else if (match[3] !== undefined) {
        parts.push({ type: 'audio', content: match[3] });
      } else if (match[4] !== undefined) {
        parts.push({ type: 'video', content: match[4] });
      } else if (match[5] !== undefined) {
        parts.push({ type: 'video', content: match[5] });
      }

      lastIndex = blockRegex.lastIndex;
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
    let formatted = text;

    formatted = formatted.replace(
      /(?:^|\n)> \[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*\n((?:>.*(?:\n|$))*)/gi,
      (_, alertType, alertBody) => {
        const type = alertType.toUpperCase();
        const content = alertBody
          .split('\n')
          .map((l: string) => l.replace(/^>[ \t]?/, ''))
          .join('\n')
          .trim();
        return `\n<div class="github-alert github-alert-${type.toLowerCase()}"><div class="alert-title">${type}</div><div class="alert-content">${content}</div></div>\n`;
      }
    );

    formatted = formatted.replace(
      /(?:(?:^|\n)\|[^\n]+\|\r?\n\|(?:[ \t]*:?-+:?[ \t]*\|)+\r?\n(?:\|[^\n]+\|\r?\n?)+)/g,
      (tableBlock) => {
        const rows = tableBlock.trim().split(/\r?\n/).map(r => r.trim());
        if (rows.length < 3) return tableBlock;
        const headerCols = rows[0].replace(/^\||\|$/g, '').split('|').map(c => c.trim());
        const bodyRows = rows.slice(2).map(row => row.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));

        let tableHtml = '<div class="table-wrapper"><table class="markdown-table"><thead><tr>';
        headerCols.forEach(h => {
          tableHtml += `<th>${h}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';
        bodyRows.forEach(cols => {
          tableHtml += '<tr>';
          cols.forEach(cell => {
            tableHtml += `<td>${cell}</td>`;
          });
          tableHtml += '</tr>';
        });
        tableHtml += '</tbody></table></div>';
        return `\n${tableHtml}\n`;
      }
    );

    formatted = formatted.replace(
      /@([a-zA-Z0-9_-]+)/g,
      '<a href="/users/$1" class="mention-tag">@$1</a>'
    );

    formatted = formatted.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="markdown-img" />');
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_all, title, url) => {
      const isFile = title.includes('📎') || /\.(pdf|docx?|xlsx?|pptx?|zip|tar|gz|txt|csv|json|log|sql)(\?.*)?$/i.test(title);
      const cls = isFile ? 'file-link' : 'markdown-link';
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="${cls}">${title}</a>`;
    });

    formatted = formatted.replace(
      /(^|[^"'>=([])(https?:\/\/[^\s<>"'()]+)/gi,
      '$1<a href="$2" target="_blank" rel="noopener noreferrer" class="markdown-link">$2</a>'
    );

    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/~~(.*?)~~/g, '<del>$1</del>');
    formatted = formatted.replace(/^---$/gm, '<hr class="markdown-hr" />');

    formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    formatted = formatted.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    formatted = formatted.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    formatted = formatted.replace(/^# (.*$)/gim, '<h1>$1</h1>');

    formatted = formatted.replace(/(?:^[ \t]*>[ \t]?(?:.*(?:\r?\n|$)))+/gm, (match) => {
      if (match.includes('github-alert')) return match;
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
        'li', 'ul', 'ol', 'p', 'br', 'a', 'div', 'span', 'input',
        'table', 'thead', 'tbody', 'tr', 'th', 'td', 'img', 'hr',
        'audio', 'video', 'source'
      ],
      ALLOWED_ATTR: ['href', 'class', 'type', 'checked', 'disabled', 'src', 'alt', 'target', 'rel', 'controls', 'autoplay', 'loop', 'muted', 'poster']
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
          '& .markdown-link': {
            color: tokens.primary,
            textDecoration: 'none',
            fontWeight: 500,
            wordBreak: 'break-all',
            '&:hover': { textDecoration: 'underline' }
          },
          '& .file-link': {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            px: 1.2,
            py: 0.5,
            my: 0.5,
            borderRadius: '6px',
            backgroundColor: tokens.surfaceSecondary,
            border: `1px solid ${tokens.border}`,
            color: tokens.primary,
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: '0.8125rem',
            transition: 'background-color 0.15s, border-color 0.15s',
            '&:hover': {
              backgroundColor: tokens.hover,
              borderColor: tokens.primary,
              textDecoration: 'none'
            }
          },
          '& .markdown-img': {
            maxWidth: '100%',
            height: 'auto',
            borderRadius: '6px',
            border: `1px solid ${tokens.border}`,
            my: 1,
            cursor: 'zoom-in',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            '&:hover': {
              transform: 'scale(1.015)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)'
            }
          },
          '& .markdown-hr': {
            border: 'none',
            borderTop: `1px solid ${tokens.border}`,
            my: 2
          },
          '& .table-wrapper': {
            overflowX: 'auto',
            my: 1.5,
            borderRadius: '6px',
            border: `1px solid ${tokens.border}`
          },
          '& .markdown-table': {
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.8125rem',
            '& th': {
              backgroundColor: tokens.surfaceSecondary,
              padding: '8px 12px',
              textAlign: 'left',
              fontWeight: 600,
              borderBottom: `1px solid ${tokens.border}`
            },
            '& td': {
              padding: '8px 12px',
              borderBottom: `1px solid ${tokens.border}`
            },
            '& tr:last-child td': {
              borderBottom: 'none'
            }
          },
          '& .github-alert': {
            p: 1.5,
            my: 1.5,
            borderRadius: '6px',
            borderLeft: '4px solid',
            backgroundColor: tokens.surfaceSecondary,
            '& .alert-title': {
              fontWeight: 700,
              fontSize: '0.8125rem',
              mb: 0.5,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }
          },
          '& .github-alert-note': {
            borderColor: '#58a6ff',
            '& .alert-title': { color: '#58a6ff' }
          },
          '& .github-alert-tip': {
            borderColor: '#3fb950',
            '& .alert-title': { color: '#3fb950' }
          },
          '& .github-alert-important': {
            borderColor: '#bc8cff',
            '& .alert-title': { color: '#bc8cff' }
          },
          '& .github-alert-warning': {
            borderColor: '#d29922',
            '& .alert-title': { color: '#d29922' }
          },
          '& .github-alert-caution': {
            borderColor: '#f85149',
            '& .alert-title': { color: '#f85149' }
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
    <Box sx={{ width: '100%' }} onClick={handleContainerClick}>
      {segments.map((seg, idx) => {
        if (seg.type === 'code') {
          return <CodeBlock key={idx} code={seg.content} language={seg.language} />;
        }
        if (seg.type === 'json') {
          return <JsonViewer key={idx} data={seg.content} title="JSON Payload" />;
        }
        if (seg.type === 'audio') {
          return (
            <Box key={idx} sx={{ my: 1.5, maxWidth: 420 }}>
              <AudioPlayer src={seg.content} />
            </Box>
          );
        }
        if (seg.type === 'video') {
          const videoSrc = seg.content.includes('?')
            ? (seg.content.includes('inline=true') ? seg.content : `${seg.content}&inline=true`)
            : `${seg.content}?inline=true`;
          return (
            <Box key={idx} sx={{ my: 1.5, maxWidth: 640 }}>
              <video
                src={videoSrc}
                controls
                preload="metadata"
                playsInline
                style={{
                  width: '100%',
                  maxHeight: 420,
                  borderRadius: 8,
                  backgroundColor: '#000000',
                  border: `1px solid ${tokens.border}`,
                  display: 'block'
                }}
              />
            </Box>
          );
        }
        return <React.Fragment key={idx}>{renderTextSegment(seg.content)}</React.Fragment>;
      })}

      <MediaLightbox
        open={lightboxOpen}
        src={lightboxSrc}
        alt={lightboxAlt}
        onClose={() => setLightboxOpen(false)}
      />
    </Box>
  );
};

