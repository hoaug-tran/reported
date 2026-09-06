import React, { useEffect, useState } from 'react';
import {
  Alert, Box, Button, TextField, Typography, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { Save, Trash2, AlertTriangle } from 'lucide-react';
import { Page, PageHeader, SectionCard } from '../components/common/Page';
import { useThemeContext } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuthContext } from '../contexts/AuthContext';
import { apiFetch } from '../api/client';
import { useLocation } from 'wouter';
import { buttonSx, inputSx } from '../theme/ui';
import { toast } from '../contexts/ToastContext';

export const WorkspaceSettingsPage: React.FC = () => {
  const { tokens } = useThemeContext();
  const { language } = useI18n();
  const { activeWorkspace, refreshWorkspaces } = useWorkspace();
  const { user } = useAuthContext();
  const isVi = language === 'vi';
  const [, setLocation] = useLocation();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (activeWorkspace) {
      setName(activeWorkspace.name);
      setSlug(activeWorkspace.slug);
    }
  }, [activeWorkspace]);

  const isOwner = activeWorkspace && user && (activeWorkspace as any).ownerId === user.id;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace) return;
    setSaving(true);
    try {
      await apiFetch(`/workspaces/${activeWorkspace.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, slug })
      });
      await refreshWorkspaces();
      toast.success(isVi ? 'Đã lưu cài đặt workspace.' : 'Workspace settings saved.');
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : (isVi ? 'Không thể lưu workspace.' : 'Failed to save workspace.');
      toast.error(text);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!activeWorkspace) return;
    setDeleting(true);
    try {
      await apiFetch(`/workspaces/${activeWorkspace.id}`, { method: 'DELETE' });
      await refreshWorkspaces();
      toast.success(isVi ? 'Đã xoá workspace thành công.' : 'Workspace deleted successfully.');
      setLocation('/');
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : (isVi ? 'Không thể xoá workspace.' : 'Failed to delete workspace.');
      toast.error(text);
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const canDelete = activeWorkspace && deleteConfirmText === activeWorkspace.name;

  return (
    <Page variant="form">
      <PageHeader
        title={isVi ? 'Cài đặt workspace' : 'Workspace Settings'}
        subtitle={isVi
          ? 'Quản lý tên, slug và các tuỳ chọn của workspace.'
          : 'Manage workspace name, slug, and other options.'}
      />

      <SectionCard sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2 }}>
          {isVi ? 'Thông tin chung' : 'General Information'}
        </Typography>
        <Box component="form" onSubmit={save} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <TextField
            label={isVi ? 'Tên workspace' : 'Workspace name'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            fullWidth
            helperText={isVi ? 'Dùng trong URL và định danh workspace.' : 'Used in URLs and workspace identity.'}
          />

          <Box>
            <Button type="submit" variant="contained" disabled={saving} startIcon={<Save size={16} />} sx={buttonSx(tokens)}>
              {saving ? (isVi ? 'Đang lưu...' : 'Saving...') : (isVi ? 'Lưu thay đổi' : 'Save changes')}
            </Button>
          </Box>
        </Box>
      </SectionCard>

      {isOwner && (
        <SectionCard
          sx={{
            p: 3,
            border: `1px solid rgba(248, 81, 73, 0.4) !important`,
            backgroundColor: 'rgba(248, 81, 73, 0.04)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <AlertTriangle size={18} color={tokens.error} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: tokens.error }}>
              {isVi ? 'Vùng nguy hiểm' : 'Danger Zone'}
            </Typography>
          </Box>

          <Divider sx={{ mb: 2, borderColor: 'rgba(248, 81, 73, 0.2)' }} />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {isVi ? 'Xoá workspace này' : 'Delete this workspace'}
              </Typography>
              <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
                {isVi
                  ? 'Hành động này không thể hoàn tác. Tất cả dữ liệu, thành viên và lịch sử sẽ bị xoá.'
                  : 'This action is irreversible. All data, members, and history will be permanently deleted.'}
              </Typography>
            </Box>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Trash2 size={15} />}
              onClick={() => {
                setDeleteConfirmText('');
                setDeleteDialogOpen(true);
              }}
              sx={{ textTransform: 'none', borderRadius: '6px', whiteSpace: 'nowrap' }}
            >
              {isVi ? 'Xoá workspace' : 'Delete workspace'}
            </Button>
          </Box>
        </SectionCard>
      )}

      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AlertTriangle size={20} color={tokens.error} />
          {isVi ? 'Xác nhận xoá workspace' : 'Confirm workspace deletion'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: tokens.textSecondary, mb: 2 }}>
            {isVi
              ? `Nhập tên workspace "${activeWorkspace?.name}" để xác nhận xoá. Hành động này không thể hoàn tác.`
              : `Type the workspace name "${activeWorkspace?.name}" to confirm deletion. This action cannot be undone.`}
          </Typography>
          <TextField
            fullWidth
            size="small"
            label={isVi ? 'Tên workspace' : 'Workspace name'}
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder={activeWorkspace?.name || ''}
            sx={inputSx(tokens)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
            sx={{ textTransform: 'none', borderRadius: '6px' }}
          >
            {isVi ? 'Hủy' : 'Cancel'}
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteWorkspace}
            disabled={!canDelete || deleting}
            startIcon={<Trash2 size={15} />}
            sx={{ textTransform: 'none', borderRadius: '6px', boxShadow: 'none' }}
          >
            {deleting
              ? (isVi ? 'Đang xoá...' : 'Deleting...')
              : (isVi ? 'Xác nhận xoá' : 'Confirm delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
};
