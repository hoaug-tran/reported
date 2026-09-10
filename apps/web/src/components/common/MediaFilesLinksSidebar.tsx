import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, IconButton, Collapse, Button, Tooltip, CircularProgress
} from '@mui/material';
import {
  ChevronDown, ChevronUp, Image as ImageIcon, FileText, Download,
  ExternalLink, CheckCircle2, Plus, Paperclip, FileCode, Archive, File, Mic
} from 'lucide-react';
import { useThemeContext } from '../../contexts/ThemeContext';
import { apiFetch } from '../../api/client';
import { MediaLightbox } from './MediaLightbox';
import { uploadFileWithChunking } from '../../utils/chunkedUpload';
import { CommentDto } from '@reported/contracts';

interface AttachmentItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  inlineUrl: string;
  isVoiceNote?: boolean;
  createdAt: string;
}

interface MediaFilesLinksSidebarProps {
  targetType: 'ISSUE' | 'REVIEW';
  targetId: string;
  content?: string;
  comments?: CommentDto[];
  prUrl?: string | null;
  isVi?: boolean;
}

export const MediaFilesLinksSidebar: React.FC<MediaFilesLinksSidebarProps> = ({
  targetType,
  targetId,
  content = '',
  comments = [],
  prUrl,
  isVi = true
}) => {
  const { tokens } = useThemeContext();

  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [mediaOpen, setMediaOpen] = useState(true);
  const [filesOpen, setFilesOpen] = useState(true);
  const [linksOpen, setLinksOpen] = useState(true);
  const [showAllFiles, setShowAllFiles] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'media' | 'files' | 'links'>('all');

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState('');
  const [lightboxAlt, setLightboxAlt] = useState('');

  const fetchAttachments = useCallback(async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      const items = await apiFetch<AttachmentItem[]>(`/attachments?targetType=${targetType}&targetId=${targetId}`);
      setAttachments(items || []);
    } catch {
      setAttachments([]);
    } finally {
      setLoading(false);
    }
  }, [targetType, targetId]);

  useEffect(() => {
    fetchAttachments();
  }, [fetchAttachments]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await uploadFileWithChunking(file, file.name, {
        targetType,
        targetId
      });
      await fetchAttachments();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const combinedContent = useMemo(() => {
    const parts = [content || ''];
    if (comments && comments.length > 0) {
      for (const c of comments) {
        if (!c.isDeleted && c.content) {
          parts.push(c.content);
        }
        if (c.replies && c.replies.length > 0) {
          for (const r of c.replies) {
            if (!r.isDeleted && r.content) {
              parts.push(r.content);
            }
          }
        }
      }
    }
    return parts.join('\n\n');
  }, [content, comments]);

  const isImageFile = (filenameOrUrl: string, mimeType?: string) => {
    if (mimeType && mimeType.startsWith('image/')) return true;
    return /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)(\?.*)?$/i.test(filenameOrUrl);
  };

  const images = useMemo(() => {
    const list: AttachmentItem[] = [
      ...attachments.filter(a => isImageFile(a.url || a.filename || a.originalName, a.mimeType))
    ];
    const existingUrls = new Set(list.map(a => a.inlineUrl || a.url));

    const imgMatches = combinedContent.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g);
    for (const m of imgMatches) {
      const alt = m[1] || 'Ảnh đính kèm';
      const url = m[2];
      if (!existingUrls.has(url)) {
        existingUrls.add(url);
        list.push({
          id: url,
          filename: alt,
          originalName: alt,
          mimeType: 'image/png',
          sizeBytes: 0,
          url,
          inlineUrl: url,
          createdAt: new Date().toISOString()
        });
      }
    }

    const fileMatches = combinedContent.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
    for (const m of fileMatches) {
      const alt = m[1];
      const url = m[2];
      if (isImageFile(url) && !existingUrls.has(url)) {
        existingUrls.add(url);
        list.push({
          id: url,
          filename: alt,
          originalName: alt,
          mimeType: 'image/png',
          sizeBytes: 0,
          url,
          inlineUrl: url,
          createdAt: new Date().toISOString()
        });
      }
    }

    return list;
  }, [attachments, combinedContent]);

  const nonMediaFiles = useMemo(() => {
    const list: AttachmentItem[] = [
      ...attachments.filter(a => !isImageFile(a.url || a.filename || a.originalName, a.mimeType))
    ];
    const existingUrls = new Set(list.map(a => a.url));

    const fileMatches = combinedContent.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
    for (const m of fileMatches) {
      const title = m[1];
      const url = m[2];
      if (isImageFile(url)) continue;
      const isVoice = title.includes('🎙️') || title.toLowerCase().includes('tin nhắn thoại') || title.toLowerCase().includes('voice');
      const isAttachmentUrl = url.includes('/api/v1/attachments/');
      const hasFileExt = /\.(pdf|docx?|xlsx?|pptx?|zip|tar|gz|txt|csv|json|webm|mp3|wav|m4a|log|sql)(\?.*)?$/i.test(url);

      if ((isVoice || isAttachmentUrl || hasFileExt) && !existingUrls.has(url)) {
        existingUrls.add(url);
        const cleanName = title.replace(/^[📎🎙️\s]+/, '').trim() || (isVoice ? 'Tin nhắn thoại' : 'Tệp đính kèm');
        list.push({
          id: url,
          filename: cleanName,
          originalName: cleanName,
          mimeType: isVoice ? 'audio/webm' : (cleanName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream'),
          sizeBytes: 0,
          url,
          inlineUrl: url,
          isVoiceNote: isVoice,
          createdAt: new Date().toISOString()
        });
      }
    }
    return list;
  }, [attachments, combinedContent]);

  const extractedLinks = useMemo(() => {
    const list: Array<{ url: string; title: string }> = [];
    if (prUrl) {
      list.push({ url: prUrl, title: 'Linked Pull Request' });
    }

    const isExcluded = (url: string) => {
      return (
        url.includes('/api/v1/attachments/') ||
        url.startsWith('#') ||
        isImageFile(url) ||
        /\.(mp4|mov|webm|mkv|avi)(\?.*)?$/i.test(url)
      );
    };

    const linkMatches = combinedContent.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g);
    for (const m of linkMatches) {
      const title = m[1];
      const url = m[2];
      if (!isExcluded(url) && !list.some(l => l.url === url)) {
        list.push({ title: title.replace(/^[📎🎙️\s]+/, '').trim() || url, url });
      }
    }

    const rawUrlMatches = combinedContent.matchAll(/(https?:\/\/[^\s\)\>\]]+)/g);
    for (const m of rawUrlMatches) {
      const url = m[1].replace(/[.,;:!?]+$/, '');
      if (!isExcluded(url) && !list.some(l => l.url === url)) {
        list.push({ title: url, url });
      }
    }

    return list;
  }, [combinedContent, prUrl]);

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return 'Đính kèm';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('vi-VN');
  };

  const renderFileIcon = (mime: string, name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';

    if (ext === 'doc' || ext === 'docx' || mime.includes('word')) {
      return (
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '6px',
            backgroundColor: '#2563eb',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.875rem',
            flexShrink: 0
          }}
        >
          W
        </Box>
      );
    }
    if (ext === 'xls' || ext === 'xlsx' || mime.includes('sheet') || mime.includes('excel')) {
      return (
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '6px',
            backgroundColor: '#16a34a',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.875rem',
            flexShrink: 0
          }}
        >
          X
        </Box>
      );
    }
    if (ext === 'pdf' || mime.includes('pdf')) {
      return (
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '6px',
            backgroundColor: '#dc2626',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '0.75rem',
            flexShrink: 0
          }}
        >
          PDF
        </Box>
      );
    }
    if (ext === 'zip' || ext === 'tar' || ext === 'gz' || mime.includes('zip')) {
      return (
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '6px',
            backgroundColor: '#ca8a04',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <Archive size={18} />
        </Box>
      );
    }
    if (ext === 'webm' || ext === 'mp3' || ext === 'wav' || ext === 'ogg' || ext === 'm4a' || mime.startsWith('audio/') || name.toLowerCase().includes('thoại')) {
      return (
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '6px',
            backgroundColor: `${tokens.primary}20`,
            color: tokens.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <Mic size={18} />
        </Box>
      );
    }
    return (
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: '6px',
          backgroundColor: tokens.surfaceSecondary,
          border: `1px solid ${tokens.border}`,
          color: tokens.textSecondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <FileText size={18} />
      </Box>
    );
  };

  const displayedFiles = showAllFiles ? nonMediaFiles : nonMediaFiles.slice(0, 3);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '8px',
        border: `1px solid ${tokens.border}`,
        backgroundColor: tokens.surface,
        overflow: 'hidden',
        mt: 2
      }}
    >
      <Box
        sx={{
          p: 1.5,
          borderBottom: `1px solid ${tokens.divider}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.04em', color: tokens.textSecondary, textTransform: 'uppercase' }}>
          {isVi ? 'Phương tiện & Tệp đính kèm' : 'Media & Attachments'}
        </Typography>

        <label style={{ cursor: 'pointer' }}>
          <input
            type="file"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
            disabled={isUploading}
          />
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              fontSize: '0.75rem',
              fontWeight: 600,
              color: tokens.primary,
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' }
            }}
          >
            {isUploading ? <CircularProgress size={12} /> : <Plus size={14} />}
            {isVi ? 'Thêm' : 'Add'}
          </Box>
        </label>
      </Box>

      {/* Category Tab Bar */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1.2,
          py: 0.8,
          borderBottom: `1px solid ${tokens.divider}`,
          backgroundColor: tokens.surfaceSecondary,
          overflowX: 'auto',
          '&::-webkit-scrollbar': { display: 'none' }
        }}
      >
        {[
          { id: 'all', label: isVi ? 'Tất cả' : 'All', count: images.length + nonMediaFiles.length + extractedLinks.length },
          { id: 'media', label: isVi ? 'Ảnh' : 'Media', count: images.length },
          { id: 'files', label: isVi ? 'Tệp' : 'Files', count: nonMediaFiles.length },
          { id: 'links', label: 'Link', count: extractedLinks.length }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Button
              key={tab.id}
              size="small"
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'media') setMediaOpen(true);
                if (tab.id === 'files') setFilesOpen(true);
                if (tab.id === 'links') setLinksOpen(true);
              }}
              sx={{
                minWidth: 'auto',
                px: 1,
                py: 0.25,
                borderRadius: '12px',
                fontSize: '0.72rem',
                fontWeight: isActive ? 700 : 500,
                textTransform: 'none',
                color: isActive ? tokens.primary : tokens.textSecondary,
                backgroundColor: isActive ? `${tokens.primary}18` : 'transparent',
                border: `1px solid ${isActive ? `${tokens.primary}40` : 'transparent'}`,
                '&:hover': {
                  backgroundColor: isActive ? `${tokens.primary}25` : tokens.hover
                }
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <Box
                  component="span"
                  sx={{
                    ml: 0.5,
                    px: 0.6,
                    py: 0.05,
                    fontSize: '0.65rem',
                    borderRadius: '10px',
                    backgroundColor: isActive ? tokens.primary : tokens.border,
                    color: isActive ? '#fff' : tokens.textSecondary,
                    fontWeight: 700
                  }}
                >
                  {tab.count}
                </Box>
              )}
            </Button>
          );
        })}
      </Box>

      {/* Media Section */}
      {(activeTab === 'all' || activeTab === 'media') && (
        <Box sx={{ borderBottom: activeTab === 'all' ? `1px solid ${tokens.divider}` : 'none' }}>
          <Box
            onClick={() => setMediaOpen(!mediaOpen)}
            sx={{
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none',
              '&:hover': { backgroundColor: tokens.hover }
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700, color: tokens.textPrimary }}>
              {isVi ? 'Ảnh/Video' : 'Photos/Videos'} ({images.length})
            </Typography>
            {mediaOpen ? <ChevronUp size={16} color={tokens.textSecondary} /> : <ChevronDown size={16} color={tokens.textSecondary} />}
          </Box>

          <Collapse in={mediaOpen}>
            <Box sx={{ px: 1.5, pb: 1.5 }}>
              {images.length === 0 ? (
                <Typography variant="caption" sx={{ color: tokens.textSecondary, display: 'block', textAlign: 'center', py: 1.5 }}>
                  {isVi ? 'Chưa có Ảnh/Video được chia sẻ trong hội thoại này' : 'No photos or videos shared in this item'}
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 1,
                    maxHeight: activeTab === 'all' ? 180 : 340,
                    overflowY: 'auto',
                    pr: 0.5,
                    '&::-webkit-scrollbar': { width: 4 },
                    '&::-webkit-scrollbar-thumb': { backgroundColor: tokens.border, borderRadius: 2 }
                  }}
                >
                  {images.map((img) => (
                    <Box
                      key={img.id}
                      onClick={() => {
                        setLightboxSrc(img.inlineUrl);
                        setLightboxAlt(img.originalName);
                        setLightboxOpen(true);
                      }}
                      sx={{
                        position: 'relative',
                        paddingTop: '100%',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: `1px solid ${tokens.border}`,
                        backgroundColor: tokens.surfaceSecondary,
                        '&:hover img': { transform: 'scale(1.08)' }
                      }}
                    >
                      <Box
                        component="img"
                        src={img.inlineUrl}
                        alt={img.originalName}
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          transition: 'transform 0.2s ease'
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Collapse>
        </Box>
      )}

      {/* Files Section */}
      {(activeTab === 'all' || activeTab === 'files') && (
        <Box sx={{ borderBottom: activeTab === 'all' ? `1px solid ${tokens.divider}` : 'none' }}>
          <Box
            onClick={() => setFilesOpen(!filesOpen)}
            sx={{
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none',
              '&:hover': { backgroundColor: tokens.hover }
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700, color: tokens.textPrimary }}>
              File ({nonMediaFiles.length})
            </Typography>
            {filesOpen ? <ChevronUp size={16} color={tokens.textSecondary} /> : <ChevronDown size={16} color={tokens.textSecondary} />}
          </Box>

          <Collapse in={filesOpen}>
            <Box sx={{ px: 1.5, pb: 1.5 }}>
              {nonMediaFiles.length === 0 ? (
                <Typography variant="caption" sx={{ color: tokens.textSecondary, display: 'block', textAlign: 'center', py: 1.5 }}>
                  {isVi ? 'Chưa có Tập tin được chia sẻ trong hội thoại này' : 'No files shared in this item'}
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    maxHeight: activeTab === 'all' ? 220 : 340,
                    overflowY: 'auto',
                    pr: 0.5,
                    '&::-webkit-scrollbar': { width: 4 },
                    '&::-webkit-scrollbar-thumb': { backgroundColor: tokens.border, borderRadius: 2 }
                  }}
                >
                  {displayedFiles.map((f) => (
                    <Box
                      key={f.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1,
                        borderRadius: '6px',
                        backgroundColor: tokens.surfaceSecondary,
                        border: `1px solid ${tokens.border}`,
                        transition: 'background-color 0.12s ease',
                        '&:hover': { backgroundColor: tokens.hover }
                      }}
                    >
                      {renderFileIcon(f.mimeType, f.originalName)}

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8125rem', color: tokens.textPrimary }} noWrap>
                          {f.originalName}
                        </Typography>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.2 }}>
                          <Typography variant="caption" sx={{ color: tokens.textSecondary, fontSize: '0.6875rem' }}>
                            {formatFileSize(f.sizeBytes)}
                          </Typography>
                          <CheckCircle2 size={11} color={tokens.success} />
                          <Typography variant="caption" sx={{ color: tokens.textSecondary, fontSize: '0.6875rem', ml: 'auto' }}>
                            {formatDate(f.createdAt)}
                          </Typography>
                        </Box>
                      </Box>

                      <Tooltip title={f.isVoiceNote || f.mimeType.startsWith('audio/') ? (isVi ? 'Mở / Nghe âm thanh' : 'Play audio') : (isVi ? 'Tải tệp về' : 'Download file')}>
                        <IconButton
                          size="small"
                          component="a"
                          href={f.url}
                          target={f.isVoiceNote || f.mimeType.startsWith('audio/') ? '_blank' : undefined}
                          download={f.isVoiceNote || f.mimeType.startsWith('audio/') ? undefined : f.originalName}
                          sx={{ color: tokens.textSecondary, '&:hover': { color: tokens.primary } }}
                        >
                          <Download size={16} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ))}

                  {nonMediaFiles.length > 3 && (
                    <Button
                      size="small"
                      variant="text"
                      fullWidth
                      onClick={() => setShowAllFiles(!showAllFiles)}
                      sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem', mt: 0.5 }}
                    >
                      {showAllFiles ? (isVi ? 'Thu gọn' : 'Show less') : (isVi ? 'Xem tất cả' : 'View all')}
                    </Button>
                  )}
                </Box>
              )}
            </Box>
          </Collapse>
        </Box>
      )}

      {/* Links Section */}
      {(activeTab === 'all' || activeTab === 'links') && (
        <Box>
          <Box
            onClick={() => setLinksOpen(!linksOpen)}
            sx={{
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              userSelect: 'none',
              '&:hover': { backgroundColor: tokens.hover }
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 700, color: tokens.textPrimary }}>
              Link ({extractedLinks.length})
            </Typography>
            {linksOpen ? <ChevronUp size={16} color={tokens.textSecondary} /> : <ChevronDown size={16} color={tokens.textSecondary} />}
          </Box>

          <Collapse in={linksOpen}>
            <Box sx={{ px: 1.5, pb: 1.5 }}>
              {extractedLinks.length === 0 ? (
                <Typography variant="caption" sx={{ color: tokens.textSecondary, display: 'block', textAlign: 'center', py: 1.5 }}>
                  {isVi ? 'Chưa có Link được chia sẻ trong hội thoại này' : 'No links shared in this conversation'}
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.8,
                    maxHeight: activeTab === 'all' ? 180 : 340,
                    overflowY: 'auto',
                    pr: 0.5,
                    '&::-webkit-scrollbar': { width: 4 },
                    '&::-webkit-scrollbar-thumb': { backgroundColor: tokens.border, borderRadius: 2 }
                  }}
                >
                  {extractedLinks.map((l, i) => (
                    <Box
                      key={i}
                      component="a"
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        p: 0.8,
                        px: 1,
                        borderRadius: '6px',
                        backgroundColor: tokens.surfaceSecondary,
                        textDecoration: 'none',
                        color: tokens.primary,
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        transition: 'background-color 0.12s ease',
                        '&:hover': {
                          backgroundColor: tokens.hover,
                          textDecoration: 'underline'
                        }
                      }}
                    >
                      <ExternalLink size={13} style={{ flexShrink: 0 }} />
                      <Typography variant="caption" sx={{ color: 'inherit', fontWeight: 600 }} noWrap>
                        {l.title}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Collapse>
        </Box>
      )}

      <MediaLightbox
        open={lightboxOpen}
        src={lightboxSrc}
        alt={lightboxAlt}
        onClose={() => setLightboxOpen(false)}
      />
    </Box>
  );
};
