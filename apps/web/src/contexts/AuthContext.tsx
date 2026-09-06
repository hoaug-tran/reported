import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../api/client';
import { UserSummaryDto, LoginDto, RegisterDto, ConnectedAccountDto } from '@reported/contracts';

export interface LoginResult {
  user?: UserSummaryDto;
  mfaRequired?: boolean;
  tempToken?: string;
  userId?: string;
  email?: string;
}

interface AuthContextType {
  user: UserSummaryDto | null;
  isLoading: boolean;
  connectedAccounts: ConnectedAccountDto[];
  isLoadingAccounts: boolean;
  hasCodeHostingConnected: boolean;
  login: (credentials: LoginDto) => Promise<LoginResult>;
  verifyMfaLogin: (tempToken: string, code: string) => Promise<void>;
  loginWithEmailOtp: (email: string, code: string) => Promise<void>;
  loginWithPasskey: () => Promise<void>;
  register: (data: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  fetchConnectedAccounts: () => Promise<void>;
  unlinkAccount: (id: string) => Promise<void>;
  reconnectAccount: (id: string) => Promise<void>;
  setPassword: (password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccountDto[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  const refreshUser = async () => {
    try {
      const res = await apiFetch<{ user: UserSummaryDto }>('/auth/me');
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConnectedAccounts = async () => {
    if (!user) return;
    setIsLoadingAccounts(true);
    try {
      const res = await apiFetch<{ accounts: ConnectedAccountDto[]; hasPassword: boolean }>('/auth/connected-accounts');
      setConnectedAccounts(res.accounts || []);
      if (res.hasPassword !== undefined && user) {
        setUser({ ...user, hasPassword: res.hasPassword });
      }
    } catch (err) {
      console.warn('Failed to fetch connected accounts:', err);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchConnectedAccounts();
    } else {
      setConnectedAccounts([]);
    }
  }, [user?.id]);

  const login = async (credentials: LoginDto): Promise<LoginResult> => {
    const res = await apiFetch<LoginResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    if (res.mfaRequired) {
      return res;
    }
    await refreshUser();
    return res;
  };

  const verifyMfaLogin = async (tempToken: string, code: string) => {
    await apiFetch<{ success: boolean; message: string }>('/auth/mfa/verify-login', {
      method: 'POST',
      body: JSON.stringify({ tempToken, code })
    });
    await refreshUser();
  };

  const loginWithEmailOtp = async (email: string, code: string) => {
    await apiFetch<{ success: boolean; message: string }>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code })
    });
    await refreshUser();
  };

  const loginWithPasskey = async () => {
    if (!window.PublicKeyCredential) {
      throw new Error('Thiết bị hoặc trình duyệt không hỗ trợ xác thực Passkey.');
    }

    const options = await apiFetch<{
      challenge: string;
      challengeId: string;
      timeout: number;
    }>('/auth/passkeys/login-options', { method: 'POST' });

    const rawChallenge = options.challenge.replace(/-/g, '+').replace(/_/g, '/');
    const challengeBytes = Uint8Array.from(atob(rawChallenge), (c) => c.charCodeAt(0));

    const credential = await navigator.credentials.get({
      publicKey: {
        challenge: challengeBytes,
        timeout: options.timeout || 60000,
        userVerification: 'preferred'
      }
    }) as PublicKeyCredential | null;

    if (!credential) {
      throw new Error('Xác thực sinh trắc học / Passkey đã bị hủy bỏ.');
    }

    await apiFetch<{ success: boolean; message: string }>('/auth/passkeys/login-verify', {
      method: 'POST',
      body: JSON.stringify({
        credentialId: credential.id,
        challengeId: options.challengeId
      })
    });

    await refreshUser();
  };

  const register = async (data: RegisterDto) => {
    await apiFetch<{ success: boolean; message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    await refreshUser();
  };

  const logout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } finally {
      setUser(null);
      setConnectedAccounts([]);
    }
  };

  const unlinkAccount = async (id: string) => {
    await apiFetch(`/auth/connected-accounts/${id}/unlink`, { method: 'POST' });
    await fetchConnectedAccounts();
    await refreshUser();
  };

  const reconnectAccount = async (id: string) => {
    await apiFetch(`/auth/connected-accounts/${id}/reconnect`, { method: 'POST' });
    await fetchConnectedAccounts();
  };

  const setPassword = async (password: string) => {
    await apiFetch('/auth/set-password', {
      method: 'POST',
      body: JSON.stringify({ password })
    });
    await refreshUser();
    await fetchConnectedAccounts();
  };

  const hasCodeHostingConnected = connectedAccounts.some(
    (acc) => (acc.provider === 'github' || acc.provider === 'gitlab') && acc.healthStatus === 'HEALTHY'
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        connectedAccounts,
        isLoadingAccounts,
        hasCodeHostingConnected,
        login,
        verifyMfaLogin,
        loginWithEmailOtp,
        loginWithPasskey,
        register,
        logout,
        refreshUser,
        fetchConnectedAccounts,
        unlinkAccount,
        reconnectAccount,
        setPassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider');
  }
  return context;
}

