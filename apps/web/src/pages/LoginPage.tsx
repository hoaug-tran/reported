import React, { useState, useEffect } from 'react';
import {
  Box, Typography, TextField, Button, Alert, Paper, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress
} from '@mui/material';
import { ShieldAlert, Fingerprint, Mail, KeyRound, ArrowLeft, ShieldCheck, RefreshCw } from 'lucide-react';
import { useLocation } from 'wouter';
import { useThemeContext } from '../contexts/ThemeContext';
import { useAuthContext, LoginResult } from '../contexts/AuthContext';
import { BrandLogo } from '../components/common/BrandLogo';
import { apiFetch } from '../api/client';

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
    </svg>
  );
}

function GitLabIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="m23.6 9.59-1.26-3.87a.78.78 0 0 0-1.48 0L19.6 9.59H4.4L3.14 5.72a.78.78 0 0 0-1.48 0L.4 9.59a.78.78 0 0 0 .28.87l11.07 8.05a.78.78 0 0 0 .9 0l11.07-8.05a.78.78 0 0 0 .28-.87z" fill="#E24329"/>
      <path d="M12 18.51 18.72 9.6H5.28L12 18.51z" fill="#FC6D26"/>
      <path d="M12 18.51 5.28 9.6H.4l11.6 8.91z" fill="#FCA326"/>
      <path d="M12 18.51 18.72 9.6h4.88l-11.6 8.91z" fill="#FCA326"/>
    </svg>
  );
}

export const LoginPage: React.FC = () => {
  const { tokens } = useThemeContext();
  const { login, register, verifyMfaLogin, loginWithEmailOtp, loginWithPasskey } = useAuthContext();
  const [, setLocation] = useLocation();

  const [authMode, setAuthMode] = useState<'STANDARD' | 'MFA_CHALLENGE' | 'EMAIL_OTP'>('STANDARD');
  const [isRegister, setIsRegister] = useState(false);

  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');

  const [mfaChallenge, setMfaChallenge] = useState<LoginResult | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);

  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkModalMessage, setLinkModalMessage] = useState('');

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  const handleOAuthLogin = async (provider: 'github' | 'gitlab' | 'google') => {
    setError(null);
    setOauthLoading(provider);
    try {
      const res = await apiFetch<{ provider: string; url: string; state: string; isConfigured: boolean }>(
        `/auth/oauth/${provider}/authorize?intent=login`
      );
      window.location.href = res.url;
    } catch (err: unknown) {
      const apiErr = err as { code?: string; message?: string };
      if (apiErr?.code === 'EXISTING_ACCOUNT_LINK_REQUIRED') {
        setLinkModalMessage(apiErr.message || 'Tài khoản với email này đã tồn tại trong hệ thống.');
        setLinkModalOpen(true);
      } else {
        setError(apiErr?.message || `Không thể khởi chạy đăng nhập ${provider}`);
      }
      setOauthLoading(null);
    }
  };

  const handlePasskeyLogin = async () => {
    setError(null);
    setPasskeyLoading(true);
    try {
      await loginWithPasskey();
      setLocation('/');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Xác thực Passkey thất bại';
      setError(errMsg);
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await register({
          username,
          email,
          displayName,
          password
        });
        setLocation('/');
      } else {
        const res = await login({
          login: loginInput,
          password
        });

        if (res.mfaRequired) {
          setMfaChallenge(res);
          setAuthMode('MFA_CHALLENGE');
          return;
        }

        setLocation('/');
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : (err as { message?: string })?.message || 'Xác thực thất bại';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaChallenge?.tempToken) return;

    setError(null);
    setLoading(true);

    try {
      await verifyMfaLogin(mfaChallenge.tempToken, mfaCode);
      setLocation('/');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Mã xác thực 2FA không chính xác';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtpEmail = async () => {
    const targetEmail = authMode === 'MFA_CHALLENGE' ? (mfaChallenge?.email || '') : otpEmail;
    if (!targetEmail.trim()) {
      setError('Vui lòng nhập địa chỉ email');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await apiFetch('/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ email: targetEmail.trim() })
      });
      setOtpSent(true);
      setOtpCountdown(60);
      setInfoMessage(`Mã xác thực 6 số đã được gửi tới ${targetEmail}. Mã có hiệu lực trong 5 phút.`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Không thể gửi mã OTP';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await loginWithEmailOtp(otpEmail.trim(), otpCode.trim());
      setLocation('/');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Xác thực mã OTP thất bại';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        backgroundColor: tokens.background
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 440,
          p: { xs: 3, sm: 4 },
          borderRadius: '8px',
          border: `1px solid ${tokens.border}`,
          backgroundColor: tokens.surface,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
        }}
      >
        <Box sx={{ mb: 3, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ mb: 1.5 }}>
            <BrandLogo size="large" showText={true} />
          </Box>
          <Typography
            variant="body2"
            sx={{ color: tokens.textSecondary, mt: 0.5, textAlign: 'center', fontSize: '0.875rem' }}
          >
            Nền tảng kỹ thuật và review code cho kỹ sư công nghệ cao
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {infoMessage && (
          <Alert severity="info" sx={{ mb: 2.5 }} onClose={() => setInfoMessage(null)}>
            {infoMessage}
          </Alert>
        )}

        {authMode === 'MFA_CHALLENGE' && (
          <Box component="form" onSubmit={handleMfaSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ textAlign: 'center', py: 1 }}>
              <ShieldCheck size={40} color={tokens.primary} style={{ marginBottom: 8 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Xác thực hai yếu tố (2FA)
              </Typography>
              <Typography variant="body2" sx={{ color: tokens.textSecondary, mt: 0.5 }}>
                {useBackupCode
                  ? 'Nhập một trong các mã dự phòng (Backup Code) của bạn'
                  : 'Nhập mã 6 chữ số từ ứng dụng Authenticator'}
              </Typography>
            </Box>

            <TextField
              fullWidth
              size="small"
              autoFocus
              label={useBackupCode ? 'Mã dự phòng (8 ký tự)' : 'Mã xác thực (6 số)'}
              placeholder={useBackupCode ? 'xxxx-xxxx' : '123456'}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              inputProps={{ maxLength: useBackupCode ? 10 : 8, style: { textAlign: 'center', letterSpacing: 4, fontSize: '1.25rem', fontFamily: 'monospace' } }}
              required
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading || !mfaCode.trim()}
              sx={{ py: 1.1, fontWeight: 600, fontSize: '0.875rem' }}
            >
              {loading ? 'Đang kiểm tra...' : 'Xác nhận đăng nhập'}
            </Button>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              <Button
                size="small"
                variant="text"
                onClick={() => setUseBackupCode(!useBackupCode)}
                sx={{ fontSize: '0.75rem', color: tokens.textSecondary }}
              >
                {useBackupCode ? 'Dùng mã Authenticator' : 'Dùng mã dự phòng'}
              </Button>

              <Button
                size="small"
                variant="text"
                onClick={() => {
                  setAuthMode('STANDARD');
                  setMfaChallenge(null);
                  setMfaCode('');
                }}
                startIcon={<ArrowLeft size={14} />}
                sx={{ fontSize: '0.75rem', color: tokens.textSecondary }}
              >
                Quay lại
              </Button>
            </Box>
          </Box>
        )}

        {authMode === 'EMAIL_OTP' && (
          <Box component="form" onSubmit={handleEmailOtpVerify} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ textAlign: 'center', py: 1 }}>
              <Mail size={40} color={tokens.primary} style={{ marginBottom: 8 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Đăng nhập bằng Email OTP
              </Typography>
              <Typography variant="body2" sx={{ color: tokens.textSecondary, mt: 0.5 }}>
                Đăng nhập bảo mật không cần mật khẩu qua Resend Email
              </Typography>
            </Box>

            <TextField
              fullWidth
              size="small"
              type="email"
              label="Địa chỉ Email"
              placeholder="hoaug@reported.dev"
              value={otpEmail}
              onChange={(e) => setOtpEmail(e.target.value)}
              disabled={otpSent}
              required
            />

            {!otpSent ? (
              <Button
                type="button"
                variant="contained"
                fullWidth
                disabled={loading || !otpEmail.trim()}
                onClick={handleSendOtpEmail}
                sx={{ py: 1.1, fontWeight: 600, fontSize: '0.875rem' }}
              >
                {loading ? 'Đang gửi mã...' : 'Gửi mã xác thực qua Email'}
              </Button>
            ) : (
              <>
                <TextField
                  fullWidth
                  size="small"
                  autoFocus
                  label="Mã xác thực 6 chữ số"
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  inputProps={{ maxLength: 6, style: { textAlign: 'center', letterSpacing: 6, fontSize: '1.25rem', fontFamily: 'monospace' } }}
                  required
                />

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading || otpCode.trim().length !== 6}
                  sx={{ py: 1.1, fontWeight: 600, fontSize: '0.875rem' }}
                >
                  {loading ? 'Đang kiểm tra...' : 'Xác nhận & Đăng nhập'}
                </Button>

                <Box sx={{ textAlign: 'center', mt: 0.5 }}>
                  <Button
                    size="small"
                    variant="text"
                    disabled={loading || otpCountdown > 0}
                    onClick={handleSendOtpEmail}
                    startIcon={<RefreshCw size={13} />}
                    sx={{ fontSize: '0.75rem', color: tokens.textSecondary }}
                  >
                    {otpCountdown > 0 ? `Gửi lại mã (${otpCountdown}s)` : 'Gửi lại mã xác thực'}
                  </Button>
                </Box>
              </>
            )}

            <Button
              size="small"
              variant="text"
              onClick={() => {
                setAuthMode('STANDARD');
                setOtpSent(false);
                setOtpCode('');
              }}
              startIcon={<ArrowLeft size={14} />}
              sx={{ fontSize: '0.75rem', color: tokens.textSecondary, alignSelf: 'center', mt: 1 }}
            >
              Quay lại đăng nhập mật khẩu
            </Button>
          </Box>
        )}

        {authMode === 'STANDARD' && (
          <>
            <Box sx={{ mb: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={passkeyLoading ? <CircularProgress size={16} /> : <Fingerprint size={18} color="#0969da" />}
                onClick={handlePasskeyLogin}
                disabled={passkeyLoading || loading}
                sx={{
                  py: 1.1,
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  color: tokens.textPrimary,
                  borderColor: tokens.border,
                  backgroundColor: tokens.surfaceSecondary,
                  '&:hover': {
                    backgroundColor: tokens.hover,
                    borderColor: '#0969da'
                  }
                }}
              >
                {passkeyLoading ? 'Đang quét sinh trắc học...' : 'Đăng nhập nhanh bằng Passkey'}
              </Button>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.1, mb: 2.5 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<GitHubIcon />}
                onClick={() => handleOAuthLogin('github')}
                disabled={Boolean(oauthLoading) || loading}
                sx={{
                  py: 0.9,
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  color: tokens.textPrimary,
                  borderColor: tokens.border,
                  backgroundColor: tokens.surfaceSecondary,
                  '&:hover': {
                    backgroundColor: tokens.hover,
                    borderColor: tokens.primary
                  }
                }}
              >
                {oauthLoading === 'github' ? 'Đang kết nối GitHub...' : 'Continue with GitHub'}
              </Button>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<GitLabIcon />}
                onClick={() => handleOAuthLogin('gitlab')}
                disabled={Boolean(oauthLoading) || loading}
                sx={{
                  py: 0.9,
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  color: tokens.textPrimary,
                  borderColor: tokens.border,
                  backgroundColor: tokens.surfaceSecondary,
                  '&:hover': {
                    backgroundColor: tokens.hover,
                    borderColor: '#FC6D26'
                  }
                }}
              >
                {oauthLoading === 'gitlab' ? 'Đang kết nối GitLab...' : 'Continue with GitLab'}
              </Button>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<GoogleIcon />}
                onClick={() => handleOAuthLogin('google')}
                disabled={Boolean(oauthLoading) || loading}
                sx={{
                  py: 0.9,
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  color: tokens.textPrimary,
                  borderColor: tokens.border,
                  backgroundColor: tokens.surfaceSecondary,
                  '&:hover': {
                    backgroundColor: tokens.hover,
                    borderColor: '#4285F4'
                  }
                }}
              >
                {oauthLoading === 'google' ? 'Đang kết nối Google...' : 'Continue with Google'}
              </Button>
            </Box>

            <Divider sx={{ my: 2 }}>
              <Typography variant="caption" sx={{ color: tokens.textSecondary, px: 1, fontWeight: 500 }}>
                hoặc dùng tài khoản Reported
              </Typography>
            </Divider>

            <Box component="form" onSubmit={handleStandardSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 1.8 }}>
              {isRegister ? (
                <>
                  <TextField
                    fullWidth
                    size="small"
                    label="Họ và tên"
                    placeholder="Hoang Nguyen"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="Tên người dùng (Username)"
                    placeholder="hoaug"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                  <TextField
                    fullWidth
                    size="small"
                    type="email"
                    label="Địa chỉ Email"
                    placeholder="hoaug@reported.dev"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <TextField
                    fullWidth
                    size="small"
                    type="password"
                    label="Mật khẩu"
                    placeholder="Tối thiểu 8 ký tự"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </>
              ) : (
                <>
                  <TextField
                    fullWidth
                    size="small"
                    label="Username hoặc Email"
                    placeholder="hoaug hoặc hoaug@reported.dev"
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    required
                  />
                  <TextField
                    fullWidth
                    size="small"
                    type="password"
                    label="Mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </>
              )}

              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={loading || Boolean(oauthLoading) || passkeyLoading}
                sx={{ py: 1.1, mt: 0.5, fontWeight: 600, fontSize: '0.875rem' }}
              >
                {loading ? 'Đang xác thực...' : isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}
              </Button>

              {!isRegister && (
                <Box sx={{ textAlign: 'center', mt: 0.5 }}>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => {
                      setAuthMode('EMAIL_OTP');
                      setOtpEmail(loginInput.includes('@') ? loginInput : '');
                      setError(null);
                    }}
                    startIcon={<KeyRound size={14} />}
                    sx={{ fontSize: '0.8125rem', color: tokens.primary }}
                  >
                    Đăng nhập không cần mật khẩu (Email OTP)
                  </Button>
                </Box>
              )}
            </Box>

            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button
                size="small"
                variant="text"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError(null);
                }}
                sx={{ fontSize: '0.8125rem', color: tokens.textSecondary }}
              >
                {isRegister ? 'Đã có tài khoản? Đăng nhập ngay' : 'Chưa có tài khoản? Đăng ký mới'}
              </Button>
            </Box>
          </>
        )}
      </Paper>

      <Dialog open={linkModalOpen} onClose={() => setLinkModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShieldAlert size={20} color={tokens.warning} />
          <span>Xác thực tài khoản hiện có</span>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: tokens.textSecondary, mb: 2 }}>
            {linkModalMessage}
          </Typography>
          <Typography variant="body2" sx={{ color: tokens.textPrimary, fontWeight: 600 }}>
            Để bảo mật, vui lòng đăng nhập bằng mật khẩu hoặc OTP trước, sau đó vào
            <strong> Cài đặt &gt; Tài khoản đã liên kết</strong> để kết nối phương thức này.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="contained" onClick={() => setLinkModalOpen(false)}>
            Đã hiểu
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
