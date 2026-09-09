import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem,
  Alert, IconButton, Tooltip, CircularProgress, Skeleton
} from '@mui/material';
import { UserPlus, Trash2, Users } from 'lucide-react';
import { useThemeContext } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { useAuthContext } from '../contexts/AuthContext';
import { UserAvatar } from '../components/common/UserAvatar';
import { apiFetch } from '../api/client';
import { WorkspaceMemberDto, WorkspaceRole } from '@reported/contracts';
import { Page, PageHeader } from '../components/common/Page';
import { buttonSx, inputSx } from '../theme/ui';
import { toast } from '../contexts/ToastContext';

export const MembersPage: React.FC = () => {
  const { tokens } = useThemeContext();
  const { t } = useI18n();
  const { user } = useAuthContext();
  const { activeWorkspace } = useWorkspace();

  const [members, setMembers] = useState<WorkspaceMemberDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>(WorkspaceRole.MEMBER);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [removeTarget, setRemoveTarget] = useState<WorkspaceMemberDto | null>(null);
  const [removing, setRemoving] = useState(false);

  const currentUserMember = members.find(m => m.userId === user?.id);
  const currentUserRole = currentUserMember?.role;
  const isWorkspaceOwner = activeWorkspace?.ownerId === user?.id || activeWorkspace?.role === WorkspaceRole.OWNER || user?.role === 'ADMIN';
  const canManageMembers = isWorkspaceOwner || currentUserRole === WorkspaceRole.OWNER || currentUserRole === WorkspaceRole.ADMIN;

  const fetchMembers = async () => {
    if (!activeWorkspace) return;
    try {
      setIsLoading(true);
      const res = await apiFetch<WorkspaceMemberDto[]>(`/workspaces/${activeWorkspace.id}/members`);
      setMembers(res);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : (err as { message?: string })?.message || 'Lỗi tải danh sách thành viên';
      toast.error(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [activeWorkspace]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !inviteEmail.trim()) return;

    try {
      setIsSubmitting(true);
      await apiFetch(`/workspaces/${activeWorkspace.id}/members/invite`, {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole })
      });
      toast.success(`Đã gửi lời mời tới ${inviteEmail}`);
      setInviteModalOpen(false);
      setInviteEmail('');
      await fetchMembers();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : (err as { message?: string })?.message || 'Không thể mời thành viên';
      toast.error(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: WorkspaceRole) => {
    if (!activeWorkspace) return;
    try {
      await apiFetch(`/workspaces/${activeWorkspace.id}/members/${memberId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole })
      });
      toast.success('Cập nhật quyền thành công');
      await fetchMembers();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : (err as { message?: string })?.message || 'Không thể cập nhật quyền';
      toast.error(errMsg);
    }
  };

  const handleRemoveMember = async () => {
    if (!activeWorkspace || !removeTarget) return;
    setRemoving(true);
    try {
      await apiFetch(`/workspaces/${activeWorkspace.id}/members/${removeTarget.userId}`, {
        method: 'DELETE'
      });
      toast.success(`Đã xóa ${removeTarget.displayName}`);
      setRemoveTarget(null);
      await fetchMembers();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : (err as { message?: string })?.message || 'Không thể xóa thành viên';
      toast.error(errMsg);
    } finally {
      setRemoving(false);
    }
  };

  const getRoleBadgeColor = (role: WorkspaceRole) => {
    switch (role) {
      case WorkspaceRole.OWNER:
        return { bg: 'rgba(210, 153, 34, 0.15)', text: '#d29922', border: '1px solid rgba(210, 153, 34, 0.35)' };
      case WorkspaceRole.ADMIN:
        return { bg: 'rgba(163, 113, 247, 0.15)', text: '#a371f7', border: '1px solid rgba(163, 113, 247, 0.35)' };
      case WorkspaceRole.MEMBER:
        return { bg: 'rgba(47, 129, 247, 0.15)', text: '#58a6ff', border: '1px solid rgba(47, 129, 247, 0.35)' };
      default:
        return { bg: 'rgba(110, 118, 129, 0.15)', text: '#848d97', border: '1px solid rgba(110, 118, 129, 0.35)' };
    }
  };

  return (
    <Page>
      <PageHeader
        title={t('memberList')}
        subtitle="Quản lý thành viên, vai trò workspace và quyền truy cập theo project khi backend hỗ trợ."
        action={canManageMembers && (
          <Button
            variant="contained"
            size="small"
            startIcon={<UserPlus size={16} />}
            onClick={() => setInviteModalOpen(true)}
            sx={buttonSx(tokens)}
          >
            {t('inviteMember')}
          </Button>
        )}
      />

      <Paper
        elevation={0}
        sx={{
          borderRadius: '8px',
          border: `1px solid ${tokens.border}`,
          backgroundColor: tokens.surface,
          overflow: 'hidden'
        }}
      >
        <TableContainer sx={{ overflowX: 'auto', width: '100%' }}>
          <Table sx={{ minWidth: 620 }}>
            <TableHead sx={{ backgroundColor: tokens.surfaceSecondary }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: tokens.textSecondary, whiteSpace: 'nowrap' }}>Thành viên</TableCell>
                <TableCell sx={{ fontWeight: 700, color: tokens.textSecondary, whiteSpace: 'nowrap' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700, color: tokens.textSecondary, whiteSpace: 'nowrap' }}>Vai trò</TableCell>
                <TableCell sx={{ fontWeight: 700, color: tokens.textSecondary, whiteSpace: 'nowrap' }}>Ngày tham gia</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: tokens.textSecondary, whiteSpace: 'nowrap' }}>Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Skeleton variant="circular" width={36} height={36} />
                        <Box>
                          <Skeleton variant="text" width={120} height={20} />
                          <Skeleton variant="text" width={80} height={14} sx={{ mt: 0.3 }} />
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell><Skeleton variant="text" width={160} height={20} /></TableCell>
                    <TableCell><Skeleton variant="rectangular" width={85} height={28} sx={{ borderRadius: '6px' }} /></TableCell>
                    <TableCell><Skeleton variant="text" width={90} height={18} /></TableCell>
                    <TableCell align="right"><Skeleton variant="circular" width={28} height={28} sx={{ ml: 'auto' }} /></TableCell>
                  </TableRow>
                ))
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6, color: tokens.textSecondary }}>
                    Chưa có thành viên nào
                  </TableCell>
                </TableRow>
              ) : (
                members.map((m) => {
                  const badge = getRoleBadgeColor(m.role);
                  const isSelf = user?.id === m.userId;
                  const isOwner = m.role === WorkspaceRole.OWNER;

                  return (
                    <TableRow key={m.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <UserAvatar
                            user={{
                              displayName: m.displayName,
                              avatarUrl: m.avatarUrl || undefined,
                              username: m.username
                            }}
                            size={36}
                          />
                          <Box sx={{ minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: tokens.textPrimary, whiteSpace: 'nowrap' }}>
                                {m.displayName}
                              </Typography>
                              {isSelf && <Chip label="Bạn" size="small" sx={{ height: 18, fontSize: '0.6875rem' }} />}
                            </Box>
                            <Typography variant="caption" sx={{ color: tokens.textSecondary, whiteSpace: 'nowrap' }}>
                              @{m.username}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      <TableCell sx={{ color: tokens.textSecondary, fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                        {m.email}
                      </TableCell>

                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Select
                          size="small"
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.userId || m.id, e.target.value as WorkspaceRole)}
                          disabled={!canManageMembers || (isOwner && members.filter(item => item.role === WorkspaceRole.OWNER).length <= 1)}
                          sx={{
                            backgroundColor: badge.bg,
                            color: badge.text,
                            border: badge.border,
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            height: 28,
                            borderRadius: '6px',
                            '& .MuiSelect-select': {
                              py: '2px !important',
                              pl: '12px !important',
                              pr: '28px !important',
                              display: 'flex',
                              alignItems: 'center'
                            },
                            '& .MuiSelect-icon': {
                              color: badge.text,
                              right: '4px',
                              fontSize: '1.1rem'
                            },
                            '& .MuiOutlinedInput-notchedOutline': {
                              border: 'none'
                            }
                          }}
                        >
                          <MenuItem value={WorkspaceRole.OWNER}>{t('roleOwner')}</MenuItem>
                          <MenuItem value={WorkspaceRole.ADMIN}>{t('roleAdmin')}</MenuItem>
                          <MenuItem value={WorkspaceRole.MEMBER}>{t('roleMember')}</MenuItem>
                          <MenuItem value={WorkspaceRole.GUEST}>{t('roleGuest')}</MenuItem>
                        </Select>
                      </TableCell>

                      <TableCell sx={{ color: tokens.textSecondary, fontSize: '0.8125rem' }}>
                        {new Date(m.joinedAt).toLocaleDateString()}
                      </TableCell>

                      <TableCell align="right">
                        {(() => {
                          const isSoleOwner = isOwner && members.filter(item => item.role === WorkspaceRole.OWNER).length <= 1;
                          if (isSoleOwner) {
                            return (
                              <Chip
                                label={t('roleOwner')}
                                size="small"
                                variant="outlined"
                                sx={{
                                  height: 22,
                                  fontSize: '0.6875rem',
                                  fontWeight: 600,
                                  color: '#d29922',
                                  borderColor: 'rgba(210, 153, 34, 0.4)'
                                }}
                              />
                            );
                          }
                          if (isSelf) {
                            return (
                              <Typography variant="caption" sx={{ color: tokens.textSecondary, fontStyle: 'italic' }}>
                                (bạn)
                              </Typography>
                            );
                          }
                          if (canManageMembers) {
                            return (
                              <Tooltip title="Xóa khỏi không gian">
                                <IconButton
                                  size="small"
                                  onClick={() => setRemoveTarget(m)}
                                  sx={{ color: tokens.textSecondary, '&:hover': { color: tokens.error } }}
                                >
                                  <Trash2 size={16} />
                                </IconButton>
                              </Tooltip>
                            );
                          }
                          return null;
                        })()}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={inviteModalOpen} onClose={() => setInviteModalOpen(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleInvite}>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {t('inviteMember')} vào {activeWorkspace?.name}
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            <TextField
              fullWidth
              label={t('inviteMemberEmail')}
              placeholder="dongnghiep@company.com"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
              sx={inputSx(tokens)}
            />

            <FormControl fullWidth>
              <InputLabel>{t('inviteMemberRole')}</InputLabel>
              <Select
                value={inviteRole}
                label={t('inviteMemberRole')}
                onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
              >
                <MenuItem value={WorkspaceRole.ADMIN}>{t('roleAdmin')} (Toàn quyền quản lý)</MenuItem>
                <MenuItem value={WorkspaceRole.MEMBER}>{t('roleMember')} (Tạo issue, gửi review)</MenuItem>
                <MenuItem value={WorkspaceRole.GUEST}>{t('roleGuest')} (Chỉ xem và bình luận)</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setInviteModalOpen(false)} sx={{ textTransform: 'none' }}>
              {t('cancelBtn')}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
              sx={buttonSx(tokens)}
            >
              {isSubmitting ? 'Đang gửi...' : t('sendInviteBtn')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Dialog
        open={Boolean(removeTarget)}
        onClose={() => !removing && setRemoveTarget(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '8px' } }}
      >
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Trash2 size={18} color="#f85149" />
          Xác nhận xóa thành viên
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#8b949e' }}>
            Bạn có chắc muốn xóa{' '}
            <strong>{removeTarget?.displayName}</strong>
            {' '}(@{removeTarget?.username}) khỏi không gian làm việc?
          </Typography>
          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#8b949e' }}>
            Thành viên sẽ mất quyền truy cập ngay lập tức. Bạn có thể mời lại họ sau.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button
            onClick={() => setRemoveTarget(null)}
            disabled={removing}
            sx={{ textTransform: 'none', borderRadius: '6px' }}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleRemoveMember}
            disabled={removing}
            startIcon={<Trash2 size={15} />}
            sx={{ textTransform: 'none', borderRadius: '6px', boxShadow: 'none' }}
          >
            {removing ? 'Đang xóa...' : 'Xác nhận xóa'}
          </Button>
        </DialogActions>
      </Dialog>
    </Page>
  );
};

