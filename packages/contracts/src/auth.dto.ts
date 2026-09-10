import { z } from "zod";
import { UserRole } from "./enums.js";

export const RegisterSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_-]+$/, {
      message:
        "Username can only contain letters, numbers, underscores, and hyphens",
    }),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(1).max(50),
  githubUsername: z.string().optional(),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  login: z.string().min(1, "Username or email is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginDto = z.infer<typeof LoginSchema>;

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(250).optional(),
  avatarUrl: z.string().url().or(z.literal("")).optional(),
  githubUsername: z.string().optional(),
});

export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;

export interface UserSummaryDto {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  role: UserRole;
  email: string;
  githubUsername?: string | null;
  hasPassword?: boolean;
  twoFactorEnabled?: boolean;
}

export interface UserProfileDto extends UserSummaryDto {
  bio?: string | null;
  createdAt: string;
  createdIssuesCount: number;
  assignedIssuesCount: number;
  pendingReviewsCount: number;
}

export type UserDto = UserProfileDto;

export interface ConnectedAccountDto {
  id: string;
  provider: string;
  providerAccountId: string;
  username?: string | null;
  email?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  scopes: string[];
  connectionType: "AUTH" | "INTEGRATION" | "BOTH";
  healthStatus: "HEALTHY" | "NEEDS_ATTENTION" | "EXPIRED" | "REVOKED";
  lastSyncedAt?: string | null;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
}

export interface OAuthProviderMetaDto {
  id: string;
  name: string;
  type: string;
  isConfigured: boolean;
  capabilities: {
    authentication: boolean;
    codeHosting: boolean;
    webhooks: boolean;
  };
  authUrl: string;
}

export const SetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type SetPasswordDto = z.infer<typeof SetPasswordSchema>;

export const OAuthCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
  returnTo: z.string().optional(),
});

export type OAuthCallbackDto = z.infer<typeof OAuthCallbackSchema>;

export interface MfaSetupResponseDto {
  secret: string;
  qrCodeUri: string;
  backupCodes: string[];
}

export const MfaVerifySchema = z.object({
  code: z.string().min(6).max(8),
  tempToken: z.string().optional(),
});

export type MfaVerifyDto = z.infer<typeof MfaVerifySchema>;

export const EmailOtpRequestSchema = z.object({
  email: z.string().email(),
});

export type EmailOtpRequestDto = z.infer<typeof EmailOtpRequestSchema>;

export const EmailOtpVerifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export type EmailOtpVerifyDto = z.infer<typeof EmailOtpVerifySchema>;

export interface PasskeyDto {
  id: string;
  name: string;
  deviceType?: string | null;
  createdAt: string;
  lastUsedAt?: string | null;
}

export const PasskeyRegisterOptionsSchema = z.object({
  name: z.string().min(1).max(50).default("Security Key / Passkey"),
});

export type PasskeyRegisterOptionsDto = z.infer<
  typeof PasskeyRegisterOptionsSchema
>;

export const PasskeyRegisterVerifySchema = z.object({
  name: z.string().min(1).max(50),
  credentialId: z.string().min(1),
  publicKey: z.string().min(1),
  deviceType: z.string().optional(),
  transports: z.array(z.string()).optional(),
});

export type PasskeyRegisterVerifyDto = z.infer<
  typeof PasskeyRegisterVerifySchema
>;

export const PasskeyLoginVerifySchema = z.object({
  credentialId: z.string().min(1),
  authenticatorData: z.string().optional(),
  clientDataJSON: z.string().optional(),
  signature: z.string().optional(),
});

export type PasskeyLoginVerifyDto = z.infer<typeof PasskeyLoginVerifySchema>;
