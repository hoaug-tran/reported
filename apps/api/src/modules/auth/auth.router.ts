import { Router, Request, Response, NextFunction } from 'express';
import { db, users, sessions, externalAccounts, auditLogs, workspaces, workspaceMembers, eq, and, or } from '@reported/database';
import {
  RegisterSchema,
  LoginSchema,
  UpdateProfileSchema,
  UserRole,
  WorkspaceRole,
  SetPasswordSchema,
  OAuthCallbackSchema
} from '@reported/contracts';
import { AppError } from '../../middleware/error.js';
import { requireAuth } from '../../middleware/auth.js';
import { authProviders } from './providers/provider-factory.js';
import { oauthService } from './services/oauth.service.js';
import { totpService } from './services/totp.service.js';
import { emailOtpService } from './services/email-otp.service.js';
import { passkeyService } from './services/passkey.service.js';
import { config } from '../../config/index.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { authRateLimiter, otpSendRateLimiter } from '../../middleware/rate-limit.js';

export const authRouter = Router();

authRouter.use(authRateLimiter);

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash?: string | null): boolean {
  if (!storedHash) return false;
  if (storedHash.includes(':')) {
    const [salt, hash] = storedHash.split(':');
    const computed = crypto.scryptSync(password, salt, 64).toString('hex');
    const computedBuf = Buffer.from(computed);
    const hashBuf = Buffer.from(hash);
    if (computedBuf.length !== hashBuf.length) return false;
    return crypto.timingSafeEqual(computedBuf, hashBuf);
  }
  const legacySalt = 'reported_static_seed_salt_2026';
  const legacyComputed = crypto.scryptSync(password, legacySalt, 64).toString('hex');
  const computedBuf = Buffer.from(legacyComputed);
  const hashBuf = Buffer.from(storedHash);
  if (computedBuf.length !== hashBuf.length) return false;
  return crypto.timingSafeEqual(computedBuf, hashBuf);
}

async function ensureDefaultWorkspace(userId: string, displayName: string, username: string) {
  const existing = await db.query.workspaceMembers.findFirst({
    where: eq(workspaceMembers.userId, userId)
  });
  if (!existing) {
    const slug = `${username}-workspace`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const [ws] = await db.insert(workspaces).values({
      name: `${displayName}'s Workspace`,
      slug,
      ownerId: userId
    }).returning();
    await db.insert(workspaceMembers).values({
      workspaceId: ws.id,
      userId,
      role: WorkspaceRole.OWNER
    });
  }
}

authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = RegisterSchema.parse(req.body);

    const existing = await db.query.users.findFirst({
      where: or(eq(users.username, input.username), eq(users.email, input.email))
    });

    if (existing) {
      if (existing.username === input.username) {
        throw new AppError(409, 'USERNAME_TAKEN', 'This username is already taken');
      }
      throw new AppError(409, 'EMAIL_TAKEN', 'This email is already registered');
    }

    const [user] = await db
      .insert(users)
      .values({
        username: input.username,
        email: input.email,
        passwordHash: hashPassword(input.password),
        displayName: input.displayName,
        githubUsername: input.githubUsername,
        role: UserRole.USER
      })
      .returning();

    await ensureDefaultWorkspace(user.id, user.displayName, user.username);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(sessions).values({
      userId: user.id,
      token,
      expiresAt
    });

    res.cookie('reported_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    return res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công'
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = LoginSchema.parse(req.body);

    const user = await db.query.users.findFirst({
      where: or(eq(users.username, input.login), eq(users.email, input.login))
    });

    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username/email or password');
    }

    if (user.twoFactorEnabled) {
      const tempToken = jwt.sign(
        { userId: user.id, email: user.email, type: '2fa_challenge' },
        config.jwtSecret,
        { expiresIn: '5m' }
      );
      return res.json({
        mfaRequired: true,
        tempToken,
        userId: user.id,
        email: user.email
      });
    }

    await ensureDefaultWorkspace(user.id, user.displayName, user.username);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(sessions).values({
      userId: user.id,
      token,
      expiresAt
    });

    res.cookie('reported_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    return res.json({
      success: true,
      message: 'Đăng nhập thành công'
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.sessionToken) {
      await db.delete(sessions).where(eq(sessions.token, req.sessionToken));
    }
    res.clearCookie('reported_session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });
    return res.json({ success: true, message: 'Đăng xuất thành công' });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;
  return res.json({
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      role: user.role,
      githubUsername: user.githubUsername,
      hasPassword: Boolean(user.passwordHash),
      twoFactorEnabled: Boolean(user.twoFactorEnabled),
      createdAt: user.createdAt
    }
  });
});

authRouter.patch('/profile', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = UpdateProfileSchema.parse(req.body);
    const user = req.user!;

    const [updated] = await db
      .update(users)
      .set({
        ...input,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id))
      .returning();

    return res.json({
      user: {
        id: updated.id,
        username: updated.username,
        displayName: updated.displayName,
        email: updated.email,
        avatarUrl: updated.avatarUrl,
        bio: updated.bio,
        role: updated.role,
        githubUsername: updated.githubUsername,
        hasPassword: Boolean(updated.passwordHash)
      }
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/providers', async (_req: Request, res: Response) => {
  const providers = authProviders.getAll();
  return res.json(providers);
});

authRouter.get('/oauth/:provider/authorize', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const providerId = req.params.provider;
    const intent = (req.query.intent as 'login' | 'link') || 'login';
    const returnTo = req.query.returnTo as string;
    const extraScopes = req.query.scopes ? (req.query.scopes as string).split(',') : [];

    const provider = authProviders.get(providerId);
    const state = oauthService.generateState(intent, req.user?.id, returnTo, providerId);
    const authUrl = provider.getAuthorizationUrl(state, intent, extraScopes);

    return res.json({
      provider: providerId,
      name: provider.name,
      url: authUrl,
      state,
      isConfigured: provider.isConfigured()
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/oauth/:provider/callback', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const providerId = req.params.provider;
    const input = OAuthCallbackSchema.parse(req.body);

    const result = await oauthService.processCallback({
      providerId,
      code: input.code,
      state: input.state,
      currentUser: req.user
    });

    if (result.user) {
      await ensureDefaultWorkspace(result.user.id, result.user.displayName, result.user.username);
    }

    if (result.token) {
      res.cookie('reported_session', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
        path: '/'
      });
    }

    return res.json({
      success: true,
      provider: providerId,
      message: result.isLinked ? 'Liên kết tài khoản thành công' : 'Đăng nhập thành công',
      isLinked: result.isLinked,
      isNewUser: result.isNewUser,
      returnTo: result.returnTo
    });
  } catch (error) {
    next(error);
  }
});



authRouter.get('/connected-accounts', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const accounts = await db.query.externalAccounts.findMany({
      where: eq(externalAccounts.userId, user.id),
      orderBy: (table, { asc }) => [asc(table.createdAt)]
    });

    const sanitizedAccounts = accounts.map((acc) => ({
      id: acc.id,
      provider: acc.provider,
      providerAccountId: acc.providerAccountId,
      username: acc.username,
      email: acc.email,
      displayName: acc.displayName,
      avatarUrl: acc.avatarUrl,
      scopes: (acc.scopes as string[]) || [],
      connectionType: acc.connectionType,
      healthStatus: acc.healthStatus,
      lastSyncedAt: acc.lastSyncedAt?.toISOString() || null,
      createdAt: acc.createdAt.toISOString(),
      metadata: (acc.metadata as Record<string, unknown>) || {}
    }));

    return res.json({
      accounts: sanitizedAccounts,
      hasPassword: Boolean(user.passwordHash),
      availableProviders: authProviders.getAll()
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/connected-accounts/:id/unlink', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const result = await oauthService.unlinkAccount(user.id, req.params.id);
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/connected-accounts/:id/reconnect', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const account = await db.query.externalAccounts.findFirst({
      where: and(eq(externalAccounts.id, req.params.id), eq(externalAccounts.userId, user.id))
    });

    if (!account) {
      throw new AppError(404, 'NOT_FOUND', 'Connected account not found');
    }

    const [updated] = await db
      .update(externalAccounts)
      .set({
        healthStatus: 'HEALTHY',
        lastSyncedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(externalAccounts.id, account.id))
      .returning();

    return res.json({
      success: true,
      message: `Connection to ${account.provider} restored and healthy`,
      account: updated
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/set-password', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = SetPasswordSchema.parse(req.body);
    const user = req.user!;

    await db
      .update(users)
      .set({
        passwordHash: hashPassword(input.password),
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    await db.insert(auditLogs).values({
      actorId: user.id,
      action: 'PASSWORD_SET',
      targetResource: `users:${user.id}`,
      details: { hadPreviousPassword: Boolean(user.passwordHash) }
    });

    return res.json({ success: true, message: 'Password set successfully. You can now sign in with email and password.' });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/mfa/setup', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const secret = totpService.generateSecret();
    const qrCodeUri = totpService.generateOtpauthUrl(user.email, secret);
    const backupCodes = totpService.generateBackupCodes(8);

    return res.json({
      secret,
      qrCodeUri,
      backupCodes
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/mfa/enable', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const { secret, code, backupCodes } = req.body;

    if (!secret || !code) {
      throw new AppError(400, 'INVALID_INPUT', 'Secret và mã xác thực là bắt buộc');
    }

    const isValid = totpService.verifyTOTP(code, secret);
    if (!isValid) {
      throw new AppError(400, 'INVALID_TOTP_CODE', 'Mã xác thực không chính xác. Vui lòng thử lại.');
    }

    await db.update(users).set({
      twoFactorEnabled: true,
      twoFactorSecret: secret,
      twoFactorBackupCodes: JSON.stringify(backupCodes || []),
      updatedAt: new Date()
    }).where(eq(users.id, user.id));

    await db.insert(auditLogs).values({
      actorId: user.id,
      action: 'MFA_ENABLED',
      targetResource: `users:${user.id}`,
      details: { method: 'TOTP' }
    });

    return res.json({
      success: true,
      message: 'Đã kích hoạt xác thực hai yếu tố (2FA) thành công'
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/mfa/disable', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;

    await db.update(users).set({
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: null,
      updatedAt: new Date()
    }).where(eq(users.id, user.id));

    await db.insert(auditLogs).values({
      actorId: user.id,
      action: 'MFA_DISABLED',
      targetResource: `users:${user.id}`,
      details: {}
    });

    return res.json({
      success: true,
      message: 'Đã vô hiệu hóa xác thực hai yếu tố (2FA)'
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/mfa/verify-login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) {
      throw new AppError(400, 'INVALID_INPUT', 'Thiếu token phiên đăng nhập hoặc mã xác thực');
    }

    let payload: { userId: string; email: string; type: string };
    try {
      payload = jwt.verify(tempToken, config.jwtSecret) as { userId: string; email: string; type: string };
    } catch {
      throw new AppError(401, 'EXPIRED_CHALLENGE', 'Phiên xác thực 2FA đã hết hạn. Vui lòng đăng nhập lại.');
    }

    if (payload.type !== '2fa_challenge') {
      throw new AppError(400, 'INVALID_CHALLENGE', 'Token xác thực không hợp lệ');
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId)
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new AppError(400, 'MFA_NOT_CONFIGURED', 'Tài khoản chưa kích hoạt 2FA');
    }

    const isTotpValid = totpService.verifyTOTP(code, user.twoFactorSecret);
    let isBackupValid = false;

    if (!isTotpValid) {
      const backupCheck = totpService.verifyBackupCode(code, user.twoFactorBackupCodes);
      if (backupCheck.isValid) {
        isBackupValid = true;
        await db.update(users).set({
          twoFactorBackupCodes: backupCheck.remainingCodesJson,
          updatedAt: new Date()
        }).where(eq(users.id, user.id));
      }
    }

    if (!isTotpValid && !isBackupValid) {
      throw new AppError(400, 'INVALID_2FA_CODE', 'Mã xác thực 2FA hoặc mã dự phòng không đúng.');
    }

    await ensureDefaultWorkspace(user.id, user.displayName, user.username);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(sessions).values({
      userId: user.id,
      token,
      expiresAt
    });

    res.cookie('reported_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    return res.json({
      success: true,
      message: 'Đăng nhập thành công'
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/otp/send', otpSendRateLimiter, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) {
      throw new AppError(400, 'EMAIL_REQUIRED', 'Vui lòng nhập địa chỉ email');
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, email.trim().toLowerCase())
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Không tìm thấy tài khoản với email này.');
    }

    await emailOtpService.sendOtp(user.email, user.displayName);

    return res.json({
      success: true,
      message: `Mã xác thực 6 chữ số đã được gửi tới email ${user.email}. Mã có hiệu lực trong 5 phút.`
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/otp/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      throw new AppError(400, 'INVALID_INPUT', 'Email và mã OTP là bắt buộc');
    }

    await emailOtpService.verifyOtp(email, code);

    const user = await db.query.users.findFirst({
      where: eq(users.email, email.trim().toLowerCase())
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Người dùng không tồn tại.');
    }

    await ensureDefaultWorkspace(user.id, user.displayName, user.username);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(sessions).values({
      userId: user.id,
      token,
      expiresAt
    });

    res.cookie('reported_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    return res.json({
      success: true,
      message: 'Đăng nhập thành công'
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/passkeys/register-options', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const options = await passkeyService.generateRegistrationOptions(req.user!);
    return res.json(options);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/passkeys/register-verify', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const created = await passkeyService.verifyRegistration(req.user!.id, req.body);
    return res.status(201).json({ success: true, passkey: created });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/passkeys', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await passkeyService.getUserPasskeys(req.user!.id);
    return res.json({ passkeys: list });
  } catch (error) {
    next(error);
  }
});

authRouter.delete('/passkeys/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    await passkeyService.deletePasskey(req.user!.id, req.params.id);
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/passkeys/login-options', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const options = await passkeyService.generateLoginOptions();
    return res.json(options);
  } catch (error) {
    next(error);
  }
});

authRouter.post('/passkeys/login-verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await passkeyService.verifyLogin(req.body);

    await ensureDefaultWorkspace(result.user.id, result.user.displayName, result.user.username);

    res.cookie('reported_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    return res.json({
      success: true,
      message: 'Đăng nhập thành công'
    });
  } catch (error) {
    next(error);
  }
});


