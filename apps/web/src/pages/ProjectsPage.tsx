import React, { useState } from 'react';
import {
  Box, Typography, Paper, Grid, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Chip, Alert, Card, CardContent, CardActionArea,
  IconButton, Tooltip
} from '@mui/material';
import { Plus, Bug, Eye, Edit2, Trash2, FolderGit2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { useThemeContext } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { ProjectDto } from '@reported/contracts';
import { ProjectGridSkeleton } from '../components/common/Skeletons';
import { toast } from '../contexts/ToastContext';

const generateSlug = (text: string) => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const generateKey = (text: string) => {
  const clean = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .trim();

  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words.map(w => w[0]).join('').slice(0, 4);
  }
  return clean.replace(/\s+/g, '').slice(0, 3);
};

export const ProjectsPage: React.FC = () => {
  const { tokens } = useThemeContext();
  const { t, language } = useI18n();
  const isVi = language === 'vi';
  const { activeWorkspace, projects, createProject, updateProject, deleteProject, setActiveProject, isLoading } = useWorkspace();
  const [, setLocation] = useLocation();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [key, setKey] = useState('');
  const [isSlugManual, setIsSlugManual] = useState(false);
  const [isKeyManual, setIsKeyManual] = useState(false);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectDto | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editKey, setEditKey] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState<ProjectDto | null>(null);
  const [deleteDeleting, setDeleteDeleting] = useState(false);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isSlugManual) {
      setSlug(generateSlug(val));
    }
    if (!isKeyManual) {
      setKey(generateKey(val));
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !slug.trim() || !key.trim()) {
      toast.error(isVi ? 'Vui lòng điền đầy đủ các thông tin bắt buộc' : 'Please fill all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      await createProject({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        key: key.trim().toUpperCase(),
        description: description.trim() || undefined
      });
      toast.success(isVi ? 'Tạo dự án mới thành công!' : 'Project created successfully!');
      setCreateModalOpen(false);
      setName('');
      setSlug('');
      setKey('');
      setDescription('');
      setIsSlugManual(false);
      setIsKeyManual(false);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : (err as { message?: string })?.message || (isVi ? 'Lỗi khi tạo dự án' : 'Error creating project');
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (proj: ProjectDto) => {
    setEditingProject(proj);
    setEditName(proj.name);
    setEditSlug(proj.slug);
    setEditKey(proj.key);
    setEditDescription(proj.description || '');
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    if (!editName.trim() || !editKey.trim() || !editSlug.trim()) {
      toast.error(isVi ? 'Tên, slug và mã dự án không được để trống' : 'Name, slug, and key cannot be empty');
      return;
    }

    try {
      setEditSaving(true);
      await updateProject(editingProject.id, {
        name: editName.trim(),
        slug: editSlug.trim().toLowerCase(),
        key: editKey.trim().toUpperCase(),
        description: editDescription.trim()
      });
      toast.success(isVi ? 'Đã cập nhật dự án thành công' : 'Project updated successfully');
      setEditModalOpen(false);
      setEditingProject(null);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : (err as { message?: string })?.message || (isVi ? 'Lỗi khi cập nhật dự án' : 'Error updating project');
      toast.error(errMsg);
    } finally {
      setEditSaving(false);
    }
  };

  const handleOpenDelete = (proj: ProjectDto) => {
    setDeletingProject(proj);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingProject) return;
    try {
      setDeleteDeleting(true);
      await deleteProject(deletingProject.id);
      toast.success(isVi ? 'Đã xóa dự án thành công' : 'Project deleted successfully');
      setDeleteDialogOpen(false);
      setDeletingProject(null);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : (err as { message?: string })?.message || (isVi ? 'Lỗi khi xóa dự án' : 'Error deleting project');
      toast.error(errMsg);
    } finally {
      setDeleteDeleting(false);
    }
  };

  const handleSelectProject = (proj: ProjectDto) => {
    setActiveProject(proj);
    setLocation(`/issues?projectId=${proj.id}`);
  };

  return (
    <Box sx={{ width: '100%', pb: 8 }}>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.025em', color: tokens.textPrimary }}>
            {t('projectList')}
          </Typography>
          <Typography variant="body2" sx={{ color: tokens.textSecondary, mt: 0.5 }}>
            Phân chia các thành phần kiến trúc, microservices và frontend theo dự án chuyên biệt
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', sm: 'center' },
            justifyContent: { xs: 'flex-start', sm: 'space-between' },
            gap: 1.5,
            flexWrap: 'wrap'
          }}
        >
          <Typography variant="body2" sx={{ color: tokens.textSecondary, fontWeight: 500, whiteSpace: 'nowrap' }}>
            {projects.length} {t('projects') || 'dự án'}
          </Typography>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.2,
              flexWrap: 'wrap',
              width: { xs: '100%', sm: 'auto' },
              justifyContent: { xs: 'flex-start', sm: 'flex-end' }
            }}
          >
            <Button
              variant="contained"
              size="small"
              startIcon={<Plus size={16} />}
              onClick={() => setCreateModalOpen(true)}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: '8px',
                backgroundColor: tokens.primary,
                boxShadow: 'none',
                whiteSpace: 'nowrap',
                py: 0.8,
                px: 1.8,
                fontSize: '0.8125rem'
              }}
            >
              {t('createProjectBtn')}
            </Button>
          </Box>
        </Box>
      </Box>

      <Grid container spacing={2.5}>
        {isLoading ? (
          <ProjectGridSkeleton count={6} />
        ) : projects.length === 0 ? (
          <Grid item xs={12}>
            <Paper sx={{ p: 6, textAlign: 'center', backgroundColor: tokens.surface, border: `1px solid ${tokens.border}`, borderRadius: '8px' }}>
              <Typography variant="body1" sx={{ color: tokens.textSecondary }}>
                Chưa có dự án nào trong không gian này. Hãy bấm "Thêm dự án" để bắt đầu.
              </Typography>
            </Paper>
          </Grid>
        ) : (
          projects.map((proj) => (
            <Grid item xs={12} sm={6} md={4} key={proj.id}>
              <Card
                elevation={0}
                sx={{
                  border: `1px solid ${tokens.border}`,
                  borderRadius: '8px',
                  backgroundColor: tokens.surface,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    borderColor: tokens.primary,
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                <CardActionArea onClick={() => handleSelectProject(proj)} sx={{ p: 2.5 }}>
                  <CardContent sx={{ p: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                      <Chip
                        label={proj.key}
                        size="small"
                        sx={{
                          fontWeight: 700,
                          backgroundColor: 'rgba(56, 139, 253, 0.15)',
                          color: tokens.primary,
                          border: `1px solid rgba(56, 139, 253, 0.3)`,
                          fontSize: '0.75rem'
                        }}
                      />
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ color: tokens.textSecondary, mr: 0.5 }}>
                          @{proj.slug}
                        </Typography>
                        <Tooltip title={isVi ? 'Sửa dự án' : 'Edit project'}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEdit(proj);
                            }}
                            sx={{ color: tokens.textSecondary, '&:hover': { color: tokens.primary } }}
                          >
                            <Edit2 size={14} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={isVi ? 'Xóa dự án' : 'Delete project'}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenDelete(proj);
                            }}
                            sx={{ color: tokens.textSecondary, '&:hover': { color: tokens.error } }}
                          >
                            <Trash2 size={14} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    <Typography variant="h6" sx={{ fontWeight: 700, color: tokens.textPrimary, mb: 0.8 }}>
                      {proj.name}
                    </Typography>

                    <Typography variant="body2" sx={{ color: tokens.textSecondary, mb: 2, minHeight: 40, lineHeight: 1.4 }}>
                      {proj.description || (isVi ? 'Dự án kỹ thuật thuộc không gian làm việc.' : 'Technical project in this workspace.')}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, pt: 1, borderTop: `1px solid ${tokens.divider}` }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Bug size={15} color={tokens.textSecondary} />
                        <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary }}>
                          {proj.issuesCount || 0} issues
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Eye size={15} color={tokens.textSecondary} />
                        <Typography variant="caption" sx={{ fontWeight: 600, color: tokens.textSecondary }}>
                          {proj.reviewsCount || 0} reviews
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      <Dialog open={createModalOpen} onClose={() => setCreateModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '8px' } }}>
        <form onSubmit={handleCreate}>
          <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <FolderGit2 size={20} color={tokens.primary} />
            <span>{t('createProjectBtn')} vào {activeWorkspace?.name}</span>
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
              {[
                { label: '🌐 Web Frontend', name: 'Web Frontend', key: 'FE', slug: 'web-frontend' },
                { label: '⚙️ API Backend', name: 'API Backend', key: 'BE', slug: 'api-backend' },
                { label: '📱 Mobile App', name: 'Mobile App', key: 'MOB', slug: 'mobile-app' },
                { label: '☁️ Cloud Infra', name: 'Cloud Infrastructure', key: 'INFRA', slug: 'cloud-infra' }
              ].map((template) => (
                <Chip
                  key={template.key}
                  label={template.label}
                  size="small"
                  onClick={() => {
                    setName(template.name);
                    setKey(template.key);
                    setSlug(template.slug);
                    setIsKeyManual(true);
                    setIsSlugManual(true);
                  }}
                  sx={{
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    borderRadius: '4px',
                    backgroundColor: tokens.surfaceSecondary,
                    border: `1px solid ${tokens.border}`,
                    '&:hover': { borderColor: tokens.primary, color: tokens.primary }
                  }}
                />
              ))}
            </Box>

            <TextField
              fullWidth
              label={t('projectName')}
              placeholder="Backend Platform"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
            />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label={t('projectKey')}
                  placeholder="BE"
                  value={key}
                  onChange={(e) => {
                    setIsKeyManual(true);
                    setKey(e.target.value.toUpperCase());
                  }}
                  helperText={t('projectKeyHelp')}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Slug"
                  placeholder="backend"
                  value={slug}
                  onChange={(e) => {
                    setIsSlugManual(true);
                    setSlug(e.target.value.toLowerCase());
                  }}
                  required
                />
              </Grid>
            </Grid>

            <Box
              sx={{
                px: 1.4,
                py: 0.8,
                borderRadius: '6px',
                backgroundColor: tokens.surfaceSecondary,
                border: `1px solid ${tokens.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: 0.8,
                fontSize: '0.75rem',
                color: tokens.textSecondary
              }}
            >
              <span>{isVi ? 'Mã mẫu Issue:' : 'Example Issue ID:'}</span>
              <Typography component="span" sx={{ fontFamily: 'monospace', fontWeight: 700, color: tokens.primary, fontSize: '0.75rem' }}>
                #{key || 'PROJ'}-1
              </Typography>
            </Box>

            <TextField
              fullWidth
              multiline
              rows={3}
              label={isVi ? 'Mô tả dự án' : 'Project description'}
              placeholder={isVi ? 'Mô tả phạm vi, công nghệ sử dụng và mục tiêu...' : 'Scope, technologies, and objectives...'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button
              onClick={() => {
                setCreateModalOpen(false);
                setIsSlugManual(false);
                setIsKeyManual(false);
              }}
              sx={{ textTransform: 'none', borderRadius: '6px', whiteSpace: 'nowrap' }}
            >
              {t('cancelBtn')}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              sx={{ textTransform: 'none', fontWeight: 600, backgroundColor: tokens.primary, borderRadius: '6px', whiteSpace: 'nowrap' }}
            >
              {isSubmitting ? (isVi ? 'Đang tạo...' : 'Creating...') : t('createProjectBtn')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={editModalOpen} onClose={() => !editSaving && setEditModalOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '8px' } }}>
        <form onSubmit={handleSaveEdit}>
          <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <FolderGit2 size={20} color={tokens.primary} />
            <span>{isVi ? 'Chỉnh sửa dự án' : 'Edit Project'}</span>
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
            <TextField
              fullWidth
              label={t('projectName')}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label={t('projectKey')}
                  value={editKey}
                  onChange={(e) => setEditKey(e.target.value.toUpperCase())}
                  required
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Slug"
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value.toLowerCase())}
                  required
                />
              </Grid>
            </Grid>

            <Box
              sx={{
                px: 1.4,
                py: 0.8,
                borderRadius: '6px',
                backgroundColor: tokens.surfaceSecondary,
                border: `1px solid ${tokens.border}`,
                display: 'flex',
                alignItems: 'center',
                gap: 0.8,
                fontSize: '0.75rem',
                color: tokens.textSecondary
              }}
            >
              <span>{isVi ? 'Mã mẫu Issue:' : 'Example Issue ID:'}</span>
              <Typography component="span" sx={{ fontFamily: 'monospace', fontWeight: 700, color: tokens.primary, fontSize: '0.75rem' }}>
                #{editKey || 'PROJ'}-1
              </Typography>
            </Box>

            <TextField
              fullWidth
              multiline
              rows={3}
              label={isVi ? 'Mô tả dự án' : 'Project description'}
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={() => setEditModalOpen(false)} disabled={editSaving} sx={{ textTransform: 'none', borderRadius: '6px', whiteSpace: 'nowrap' }}>
              {t('cancelBtn')}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={editSaving}
              sx={{ textTransform: 'none', fontWeight: 600, backgroundColor: tokens.primary, borderRadius: '6px', whiteSpace: 'nowrap' }}
            >
              {editSaving ? (isVi ? 'Đang lưu...' : 'Saving...') : (isVi ? 'Lưu thay đổi' : 'Save Changes')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => !deleteDeleting && setDeleteDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '8px' } }}>
        <DialogTitle sx={{ fontWeight: 700, color: tokens.error }}>
          {isVi ? 'Xác nhận xóa dự án?' : 'Delete project?'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
            {isVi
              ? `Bạn có chắc muốn xóa dự án "${deletingProject?.name}" (${deletingProject?.key})? Các bài viết thuộc dự án sẽ được gỡ liên kết.`
              : `Are you sure you want to delete "${deletingProject?.name}" (${deletingProject?.key})? Issues linked to it will be unlinked.`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleteDeleting} sx={{ textTransform: 'none', borderRadius: '6px' }}>
            {t('cancelBtn')}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={deleteDeleting}
            sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '6px' }}
          >
            {deleteDeleting ? (isVi ? 'Đang xóa...' : 'Deleting...') : (isVi ? 'Xóa dự án' : 'Delete Project')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

