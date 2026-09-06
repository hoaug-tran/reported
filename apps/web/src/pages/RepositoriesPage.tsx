import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, CircularProgress, Chip, Link as MuiLink,
  Card, CardContent, Divider, IconButton, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControlLabel, Switch, Alert,
  Accordion, AccordionSummary, AccordionDetails, Paper
} from '@mui/material';
import {
  FolderGit2,
  Lock,
  Globe,
  ExternalLink,
  Trash2,
  Edit2,
  RefreshCw,
  GitBranch,
  ChevronDown,
  Plus
} from 'lucide-react';
import { useLocation } from 'wouter';
import { useThemeContext } from '../contexts/ThemeContext';
import { apiFetch } from '../api/client';
import { LinkRepoModal } from '../components/github/LinkRepoModal';
import { RepositoryDto } from '@reported/contracts';
import { useI18n } from '../contexts/I18nContext';
import { Page, PageHeader, EmptyState } from '../components/common/Page';
import { buttonSx } from '../theme/ui';

export const RepositoriesPage: React.FC = () => {
  const { tokens } = useThemeContext();
  const { language } = useI18n();
  const isVi = language === 'vi';
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [repos, setRepos] = useState<RepositoryDto[]>([]);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<RepositoryDto | null>(null);
  const [editBranch, setEditBranch] = useState('main');
  const [editPrivate, setEditPrivate] = useState(false);

  const [repoPrs, setRepoPrs] = useState<Record<string, any[]>>({});
  const [loadingPrs, setLoadingPrs] = useState<Record<string, boolean>>({});

  const loadRepos = async () => {
    try {
      setLoading(true);
      const data = await apiFetch<RepositoryDto[]>('/github/repositories');
      setRepos(data || []);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : (err as { message?: string })?.message || 'Failed to load repositories';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRepos();
  }, []);

  const loadPrsForRepo = async (repoId: string) => {
    if (repoPrs[repoId]) return;
    try {
      setLoadingPrs(prev => ({ ...prev, [repoId]: true }));
      const data = await apiFetch<{ pulls: any[]; error?: string }>(`/github/repositories/${repoId}/github-pulls`);
      setRepoPrs(prev => ({ ...prev, [repoId]: data.pulls || [] }));
      if (data.error) {
        const dbPrs = await apiFetch<any[]>(`/github/repositories/${repoId}/pull-requests`);
        setRepoPrs(prev => ({ ...prev, [repoId]: dbPrs || [] }));
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : (err as { message?: string })?.message || 'Failed to fetch PRs';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setLoadingPrs(prev => ({ ...prev, [repoId]: false }));
    }
  };

  const handleSync = async (repoId: string) => {
    try {
      setMessage(null);
      await apiFetch(`/github/repositories/${repoId}/sync`, { method: 'POST' });
      setMessage({ type: 'success', text: 'Repository metadata synced with remote provider.' });
      window.dispatchEvent(new Event('reported:repo-changed'));
      loadRepos();
      setRepoPrs(prev => {
        const next = { ...prev };
        delete next[repoId];
        return next;
      });
      loadPrsForRepo(repoId);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : (err as { message?: string })?.message || 'Sync failed';
      setMessage({ type: 'error', text: errMsg });
    }
  };

  const handleDelete = async (repo: RepositoryDto) => {
    if (!confirm(`Are you sure you want to unlink repository ${repo.fullName}?`)) return;
    try {
      await apiFetch(`/github/repositories/${repo.id}`, { method: 'DELETE' });
      setMessage({ type: 'success', text: `Unlinked repository ${repo.fullName}` });
      setRepos(prev => prev.filter(item => item.id !== repo.id));
      window.dispatchEvent(new Event('reported:repo-changed'));
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : (err as { message?: string })?.message || 'Failed to unlink repository';
      setMessage({ type: 'error', text: errMsg });
    }
  };

  const handleOpenEdit = (repo: RepositoryDto) => {
    setSelectedRepo(repo);
    setEditBranch(repo.defaultBranch);
    setEditPrivate(repo.isPrivate);
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepo) return;
    try {
      await apiFetch(`/github/repositories/${selectedRepo.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          defaultBranch: editBranch,
          isPrivate: editPrivate
        })
      });
      setMessage({ type: 'success', text: `Updated ${selectedRepo.fullName}` });
      setEditModalOpen(false);
      window.dispatchEvent(new Event('reported:repo-changed'));
      loadRepos();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : (err as { message?: string })?.message || 'Failed to update repository';
      setMessage({ type: 'error', text: errMsg });
    }
  };


  return (
    <Page>
      <PageHeader
        title={isVi ? 'Repo & tích hợp code' : 'Repositories & code integration'}
        subtitle={isVi ? 'Liên kết repo GitHub/GitLab, đồng bộ PR thật và tạo review từ PR đang mở.' : 'Connect GitHub/GitLab repositories, sync real PRs, and create reviews from open PRs.'}
        action={(
          <Button
            variant="contained"
            size="small"
            startIcon={<Plus size={16} />}
            onClick={() => setLinkModalOpen(true)}
            sx={buttonSx(tokens)}
          >
            {isVi ? 'Liên kết repo' : 'Link repository'}
          </Button>
        )}
      />

      {message && (
        <Alert severity={message.type} sx={{ mb: 3, borderRadius: '8px' }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress size={32} />
        </Box>
      ) : repos.length === 0 ? (
        <EmptyState
          icon={<FolderGit2 size={44} color={tokens.textSecondary} />}
          title={isVi ? 'Chưa liên kết repo nào' : 'No repositories linked'}
          description={isVi ? 'Liên kết repo thật để lấy PR, branch và issue theo đúng workspace.' : 'Link real repositories to load PRs, branches, and issues for this workspace.'}
          action={(
            <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => setLinkModalOpen(true)} sx={buttonSx(tokens)}>
              {isVi ? 'Liên kết repo' : 'Link repository'}
            </Button>
          )}
        />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {repos.map((repo) => (
            <Card
              key={repo.id}
              elevation={0}
              sx={{
                border: `1px solid ${tokens.border}`,
                borderRadius: '8px',
                backgroundColor: tokens.surface,
                transition: 'border-color 0.15s ease',
                '&:hover': {
                  borderColor: tokens.primary
                }
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <FolderGit2 size={24} color={tokens.primary} />
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="h4" sx={{ fontWeight: 600 }}>
                          {repo.fullName}
                        </Typography>
                        <Chip
                          label={repo.provider.toUpperCase()}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            backgroundColor: repo.provider === 'gitlab' ? '#fc6d26' : '#24292f',
                            color: '#fff'
                          }}
                        />
                        {repo.isPrivate ? (
                          <Tooltip title={isVi ? 'Repo private' : 'Private repository'}>
                            <Lock size={16} color={tokens.textSecondary} />
                          </Tooltip>
                        ) : (
                          <Tooltip title={isVi ? 'Repo public' : 'Public repository'}>
                            <Globe size={16} color={tokens.textSecondary} />
                          </Tooltip>
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
                        {isVi ? 'Branch mặc định' : 'Default branch'}: <code>{repo.defaultBranch}</code>
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MuiLink
                      href={repo.webUrl || (repo.provider === 'gitlab' ? `https://gitlab.com/${repo.fullName}` : `https://github.com/${repo.fullName}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        fontSize: '0.75rem',
                        px: 1.2,
                        py: 0.5,
                        borderRadius: '6px',
                        border: `1px solid ${tokens.border}`,
                        color: tokens.textPrimary,
                        textDecoration: 'none',
                        '&:hover': {
                          backgroundColor: tokens.hover
                        }
                      }}
                    >
                      <span>{isVi ? 'Mở repo' : 'View remote'}</span>
                      <ExternalLink size={14} />
                    </MuiLink>

                    <Tooltip title="Sync Metadata">
                      <IconButton size="small" onClick={() => handleSync(repo.id)}>
                        <RefreshCw size={18} />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Edit Settings">
                      <IconButton size="small" onClick={() => handleOpenEdit(repo)}>
                        <Edit2 size={18} />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Unlink Repository">
                      <IconButton size="small" color="error" onClick={() => handleDelete(repo)}>
                        <Trash2 size={18} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {(repo.openIssuesCount || 0) > 0 && (
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 2, pt: 1.5, borderTop: `1px solid ${tokens.border}`, color: tokens.textSecondary, fontSize: '0.8125rem' }}>
                    <Chip size="small" label={`${repo.openIssuesCount || 0} ${isVi ? 'vấn đề đang mở' : 'open linked issues'}`} sx={{ borderRadius: '6px', color: tokens.textSecondary }} />
                  </Box>
                )}

                <Accordion
                  elevation={0}
                  onChange={(_, expanded) => {
                    if (expanded) loadPrsForRepo(repo.id);
                  }}
                  sx={{
                    mt: 2,
                    border: `1px solid ${tokens.border}`,
                    borderRadius: '6px !important',
                    '&:before': { display: 'none' },
                    backgroundColor: tokens.background
                  }}
                >
                  <AccordionSummary expandIcon={<ChevronDown size={18} />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <GitBranch size={18} color={tokens.primary} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {isVi ? 'Pull Request đang mở' : 'Open pull requests'}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0 }}>
                    {loadingPrs[repo.id] ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 2 }}>
                        <CircularProgress size={18} />
                        <Typography variant="caption">{isVi ? 'Đang tải PR từ GitHub...' : 'Loading open PRs from GitHub...'}</Typography>
                      </Box>
                    ) : !repoPrs[repo.id] || repoPrs[repo.id].length === 0 ? (
                      <Box sx={{ py: 1.5, color: tokens.textSecondary }}>
                        <Typography variant="body2">
                          {isVi ? 'Không có Pull Request đang mở.' : 'No open pull requests.'}
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                        {repoPrs[repo.id].slice(0, 20).map((pr) => (
                          <Box
                            key={pr.number || pr.id}
                            sx={{
                              p: 1.5,
                              borderRadius: '6px',
                              border: `1px solid ${tokens.border}`,
                              backgroundColor: tokens.surface,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: 1
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, minWidth: 0 }}>
                              <Chip
                                label="OPEN"
                                size="small"
                                sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 700, backgroundColor: '#238636', color: '#fff', flexShrink: 0 }}
                              />
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                                  #{pr.number || pr.prNumber} {pr.title}
                                </Typography>
                                <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
                                  {pr.headBranch} → {pr.baseBranch}{pr.authorLogin ? ` · @${pr.authorLogin}` : (pr.authorGithub ? ` · @${pr.authorGithub}` : '')}
                                </Typography>
                              </Box>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                              <Button
                                size="small"
                                variant="contained"
                                onClick={() => setLocation(`/reviews/new?repoId=${repo.id}&prNumber=${pr.number || pr.prNumber}`)}
                                sx={{
                                  fontSize: '0.75rem',
                                  py: 0.3,
                                  px: 1.2,
                                  borderRadius: '6px',
                                  fontWeight: 600,
                                  textTransform: 'none',
                                  '&:hover': { backgroundColor: tokens.primaryHover }
                                }}
                              >
                                {isVi ? 'Tạo review' : 'Create review'}
                              </Button>
                              {(pr.htmlUrl || pr.url) && (
                                <MuiLink
                                  href={pr.htmlUrl || pr.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: '0.75rem', color: tokens.primary, textDecoration: 'none' }}
                                >
                                  <ExternalLink size={13} />
                                </MuiLink>
                              )}
                            </Box>
                          </Box>
                        ))}
                        {repoPrs[repo.id].length > 20 && (
                          <Typography variant="caption" sx={{ color: tokens.textSecondary, mt: 1, display: 'block' }}>
                            {isVi ? `Đang hiển thị 20/${repoPrs[repo.id].length} PR. Mở repo để lọc sâu hơn.` : `Showing 20/${repoPrs[repo.id].length} PRs. Open repository for deeper filtering.`}
                          </Typography>
                        )}
                      </Box>
                    )}
                  </AccordionDetails>
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <LinkRepoModal
        open={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        onSuccess={() => {
          loadRepos();
          window.dispatchEvent(new Event('reported:repo-changed'));
          setMessage({ type: 'success', text: 'Repository linked successfully!' });
        }}
      />

      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={handleSaveEdit}>
          <DialogTitle>{isVi ? 'Cài đặt repo' : 'Repository settings'}</DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
              {isVi ? 'Cấu hình mặc định cho' : 'Configure default settings for'} <strong>{selectedRepo?.fullName}</strong>.
            </Typography>
            <TextField
              label={isVi ? 'Branch mặc định' : 'Default branch'}
              size="small"
              value={editBranch}
              onChange={(e) => setEditBranch(e.target.value)}
              fullWidth
              required
            />
            <FormControlLabel
              control={<Switch checked={editPrivate} onChange={(e) => setEditPrivate(e.target.checked)} />}
              label={isVi ? 'Repo private' : 'Private repository'}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setEditModalOpen(false)} sx={buttonSx(tokens)}>{isVi ? 'Hủy' : 'Cancel'}</Button>
            <Button type="submit" variant="contained" sx={buttonSx(tokens)}>{isVi ? 'Lưu' : 'Save changes'}</Button>
          </DialogActions>
        </Box>
      </Dialog>

    </Page>
  );
};
