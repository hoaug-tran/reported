import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Paper,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  ShieldAlert,
  Fingerprint,
  Mail,
  KeyRound,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  Sun,
  Moon,
  Globe,
} from "lucide-react";
import { useLocation } from "wouter";
import { useThemeContext } from "../contexts/ThemeContext";
import { useI18n } from "../contexts/I18nContext";
import { useAuthContext, LoginResult } from "../contexts/AuthContext";
import { BrandLogo } from "../components/common/BrandLogo";
import { apiFetch } from "../api/client";
import { toast } from "../contexts/ToastContext";

import { GitHubIcon, GoogleIcon, GitLabIcon } from "../components/common/BrandIcons";

export const LoginPage: React.FC = () => {
  const { tokens, resolvedMode, setMode } = useThemeContext();
  const { t, language, setLanguage } = useI18n();
  const isVi = language === "vi";
  const {
    login,
    register,
    verifyMfaLogin,
    loginWithEmailOtp,
    loginWithPasskey,
  } = useAuthContext();
  const [, setLocation] = useLocation();

  const [authMode, setAuthMode] = useState<
    "STANDARD" | "MFA_CHALLENGE" | "EMAIL_OTP"
  >("STANDARD");
  const [isRegister, setIsRegister] = useState(false);

  const [loginInput, setLoginInput] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");

  const [mfaChallenge, setMfaChallenge] = useState<LoginResult | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [useBackupCode, setUseBackupCode] = useState(false);

  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);

  const setError = (msg: string | null) => {
    if (msg) toast.error(msg);
  };
  const setInfoMessage = (msg: string | null) => {
    if (msg) toast.info(msg);
  };
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkModalMessage, setLinkModalMessage] = useState("");

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  const handleOAuthLogin = async (provider: "github" | "gitlab" | "google") => {
    setError(null);
    setOauthLoading(provider);
    try {
      const res = await apiFetch<{
        provider: string;
        url: string;
        state: string;
        isConfigured: boolean;
      }>(`/auth/oauth/${provider}/authorize?intent=login`);
      window.location.href = res.url;
    } catch (err: unknown) {
      const apiErr = err as { code?: string; message?: string };
      if (apiErr?.code === "EXISTING_ACCOUNT_LINK_REQUIRED") {
        setLinkModalMessage(
          apiErr.message ||
            (isVi
              ? "Tài khoản với email này đã tồn tại trong hệ thống."
              : "An account with this email already exists."),
        );
        setLinkModalOpen(true);
      } else {
        setError(
          apiErr?.message ||
            (isVi
              ? `Không thể khởi chạy đăng nhập ${provider}`
              : `Could not initiate ${provider} sign-in`),
        );
      }
      setOauthLoading(null);
    }
  };

  const handlePasskeyLogin = async () => {
    setError(null);
    setPasskeyLoading(true);
    try {
      await loginWithPasskey();
      setLocation("/");
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : isVi
            ? "Xác thực Passkey thất bại"
            : "Passkey authentication failed";
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
          password,
        });
        setLocation("/");
      } else {
        const res = await login({
          login: loginInput,
          password,
        });

        if (res.mfaRequired) {
          setMfaChallenge(res);
          setAuthMode("MFA_CHALLENGE");
          return;
        }

        setLocation("/");
      }
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : (err as { message?: string })?.message ||
            (isVi ? "Xác thực thất bại" : "Authentication failed");
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
      setLocation("/");
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : isVi
            ? "Mã xác thực 2FA không chính xác"
            : "Invalid 2FA code";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtpEmail = async () => {
    const targetEmail =
      authMode === "MFA_CHALLENGE" ? mfaChallenge?.email || "" : otpEmail;
    if (!targetEmail.trim()) {
      setError(
        isVi
          ? "Vui lòng nhập địa chỉ email"
          : "Please enter your email address",
      );
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await apiFetch("/auth/otp/send", {
        method: "POST",
        body: JSON.stringify({ email: targetEmail.trim() }),
      });
      setOtpSent(true);
      setOtpCountdown(60);
      setInfoMessage(
        isVi
          ? `Mã xác thực 6 số đã được gửi tới ${targetEmail}. Mã có hiệu lực trong 5 phút.`
          : `A 6-digit code has been sent to ${targetEmail}. It expires in 5 minutes.`,
      );
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : isVi
            ? "Không thể gửi mã OTP"
            : "Could not send OTP code";
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
      setLocation("/");
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error
          ? err.message
          : isVi
            ? "Xác thực mã OTP thất bại"
            : "OTP verification failed";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
        position: "relative",
        backgroundColor: tokens.background,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 16,
          right: 20,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Tooltip title={isVi ? "Đổi sang English" : "Chuyển sang Tiếng Việt"}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setLanguage(isVi ? "en" : "vi")}
            startIcon={<Globe size={14} />}
            sx={{
              height: 32,
              px: 1.2,
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "none",
              borderRadius: "6px",
              borderColor: tokens.border,
              color: tokens.textSecondary,
              backgroundColor: tokens.surface,
              "&:hover": {
                borderColor: tokens.primary,
                color: tokens.primary,
              },
            }}
          >
            {isVi ? "EN" : "VI"}
          </Button>
        </Tooltip>

        <Tooltip
          title={
            resolvedMode === "dark"
              ? isVi
                ? "Chế độ sáng"
                : "Light mode"
              : isVi
                ? "Chế độ tối"
                : "Dark mode"
          }
        >
          <IconButton
            size="small"
            onClick={() => setMode(resolvedMode === "dark" ? "light" : "dark")}
            sx={{
              width: 32,
              height: 32,
              border: `1px solid ${tokens.border}`,
              backgroundColor: tokens.surface,
              color: tokens.textSecondary,
              borderRadius: "6px",
            }}
          >
            {resolvedMode === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </IconButton>
        </Tooltip>
      </Box>

      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 440,
          p: { xs: 3, sm: 4 },
          borderRadius: "8px",
          border: `1px solid ${tokens.border}`,
          backgroundColor: tokens.surface,
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
        }}
      >
        <Box
          sx={{
            mb: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Box sx={{ mb: 1.5 }}>
            <BrandLogo size="large" showText={true} />
          </Box>
          <Typography
            variant="body2"
            sx={{
              color: tokens.textSecondary,
              mt: 0.5,
              textAlign: "center",
              fontSize: "0.875rem",
            }}
          >
            {t("appSubtitle")}
          </Typography>
        </Box>

        {authMode === "MFA_CHALLENGE" && (
          <Box
            component="form"
            onSubmit={handleMfaSubmit}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <Box sx={{ textAlign: "center", py: 1 }}>
              <ShieldCheck
                size={40}
                color={tokens.primary}
                style={{ marginBottom: 8 }}
              />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {t("twoFactorTitle")}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: tokens.textSecondary, mt: 0.5 }}
              >
                {useBackupCode ? t("enterBackupCode") : t("enterTotpCode")}
              </Typography>
            </Box>

            <TextField
              fullWidth
              size="small"
              autoFocus
              label={useBackupCode ? t("backupCodeLabel") : t("totpCodeLabel")}
              placeholder={useBackupCode ? "xxxx-xxxx" : "123456"}
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              inputProps={{
                maxLength: useBackupCode ? 10 : 8,
                style: {
                  textAlign: "center",
                  letterSpacing: 4,
                  fontSize: "1.25rem",
                  fontFamily: "monospace",
                },
              }}
              required
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading || !mfaCode.trim()}
              sx={{ py: 1.1, fontWeight: 600, fontSize: "0.875rem" }}
            >
              {loading ? t("verifying") : t("confirmLogin")}
            </Button>

            <Box
              sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}
            >
              <Button
                size="small"
                variant="text"
                onClick={() => setUseBackupCode(!useBackupCode)}
                sx={{ fontSize: "0.75rem", color: tokens.textSecondary }}
              >
                {useBackupCode ? t("useTotpCode") : t("useBackupCode")}
              </Button>

              <Button
                size="small"
                variant="text"
                onClick={() => {
                  setAuthMode("STANDARD");
                  setMfaChallenge(null);
                  setMfaCode("");
                }}
                startIcon={<ArrowLeft size={14} />}
                sx={{ fontSize: "0.75rem", color: tokens.textSecondary }}
              >
                {t("goBack")}
              </Button>
            </Box>
          </Box>
        )}

        {authMode === "EMAIL_OTP" && (
          <Box
            component="form"
            onSubmit={handleEmailOtpVerify}
            sx={{ display: "flex", flexDirection: "column", gap: 2 }}
          >
            <Box sx={{ textAlign: "center", py: 1 }}>
              <Mail
                size={40}
                color={tokens.primary}
                style={{ marginBottom: 8 }}
              />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {t("emailOtpTitle")}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: tokens.textSecondary, mt: 0.5 }}
              >
                {t("emailOtpSubtitle")}
              </Typography>
            </Box>

            <TextField
              fullWidth
              size="small"
              type="email"
              label={t("emailAddress")}
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
                sx={{ py: 1.1, fontWeight: 600, fontSize: "0.875rem" }}
              >
                {loading ? t("sendingCode") : t("sendOtpCode")}
              </Button>
            ) : (
              <>
                <TextField
                  fullWidth
                  size="small"
                  autoFocus
                  label={t("otpCodeLabel")}
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  inputProps={{
                    maxLength: 6,
                    style: {
                      textAlign: "center",
                      letterSpacing: 6,
                      fontSize: "1.25rem",
                      fontFamily: "monospace",
                    },
                  }}
                  required
                />

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading || otpCode.trim().length !== 6}
                  sx={{ py: 1.1, fontWeight: 600, fontSize: "0.875rem" }}
                >
                  {loading ? t("verifying") : t("confirmAndLogin")}
                </Button>

                <Box sx={{ textAlign: "center", mt: 0.5 }}>
                  <Button
                    size="small"
                    variant="text"
                    disabled={loading || otpCountdown > 0}
                    onClick={handleSendOtpEmail}
                    startIcon={<RefreshCw size={13} />}
                    sx={{ fontSize: "0.75rem", color: tokens.textSecondary }}
                  >
                    {otpCountdown > 0
                      ? isVi
                        ? `Gửi lại mã (${otpCountdown}s)`
                        : `Resend code (${otpCountdown}s)`
                      : t("resendCode")}
                  </Button>
                </Box>
              </>
            )}

            <Button
              size="small"
              variant="text"
              onClick={() => {
                setAuthMode("STANDARD");
                setOtpSent(false);
                setOtpCode("");
              }}
              startIcon={<ArrowLeft size={14} />}
              sx={{
                fontSize: "0.75rem",
                color: tokens.textSecondary,
                alignSelf: "center",
                mt: 1,
              }}
            >
              {t("backToPasswordLogin")}
            </Button>
          </Box>
        )}

        {authMode === "STANDARD" && (
          <>
            <Box sx={{ mb: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={
                  passkeyLoading ? (
                    <CircularProgress size={16} />
                  ) : (
                    <Fingerprint size={18} color="#0969da" />
                  )
                }
                onClick={handlePasskeyLogin}
                disabled={passkeyLoading || loading}
                sx={{
                  py: 1.1,
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  color: tokens.textPrimary,
                  borderColor: tokens.border,
                  backgroundColor: tokens.surfaceSecondary,
                  "&:hover": {
                    backgroundColor: tokens.hover,
                    borderColor: "#0969da",
                  },
                }}
              >
                {passkeyLoading
                  ? t("biometricAuthenticating")
                  : t("signInWithPasskey")}
              </Button>
            </Box>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1.1,
                mb: 2.5,
              }}
            >
              <Button
                fullWidth
                variant="outlined"
                startIcon={<GitHubIcon />}
                onClick={() => handleOAuthLogin("github")}
                disabled={Boolean(oauthLoading) || loading}
                sx={{
                  py: 0.9,
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  color: tokens.textPrimary,
                  borderColor: tokens.border,
                  backgroundColor: tokens.surfaceSecondary,
                  "&:hover": {
                    backgroundColor: tokens.hover,
                    borderColor: tokens.primary,
                  },
                }}
              >
                {oauthLoading === "github"
                  ? `${t("connectingTo")} GitHub...`
                  : `${t("continueWith")} GitHub`}
              </Button>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<GitLabIcon />}
                onClick={() => handleOAuthLogin("gitlab")}
                disabled={Boolean(oauthLoading) || loading}
                sx={{
                  py: 0.9,
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  color: tokens.textPrimary,
                  borderColor: tokens.border,
                  backgroundColor: tokens.surfaceSecondary,
                  "&:hover": {
                    backgroundColor: tokens.hover,
                    borderColor: "#FC6D26",
                  },
                }}
              >
                {oauthLoading === "gitlab"
                  ? `${t("connectingTo")} GitLab...`
                  : `${t("continueWith")} GitLab`}
              </Button>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<GoogleIcon />}
                onClick={() => handleOAuthLogin("google")}
                disabled={Boolean(oauthLoading) || loading}
                sx={{
                  py: 0.9,
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  color: tokens.textPrimary,
                  borderColor: tokens.border,
                  backgroundColor: tokens.surfaceSecondary,
                  "&:hover": {
                    backgroundColor: tokens.hover,
                    borderColor: "#4285F4",
                  },
                }}
              >
                {oauthLoading === "google"
                  ? `${t("connectingTo")} Google...`
                  : `${t("continueWith")} Google`}
              </Button>
            </Box>

            <Divider sx={{ my: 2 }}>
              <Typography
                variant="caption"
                sx={{ color: tokens.textSecondary, px: 1, fontWeight: 500 }}
              >
                {t("orWithReported")}
              </Typography>
            </Divider>

            <Box
              component="form"
              onSubmit={handleStandardSubmit}
              sx={{ display: "flex", flexDirection: "column", gap: 1.8 }}
            >
              {isRegister ? (
                <>
                  <TextField
                    fullWidth
                    size="small"
                    label={t("fullName")}
                    placeholder="Hoang Nguyen"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label={t("username")}
                    placeholder="hoaug"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                  <TextField
                    fullWidth
                    size="small"
                    type="email"
                    label={t("emailAddress")}
                    placeholder="hoaug@reported.dev"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <TextField
                    fullWidth
                    size="small"
                    type="password"
                    label={t("password")}
                    placeholder={t("passwordPlaceholder")}
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
                    label={t("usernameOrEmail")}
                    placeholder="hoaug / hoaug@reported.dev"
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    required
                  />
                  <TextField
                    fullWidth
                    size="small"
                    type="password"
                    label={t("password")}
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
                sx={{ py: 1.1, mt: 0.5, fontWeight: 600, fontSize: "0.875rem" }}
              >
                {loading
                  ? t("authenticating")
                  : isRegister
                    ? t("createAccount")
                    : t("login")}
              </Button>

              {!isRegister && (
                <Box sx={{ textAlign: "center", mt: 0.5 }}>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => {
                      setAuthMode("EMAIL_OTP");
                      setOtpEmail(loginInput.includes("@") ? loginInput : "");
                      setError(null);
                    }}
                    startIcon={<KeyRound size={14} />}
                    sx={{ fontSize: "0.8125rem", color: tokens.primary }}
                  >
                    {t("emailOtpLogin")}
                  </Button>
                </Box>
              )}
            </Box>

            <Box sx={{ mt: 2, textAlign: "center" }}>
              <Button
                size="small"
                variant="text"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError(null);
                }}
                sx={{ fontSize: "0.8125rem", color: tokens.textSecondary }}
              >
                {isRegister ? t("alreadyHaveAccount") : t("dontHaveAccount")}
              </Button>
            </Box>
          </>
        )}
      </Paper>

      <Dialog
        open={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ShieldAlert size={20} color={tokens.warning} />
          <span>{t("accountLinkTitle")}</span>
        </DialogTitle>
        <DialogContent>
          <Typography
            variant="body2"
            sx={{ color: tokens.textSecondary, mb: 2 }}
          >
            {linkModalMessage}
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: tokens.textPrimary, fontWeight: 600 }}
          >
            {t("accountLinkDesc")}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="contained" onClick={() => setLinkModalOpen(false)}>
            {t("gotIt")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
