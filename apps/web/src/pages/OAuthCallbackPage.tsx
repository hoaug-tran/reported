import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, CircularProgress, Button, Alert
} from '@mui/material';
import { CheckCircle2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { useThemeContext } from '../contexts/ThemeContext';
import { useAuthContext } from '../contexts/AuthContext';
import { apiFetch } from '../api/client';
import { UserDto } from '@reported/contracts';

interface OAuthExchangeResponse {
  user: UserDto;
  isLinked: boolean;
  isNewUser: boolean;
  returnTo?: string;
}

export const OAuthCallbackPage: React.FC = () => {
  const { tokens } = useThemeContext();
  const { refreshUser, fetchConnectedAccounts } = useAuthContext();
  const [, setLocation] = useLocation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const processedRef = React.useRef(false);

  useEffect(() => {
    if (processedRef.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state') || '';

    let provider = urlParams.get('provider');
    if (!provider && state) {
      try {
        const rawPayload = state.split('.')[0];
        const base64 = rawPayload.replace(/-/g, '+').replace(/_/g, '/');
        const jsonStr = atob(base64);
        const parsed = JSON.parse(jsonStr);
        if (parsed.provider) {
          provider = parsed.provider;
        }
      } catch {
        provider = 'github';
      }
    }
    if (!provider) {
      provider = 'github';
    }

    if (!code || !state) {
      setError('Thiếu mã xác thực hoặc trạng thái phiên OAuth (state/code parameter missing).');
      setLoading(false);
      return;
    }

    processedRef.current = true;

    const processOAuth = async () => {
      try {
        const res = await apiFetch<OAuthExchangeResponse>(`/auth/oauth/${provider}/callback`, {
          method: 'POST',
          body: JSON.stringify({ code, state })
        });

        await refreshUser();
        await fetchConnectedAccounts();

        setSuccessMessage(
          res.isLinked
            ? `Đã liên kết thành công tài khoản ${provider.toUpperCase()}!`
            : 'Đăng nhập thành công! Đang chuyển hướng...'
        );

        setTimeout(() => {
          setLocation(res.returnTo || (res.isLinked ? '/settings/connected-accounts' : '/'));
        }, 1200);
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : 'Xác thực OAuth thất bại';
        setError(errMsg);
        setLoading(false);
      }
    };

    processOAuth();
  }, [fetchConnectedAccounts, refreshUser, setLocation]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        backgroundColor: tokens.background
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 480,
          p: 4,
          borderRadius: '8px',
          border: `1px solid ${tokens.border}`,
          backgroundColor: tokens.surface,
          textAlign: 'center'
        }}
      >
        {loading && (
          <Box sx={{ py: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={36} />
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              Đang xác thực và đồng bộ tài khoản...
            </Typography>
            <Typography variant="caption" sx={{ color: tokens.textSecondary }}>
              Kiểm tra chữ ký bảo mật và hoàn tất phiên đăng nhập
            </Typography>
          </Box>
        )}

        {successMessage && (
          <Box sx={{ py: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
            <CheckCircle2 size={48} color={tokens.success} />
            <Typography variant="h4" sx={{ fontWeight: 700, color: tokens.success }}>
              Xác thực hoàn tất
            </Typography>
            <Typography variant="body2" sx={{ color: tokens.textSecondary }}>
              {successMessage}
            </Typography>
          </Box>
        )}

        {error && (
          <Box sx={{ py: 2 }}>
            <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
              {error}
            </Alert>
            <Button variant="contained" onClick={() => setLocation('/login')}>
              Quay lại Đăng nhập
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};
