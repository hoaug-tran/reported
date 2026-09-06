import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Avatar, Alert, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Tooltip,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Link as LinkIcon,
  Unlink,
  RefreshCw,
  Shield,
  Fingerprint,
  Trash2,
  Plus,
  Copy,
  Check,
  ShieldCheck
} from 'lucide-react';
import { useThemeContext } from '../contexts/ThemeContext';
import { useAuthContext } from '../contexts/AuthContext';
import { apiFetch } from '../api/client';
import { ConnectedAccountDto, PasskeyDto } from '@reported/contracts';

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
    </svg>
  );
}

function GitLabIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="m23.6 9.59-1.26-3.87a.78.78 0 0 0-1.48 0L19.6 9.59H4.4L3.14 5.72a.78.78 0 0 0-1.48 0L.4 9.59a.78.78 0 0 0 .28.87l11.07 8.05a.78.78 0 0 0 .9 0l11.07-8.05a.78.78 0 0 0 .28-.87z" fill="#E24329"/>
      <path d="M12 18.51 18.72 9.6H5.28L12 18.51z" fill="#FC6D26"/>
      <path d="M12 18.51 5.28 9.6H.4l11.6 8.91z" fill="#FCA326"/>
      <path d="M12 18.51 18.72 9.6h4.88l-11.6 8.91z" fill="#FCA326"/>
    </svg>
  );
}

export const ConnectedAccountsPage: React.FC = () => {
  const { tokens } = useThemeContext();
  const {
    user,
    connectedAccounts,
    unlinkAccount,
    reconnectAccount,
    setPassword,
    refreshUser
  } = useAuthContext();

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [operatingId, setOperatingId] = useState<string | null>(null);

  const [unlinkConfirmTarget, setUnlinkConfirmTarget] = useState<ConnectedAccountDto | null>(null);

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const [passkeys, setPasskeys] = useState<PasskeyDto[]>([]);
  const [loadingPasskeys, setLoadingPasskeys] = useState(false);
  const [passkeyModalOpen, setPasskeyModalOpen] = useState(false);
  const [passkeyName, setPasskeyName] = useState('');
  const [passkeySubmitting, setPasskeySubmitting] = useState(false);

  const [mfaModalOpen, setMfaModalOpen] = useState(false);
  const [mfaSetupData, setMfaSetupData] = useState<{ secret: string; qrCodeUri: string; backupCodes: string[] } | null>(null);
  const [mfaVerifyCode, setMfaVerifyCode] = useState('');
  const [mfaSubmitting, setMfaSubmitting] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const fetchPasskeys = async () => {
    setLoadingPasskeys(true);
    try {
      const res = await apiFetch<{ passkeys: PasskeyDto[] }>('/auth/passkeys');
      setPasskeys(res.passkeys || []);
    } catch {
      setPasskeys([]);
    } finally {
      setLoadingPasskeys(false);
    }
  };

  useEffect(() => {
    fetchPasskeys();
  }, []);

  const getAccountByProvider = (provider: string) => {
    return connectedAccounts.find((a) => a.provider.toLowerCase() === provider.toLowerCase());
  };

  const handleConnect = async (provider: string) => {
    setActionError(null);
    try {
      const extraScopes = provider === 'github' ? 'repo,read:org' : (provider === 'gitlab' ? 'read_api' : '');
      const res = await apiFetch<{ url: string }>(
        `/auth/oauth/${provider}/authorize?intent=link&returnTo=/settings/connected-accounts&scopes=${extraScopes}`
      );
      window.location.href = res.url;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : (err as { message?: string })?.message || `Không thể bắt đầu kết nối ${provider}`;
      setActionError(errMsg);
    }
  };

  const handleExecuteUnlink = async () => {
    if (!unlinkConfirmTarget) return;
    setActionError(null);
    setOperatingId(unlinkConfirmTarget.id);

    try {
      await unlinkAccount(unlinkConfirmTarget.id);
      setActionSuccess(`Đã hủy liên kết tài khoản ${unlinkConfirmTarget.provider.toUpperCase()} thành công.`);
      setUnlinkConfirmTarget(null);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : (err as { message?: string })?.message || 'Không thể hủy liên kết tài khoản.';
      setActionError(errMsg);
      setUnlinkConfirmTarget(null);
    } finally {
      setOperatingId(null);
    }
  };

  const handleReconnect = async (acc: ConnectedAccountDto) => {
    setActionError(null);
    setOperatingId(acc.id);
    try {
      await reconnectAccount(acc.id);
      setActionSuccess(`Đã làm mới trạng thái kết nối ${acc.provider.toUpperCase()} thành công.`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : (err as { message?: string })?.message || 'Không thể kết nối lại.';
      setActionError(errMsg);
    } finally {
      setOperatingId(null);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordError('Mật khẩu phải có ít nhất 8 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp');
      return;
    }

    setPasswordSubmitting(true);
    setPasswordError(null);
    try {
      await setPassword(newPassword);
      setPasswordDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
      setActionSuccess('Đã thiết lập mật khẩu đăng nhập thành công. Bạn có thể đăng nhập bằng email và mật khẩu này.');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : (err as { message?: string })?.message || 'Thiết lập mật khẩu thất bại';
      setPasswordError(errMsg);
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const handleStartPasskeyRegistration = () => {
    if (!window.PublicKeyCredential) {
      setActionError('Trình duyệt hoặc hệ điều hành hiện tại không hỗ trợ WebAuthn / Passkeys.');
      return;
    }
    setPasskeyName('Windows Hello / Máy tính cá nhân');
    setPasskeyModalOpen(true);
  };

  const handleRegisterPasskey = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasskeySubmitting(true);
    setActionError(null);

    try {
      const options = await apiFetch<any>('/auth/passkeys/register-options', { method: 'POST' });

      const rawChallenge = options.challenge.replace(/-/g, '+').replace(/_/g, '/');
      const challengeBytes = Uint8Array.from(atob(rawChallenge), (c) => c.charCodeAt(0));

      const rawUserId = options.user.id.replace(/-/g, '+').replace(/_/g, '/');
      const userIdBytes = Uint8Array.from(atob(rawUserId), (c) => c.charCodeAt(0));

      const credential = await navigator.credentials.create({
        publicKey: {
          ...options,
          challenge: challengeBytes,
          user: {
            ...options.user,
            id: userIdBytes
          }
        }
      }) as PublicKeyCredential | null;

      if (!credential) {
        throw new Error('Đăng ký Passkey bị hủy bỏ.');
      }

      await apiFetch('/auth/passkeys/register-verify', {
        method: 'POST',
        body: JSON.stringify({
          name: passkeyName.trim() || 'Security Key',
          credentialId: credential.id,
          publicKey: credential.id,
          deviceType: 'Biometric Key'
        })
      });

      setPasskeyModalOpen(false);
      setActionSuccess(`Đã đăng ký thành công khóa bảo mật "${passkeyName}". Bạn có thể đăng nhập bằng 1 chạm.`);
      await fetchPasskeys();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Không thể đăng ký Passkey';
      setActionError(errMsg);
    } finally {
      setPasskeySubmitting(false);
    }
  };

  const handleDeletePasskey = async (id: string, name: string) => {
    setActionError(null);
    try {
      await apiFetch(`/auth/passkeys/${id}`, { method: 'DELETE' });
      setActionSuccess(`Đã xóa khóa "${name}" thành công.`);
      await fetchPasskeys();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Không thể xóa khóa Passkey';
      setActionError(errMsg);
    }
  };

  const handleStartMfaSetup = async () => {
    setActionError(null);
    setMfaError(null);
    try {
      const res = await apiFetch<{ secret: string; qrCodeUri: string; backupCodes: string[] }>('/auth/mfa/setup', {
        method: 'POST'
      });
      setMfaSetupData(res);
      setMfaVerifyCode('');
      setMfaModalOpen(true);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Không thể tạo cấu hình 2FA';
      setActionError(errMsg);
    }
  };

  const handleEnableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaSetupData) return;
    setMfaSubmitting(true);
    setMfaError(null);

    try {
      await apiFetch('/auth/mfa/enable', {
        method: 'POST',
        body: JSON.stringify({
          secret: mfaSetupData.secret,
          code: mfaVerifyCode.trim(),
          backupCodes: mfaSetupData.backupCodes
        })
      });

      setMfaModalOpen(false);
      setActionSuccess('Xác thực hai yếu tố (2FA) đã được kích hoạt thành công!');
      await refreshUser();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Mã xác thực không đúng. Vui lòng kiểm tra lại.';
      setMfaError(errMsg);
    } finally {
      setMfaSubmitting(false);
    }
  };

  const handleDisableMfa = async () => {
    setActionError(null);
    try {
      await apiFetch('/auth/mfa/disable', { method: 'POST' });
      setActionSuccess('Đã vô hiệu hóa xác thực hai yếu tố (2FA).');
      await refreshUser();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Không thể tắt 2FA';
      setActionError(errMsg);
    }
  };

  const providersList = [
    {
      id: 'github',
      name: 'GitHub',
      description: 'Đồng bộ Repository, Pull Request, Commit và Branch trực tiếp vào Issue & Review.',
      icon: <GitHubIcon />,
      color: '#24292f'
    },
    {
      id: 'gitlab',
      name: 'GitLab',
      description: 'Hỗ trợ GitLab Projects và Merge Requests (MR) cho các nhóm DevOps.',
      icon: <GitLabIcon />,
      color: '#FC6D26'
    },
    {
      id: 'google',
      name: 'Google',
      description: 'Đăng nhập bảo mật nhanh bằng tài khoản Google Workspace hoặc Gmail cá nhân.',
      icon: <GoogleIcon />,
      color: '#4285F4'
    }
  ];

  return (
    <Box sx={{ width: '100%', pb: 6 }}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
          <Typography variant="h3" sx={{ fontWeight: 700, fontSize: '1.5rem' }}>
            Tài khoản đã liên kết &amp; Bảo mật
          </Typography>
          <Chip label="Bảo mật danh tính" size="small" sx={{ height: 22, fontWeight: 600, fontSize: '0.75rem' }} />
        </Box>
        <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
          Quản lý tài khoản bên ngoài (GitHub, GitLab, Google), khóa bảo mật sinh trắc học Passkeys và xác thực hai yếu tố (2FA).
        </Typography>
      </Box>

      {actionError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}
      {actionSuccess && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setActionSuccess(null)}>
          {actionSuccess}
        </Alert>
      )}

      {!user?.hasPassword && connectedAccounts.length === 1 && (
        <Alert
          severity="warning"
          icon={<AlertTriangle size={18} />}
          sx={{ mb: 3.5, backgroundColor: `${tokens.warning}15`, border: `1px solid ${tokens.warning}40` }}
          action={
            <Button size="small" color="inherit" onClick={() => setPasswordDialogOpen(true)}>
              Thiết lập mật khẩu
            </Button>
          }
        >
          <strong>Cảnh báo khóa tài khoản:</strong> Bạn hiện chỉ có duy nhất phương thức đăng nhập qua{' '}
          <strong>{connectedAccounts[0].provider.toUpperCase()}</strong> và chưa có mật khẩu ứng dụng. Hãy thiết lập mật
          khẩu để không bị mất quyền truy cập nếu hủy liên kết tài khoản này.
        </Alert>
      )}

      <Typography variant="h5" sx={{ fontWeight: 700, fontSize: '1.1rem', mb: 2 }}>
        Nhà cung cấp danh tính (OAuth Providers)
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
        {providersList.map((prov) => {
          const connected = getAccountByProvider(prov.id);
          const isOperating = operatingId === connected?.id;

          return (
            <Paper
              key={prov.id}
              elevation={0}
              sx={{
                p: { xs: 2.5, sm: 3 },
                borderRadius: '8px',
                border: `1px solid ${tokens.border}`,
                backgroundColor: tokens.surface,
                display: 'flex',
                flexDirection: { xs: 'column', sm: 'row' },
                alignItems: { xs: 'flex-start', sm: 'center' },
                justifyContent: 'space-between',
                gap: 2.5
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2.5 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: tokens.surfaceSecondary,
                    border: `1px solid ${tokens.border}`,
                    flexShrink: 0
                  }}
                >
                  {prov.icon}
                </Box>

                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                    <Typography variant="h5" sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
                      {prov.name}
                    </Typography>

                    {connected ? (
                      <Chip
                        icon={<CheckCircle2 size={14} />}
                        label="Đã liên kết"
                        size="small"
                        color="success"
                        sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600 }}
                      />
                    ) : (
                      <Chip
                        label="Chưa liên kết"
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: '0.75rem',
                          backgroundColor: tokens.hover,
                          color: tokens.textSecondary
                        }}
                      />
                    )}
                  </Box>

                  <Typography variant="body2" sx={{ color: tokens.textSecondary, mb: 1, maxWidth: 480 }}>
                    {prov.description}
                  </Typography>

                  {connected && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                      {connected.avatarUrl && (
                        <Avatar src={connected.avatarUrl} sx={{ width: 22, height: 22 }} />
                      )}
                      <Typography variant="caption" sx={{ color: tokens.textPrimary, fontWeight: 600 }}>
                        {connected.displayName || connected.username || connected.email}
                      </Typography>

                      {connected.username && (
                        <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
                          @{connected.username}
                        </Typography>
                      )}

                      {connected.scopes && connected.scopes.length > 0 && (
                        <Tooltip title={`Quyền đã cấp: ${connected.scopes.join(', ')}`}>
                          <Chip
                            label={`${connected.scopes.length} quyền`}
                            size="small"
                            variant="outlined"
                            sx={{ height: 18, fontSize: '0.6875rem' }}
                          />
                        </Tooltip>
                      )}
                    </Box>
                  )}
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, alignSelf: { xs: 'stretch', sm: 'center' } }}>
                {connected ? (
                  <>
                    <Tooltip title="Kiểm tra và làm mới trạng thái kết nối">
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<RefreshCw size={15} />}
                        onClick={() => handleReconnect(connected)}
                        disabled={isOperating}
                        sx={{ fontSize: '0.8125rem' }}
                      >
                        Làm mới
                      </Button>
                    </Tooltip>

                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      startIcon={<Unlink size={15} />}
                      onClick={() => setUnlinkConfirmTarget(connected)}
                      disabled={isOperating}
                      sx={{ fontSize: '0.8125rem' }}
                    >
                      Hủy liên kết
                    </Button>
                  </>
                ) : (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<LinkIcon size={15} />}
                    onClick={() => handleConnect(prov.id)}
                    sx={{ fontSize: '0.8125rem', fontWeight: 600, minWidth: 120 }}
                  >
                    Liên kết {prov.name}
                  </Button>
                )}
              </Box>
            </Paper>
          );
        })}
      </Box>

      <Typography variant="h5" sx={{ fontWeight: 700, fontSize: '1.1rem', mb: 2 }}>
        Khóa bảo mật sinh trắc học (Passkeys / Windows Hello)
      </Typography>

      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: '8px',
          border: `1px solid ${tokens.border}`,
          backgroundColor: tokens.surface,
          mb: 4
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Fingerprint size={24} color="#0969da" />
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
                Đăng nhập 1 chạm không cần mật khẩu
              </Typography>
              <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
                Sử dụng vân tay, khuôn mặt (Windows Hello, Touch ID) hoặc khóa USB FIDO2 để xác thực tức thì.
              </Typography>
            </Box>
          </Box>

          <Button
            size="small"
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={handleStartPasskeyRegistration}
            sx={{ fontWeight: 600, fontSize: '0.8125rem' }}
          >
            Đăng ký Passkey mới
          </Button>
        </Box>

        {loadingPasskeys ? (
          <Box sx={{ py: 2, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : passkeys.length === 0 ? (
          <Box sx={{ p: 2.5, textAlign: 'center', backgroundColor: tokens.surfaceSecondary, borderRadius: '6px', border: `1px dashed ${tokens.border}` }}>
            <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
              Bạn chưa đăng ký khóa Passkey nào. Bấm "Đăng ký Passkey mới" để liên kết vân tay hoặc Windows Hello.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {passkeys.map((pk) => (
              <Box
                key={pk.id}
                sx={{
                  p: 2,
                  borderRadius: '6px',
                  border: `1px solid ${tokens.border}`,
                  backgroundColor: tokens.surfaceSecondary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Fingerprint size={20} color={tokens.primary} />
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {pk.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
                      Tạo lúc: {new Date(pk.createdAt).toLocaleDateString()}
                      {pk.lastUsedAt && ` • Dùng gần nhất: ${new Date(pk.lastUsedAt).toLocaleDateString()}`}
                    </Typography>
                  </Box>
                </Box>

                <Button
                  size="small"
                  color="error"
                  variant="outlined"
                  startIcon={<Trash2 size={14} />}
                  onClick={() => handleDeletePasskey(pk.id, pk.name)}
                  sx={{ fontSize: '0.75rem' }}
                >
                  Xóa khóa
                </Button>
              </Box>
            ))}
          </Box>
        )}
      </Paper>

      <Typography variant="h5" sx={{ fontWeight: 700, fontSize: '1.1rem', mb: 2 }}>
        Xác thực hai yếu tố (2FA / TOTP)
      </Typography>

      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: '8px',
          border: `1px solid ${tokens.border}`,
          backgroundColor: tokens.surface,
          mb: 4
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <ShieldCheck size={24} color={user?.twoFactorEnabled ? tokens.success : tokens.primary} />
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
                  Ứng dụng xác thực (Google Authenticator, Authy)
                </Typography>
                {user?.twoFactorEnabled ? (
                  <Chip label="Đang kích hoạt" size="small" color="success" sx={{ height: 22, fontWeight: 600, fontSize: '0.75rem' }} />
                ) : (
                  <Chip label="Chưa bật" size="small" sx={{ height: 22, fontSize: '0.75rem' }} />
                )}
              </Box>
              <Typography variant="body2" sx={{ color: tokens.textSecondary, mt: 0.5 }}>
                Yêu cầu mã 6 số từ ứng dụng trên điện thoại mỗi khi đăng nhập bằng mật khẩu.
              </Typography>
            </Box>
          </Box>

          {user?.twoFactorEnabled ? (
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={handleDisableMfa}
              sx={{ fontWeight: 600, fontSize: '0.8125rem' }}
            >
              Vô hiệu hóa 2FA
            </Button>
          ) : (
            <Button
              size="small"
              variant="contained"
              startIcon={<ShieldCheck size={16} />}
              onClick={handleStartMfaSetup}
              sx={{ fontWeight: 600, fontSize: '0.8125rem' }}
            >
              Kích hoạt 2FA
            </Button>
          )}
        </Box>
      </Paper>

      <Typography variant="h5" sx={{ fontWeight: 700, fontSize: '1.1rem', mb: 2 }}>
        Mật khẩu ứng dụng
      </Typography>

      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: '8px',
          border: `1px solid ${tokens.border}`,
          backgroundColor: tokens.surface
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Shield size={20} color={tokens.primary} />
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
              Mật khẩu đăng nhập
            </Typography>
          </Box>

          <Button
            size="small"
            variant="outlined"
            startIcon={<KeyRound size={15} />}
            onClick={() => {
              setPasswordError(null);
              setPasswordDialogOpen(true);
            }}
          >
            {user?.hasPassword ? 'Đổi mật khẩu' : 'Thiết lập mật khẩu'}
          </Button>
        </Box>

        <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
          {user?.hasPassword
            ? 'Bạn đã có mật khẩu đăng nhập email/password. Bạn có thể sử dụng email hoặc bất kỳ tài khoản nào đã liên kết để đăng nhập.'
            : 'Tài khoản này được đăng ký qua OAuth và chưa có mật khẩu ứng dụng. Hãy tạo mật khẩu để có thể đăng nhập bằng email.'}
        </Typography>
      </Paper>

      <Dialog open={passkeyModalOpen} onClose={() => setPasskeyModalOpen(false)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={handleRegisterPasskey}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Fingerprint size={22} color="#0969da" />
            <span>Thêm khóa bảo mật (Passkey)</span>
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
              Đặt tên nhận diện cho thiết bị của bạn (ví dụ: Windows Hello PC, MacBook Touch ID). Khi bấm "Tiếp tục", hệ thống sẽ kích hoạt trình đọc vân tay hoặc camera của bạn.
            </Typography>

            <TextField
              autoFocus
              fullWidth
              size="small"
              label="Tên khóa bảo mật"
              value={passkeyName}
              onChange={(e) => setPasskeyName(e.target.value)}
              required
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setPasskeyModalOpen(false)} color="inherit">
              Hủy
            </Button>
            <Button type="submit" variant="contained" disabled={passkeySubmitting || !passkeyName.trim()}>
              {passkeySubmitting ? 'Đang chạm vân tay...' : 'Bắt đầu quét'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={mfaModalOpen} onClose={() => setMfaModalOpen(false)} maxWidth="sm" fullWidth>
        <Box component="form" onSubmit={handleEnableMfa}>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShieldCheck size={22} color={tokens.primary} />
            <span>Cài đặt xác thực hai yếu tố (2FA)</span>
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
            {mfaError && <Alert severity="error">{mfaError}</Alert>}

            <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
              1. Mở ứng dụng <strong>Google Authenticator</strong> hoặc <strong>Authy</strong> trên điện thoại.
            </Typography>

            <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
              2. Chọn quét mã hoặc nhập thủ công khóa bí mật bên dưới:
            </Typography>

            {mfaSetupData && (
              <Box
                sx={{
                  p: 2,
                  backgroundColor: tokens.surfaceSecondary,
                  borderRadius: '6px',
                  border: `1px solid ${tokens.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1.5, wordBreak: 'break-all' }}>
                  {mfaSetupData.secret}
                </Typography>
                <Button
                  size="small"
                  startIcon={copiedSecret ? <Check size={14} /> : <Copy size={14} />}
                  onClick={() => {
                    navigator.clipboard.writeText(mfaSetupData.secret);
                    setCopiedSecret(true);
                    setTimeout(() => setCopiedSecret(false), 2000);
                  }}
                  sx={{ ml: 1, flexShrink: 0 }}
                >
                  {copiedSecret ? 'Đã sao chép' : 'Sao chép'}
                </Button>
              </Box>
            )}

            {mfaSetupData?.backupCodes && (
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: tokens.textSecondary, mb: 1, display: 'block' }}>
                  Lưu trữ mã dự phòng (dùng khi mất điện thoại):
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 1,
                    p: 1.5,
                    backgroundColor: tokens.surfaceSecondary,
                    borderRadius: '6px',
                    fontFamily: 'monospace',
                    fontSize: '0.8125rem'
                  }}
                >
                  {mfaSetupData.backupCodes.map((c, i) => (
                    <Box key={i} sx={{ textAlign: 'center', p: 0.5, border: `1px solid ${tokens.border}`, borderRadius: '4px' }}>
                      {c}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            <Box>
              <Typography variant="body2" sx={{ color: tokens.textSecondary, mb: 1 }}>
                3. Nhập mã 6 chữ số hiển thị trên ứng dụng Authenticator để hoàn tất kích hoạt:
              </Typography>
              <TextField
                fullWidth
                size="small"
                autoFocus
                label="Mã xác thực 6 số"
                placeholder="123456"
                value={mfaVerifyCode}
                onChange={(e) => setMfaVerifyCode(e.target.value)}
                inputProps={{ maxLength: 6, style: { textAlign: 'center', letterSpacing: 6, fontSize: '1.25rem', fontFamily: 'monospace' } }}
                required
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setMfaModalOpen(false)} color="inherit">
              Hủy
            </Button>
            <Button type="submit" variant="contained" disabled={mfaSubmitting || mfaVerifyCode.trim().length !== 6}>
              {mfaSubmitting ? 'Đang kích hoạt...' : 'Kích hoạt 2FA'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(unlinkConfirmTarget)} onClose={() => setUnlinkConfirmTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AlertTriangle size={20} color={tokens.error} />
          <span>Xác nhận hủy liên kết tài khoản</span>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Bạn có chắc chắn muốn hủy liên kết tài khoản <strong>{unlinkConfirmTarget?.provider.toUpperCase()}</strong> (
            @{unlinkConfirmTarget?.username || unlinkConfirmTarget?.email}) không?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setUnlinkConfirmTarget(null)} color="inherit">
            Hủy
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleExecuteUnlink}
            disabled={operatingId === unlinkConfirmTarget?.id}
          >
            {operatingId === unlinkConfirmTarget?.id ? 'Đang xử lý...' : 'Xác nhận hủy liên kết'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="xs" fullWidth>
        <Box component="form" onSubmit={handleSavePassword}>
          <DialogTitle>
            {user?.hasPassword ? 'Đổi mật khẩu ứng dụng' : 'Thiết lập mật khẩu ứng dụng'}
          </DialogTitle>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {passwordError && <Alert severity="error">{passwordError}</Alert>}

            <TextField
              autoFocus
              fullWidth
              size="small"
              type="password"
              label="Mật khẩu mới"
              placeholder="Tối thiểu 8 ký tự"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <TextField
              fullWidth
              size="small"
              type="password"
              label="Xác nhận mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setPasswordDialogOpen(false)} color="inherit">
              Hủy
            </Button>
            <Button type="submit" variant="contained" disabled={passwordSubmitting}>
              {passwordSubmitting ? 'Đang lưu...' : 'Lưu mật khẩu'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
};
