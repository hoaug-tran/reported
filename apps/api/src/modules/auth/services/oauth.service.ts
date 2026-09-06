import crypto from 'crypto';
import { db, users, sessions, externalAccounts, auditLogs, eq, and, sql } from '@reported/database';
import { UserRole } from '@reported/contracts';
import { config } from '../../../config/index.js';
import { AppError } from '../../../middleware/error.js';
import { authProviders } from '../providers/provider-factory.js';
import { encryptToken } from './token-cipher.service.js';
import { ExternalUserProfile, OAuthTokens } from '../providers/auth-provider.interface.js';

export interface OAuthStatePayload {
  provider?: string;
  intent: 'login' | 'link';
  userId?: string;
  returnTo?: string;
  nonce: string;
  timestamp: number;
}

export class OAuthService {
  generateState(intent: 'login' | 'link', userId?: string, returnTo?: string, provider?: string): string {
    const payload: OAuthStatePayload = {
      provider,
      intent,
      userId,
      returnTo,
      nonce: crypto.randomBytes(16).toString('hex'),
      timestamp: Date.now()
    };

    const json = JSON.stringify(payload);
    const base64Payload = Buffer.from(json).toString('base64url');
    const signature = crypto
      .createHmac('sha256', config.sessionSecret)
      .update(base64Payload)
      .digest('base64url');

    return `${base64Payload}.${signature}`;
  }

  verifyState(stateString: string): OAuthStatePayload {
    const parts = stateString.split('.');
    if (parts.length !== 2) {
      throw new AppError(400, 'INVALID_OAUTH_STATE', 'Malformed OAuth state parameter');
    }

    const [base64Payload, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', config.sessionSecret)
      .update(base64Payload)
      .digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      throw new AppError(400, 'INVALID_OAUTH_STATE', 'Tampered or invalid OAuth state signature');
    }

    try {
      const json = Buffer.from(base64Payload, 'base64url').toString('utf8');
      const payload = JSON.parse(json) as OAuthStatePayload;

      if (Date.now() - payload.timestamp > 15 * 60 * 1000) {
        throw new AppError(400, 'EXPIRED_OAUTH_STATE', 'OAuth authorization state has expired. Please try again.');
      }

      return payload;
    } catch (err: unknown) {
      if (err instanceof AppError) throw err;
      throw new AppError(400, 'INVALID_OAUTH_STATE', 'Invalid state payload');
    }
  }

  async processCallback(params: {
    providerId: string;
    code: string;
    state: string;
    currentUser?: typeof users.$inferSelect;
  }) {
    const { providerId, code, state, currentUser } = params;

    const statePayload = this.verifyState(state);
    const provider = authProviders.get(providerId);

    const tokens = await provider.exchangeCode(code);
    const profile = await provider.getUserProfile(tokens.accessToken);

    const tokenExpiresAt = tokens.expiresIn ? new Date(Date.now() + tokens.expiresIn * 1000) : null;
    const encryptedAccess = encryptToken(tokens.accessToken);
    const encryptedRefresh = encryptToken(tokens.refreshToken);

    if (statePayload.intent === 'link') {
      const targetUserId = currentUser?.id || statePayload.userId;
      if (!targetUserId) {
        throw new AppError(401, 'UNAUTHORIZED', 'Target user session required for account linking');
      }

      const targetUser = await db.query.users.findFirst({
        where: eq(users.id, targetUserId)
      });
      if (!targetUser) {
        throw new AppError(404, 'USER_NOT_FOUND', 'Target user does not exist');
      }

      const existingLink = await db.query.externalAccounts.findFirst({
        where: and(
          eq(externalAccounts.provider, providerId.toLowerCase()),
          eq(externalAccounts.providerAccountId, profile.id)
        )
      });

      if (existingLink) {
        if (existingLink.userId === targetUserId) {
          await db
            .update(externalAccounts)
            .set({
              username: profile.username,
              email: profile.email,
              displayName: profile.displayName,
              avatarUrl: profile.avatarUrl,
              accessTokenEncrypted: encryptedAccess,
              refreshTokenEncrypted: encryptedRefresh,
              tokenExpiresAt,
              scopes: tokens.scopes,
              healthStatus: 'HEALTHY',
              lastSyncedAt: new Date(),
              updatedAt: new Date()
            })
            .where(eq(externalAccounts.id, existingLink.id));

          return {
            user: targetUser,
            isLinked: true,
            isNewUser: false,
            returnTo: statePayload.returnTo || '/settings/connected-accounts'
          };
        } else {
          throw new AppError(
            409,
            'ACCOUNT_ALREADY_LINKED',
            `This ${provider.name} account (@${profile.username}) is already linked to another user account.`
          );
        }
      }

      await db.insert(externalAccounts).values({
        userId: targetUserId,
        provider: providerId.toLowerCase(),
        providerAccountId: profile.id,
        username: profile.username,
        email: profile.email,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
        accessTokenEncrypted: encryptedAccess,
        refreshTokenEncrypted: encryptedRefresh,
        tokenExpiresAt,
        scopes: tokens.scopes,
        connectionType: 'BOTH',
        healthStatus: 'HEALTHY',
        lastSyncedAt: new Date()
      });

      const updateFields: Partial<typeof users.$inferInsert> = {};
      if (!targetUser.avatarUrl && profile.avatarUrl) {
        updateFields.avatarUrl = profile.avatarUrl;
      }
      if (providerId.toLowerCase() === 'github' && !targetUser.githubUsername) {
        updateFields.githubUsername = profile.username;
      }
      if (Object.keys(updateFields).length > 0) {
        await db.update(users).set(updateFields).where(eq(users.id, targetUserId));
      }

      await db.insert(auditLogs).values({
        actorId: targetUserId,
        action: 'PROVIDER_LINKED',
        targetResource: `external_accounts:${providerId}`,
        details: {
          provider: providerId,
          providerUsername: profile.username,
          scopes: tokens.scopes
        }
      });

      return {
        user: targetUser,
        isLinked: true,
        isNewUser: false,
        returnTo: statePayload.returnTo || '/settings/connected-accounts'
      };
    }

    const existingAccount = await db.query.externalAccounts.findFirst({
      where: and(
        eq(externalAccounts.provider, providerId.toLowerCase()),
        eq(externalAccounts.providerAccountId, profile.id)
      )
    });

    if (existingAccount) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, existingAccount.userId)
      });

      if (!user) {
        throw new AppError(404, 'USER_NOT_FOUND', 'Linked user account not found');
      }

      await db
        .update(externalAccounts)
        .set({
          accessTokenEncrypted: encryptedAccess,
          refreshTokenEncrypted: encryptedRefresh,
          tokenExpiresAt,
          scopes: tokens.scopes,
          healthStatus: 'HEALTHY',
          lastSyncedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(externalAccounts.id, existingAccount.id));

      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await db.insert(sessions).values({
        userId: user.id,
        token: sessionToken,
        expiresAt
      });

      return {
        user,
        token: sessionToken,
        isNewUser: false,
        isLinked: false,
        returnTo: statePayload.returnTo || '/'
      };
    }

    if (profile.email) {
      const emailMatch = await db.query.users.findFirst({
        where: eq(users.email, profile.email.toLowerCase())
      });

      if (emailMatch) {
        throw new AppError(
          409,
          'EXISTING_ACCOUNT_LINK_REQUIRED',
          `An account with email '${profile.email}' already exists. Please sign in to link your ${provider.name} account in Settings.`
        );
      }
    }

    let baseUsername = profile.username.toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'dev_user';
    let chosenUsername = baseUsername;
    let suffix = 1;

    while (await db.query.users.findFirst({ where: eq(users.username, chosenUsername) })) {
      chosenUsername = `${baseUsername}_${suffix++}`;
    }

    const [newUser] = await db
      .insert(users)
      .values({
        username: chosenUsername,
        email: profile.email ? profile.email.toLowerCase() : `${chosenUsername}@reported.internal`,
        passwordHash: null,
        displayName: profile.displayName || chosenUsername,
        avatarUrl: profile.avatarUrl,
        bio: profile.bio || null,
        githubUsername: providerId.toLowerCase() === 'github' ? profile.username : null,
        role: UserRole.USER
      })
      .returning();

    await db.insert(externalAccounts).values({
      userId: newUser.id,
      provider: providerId.toLowerCase(),
      providerAccountId: profile.id,
      username: profile.username,
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      accessTokenEncrypted: encryptedAccess,
      refreshTokenEncrypted: encryptedRefresh,
      tokenExpiresAt,
      scopes: tokens.scopes,
      connectionType: 'BOTH',
      healthStatus: 'HEALTHY',
      lastSyncedAt: new Date()
    });

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(sessions).values({
      userId: newUser.id,
      token: sessionToken,
      expiresAt
    });

    await db.insert(auditLogs).values({
      actorId: newUser.id,
      action: 'USER_REGISTERED_OAUTH',
      targetResource: `users:${newUser.id}`,
      details: {
        provider: providerId,
        username: newUser.username,
        email: newUser.email
      }
    });

    return {
      user: newUser,
      token: sessionToken,
      isNewUser: true,
      isLinked: false,
      returnTo: statePayload.returnTo || '/'
    };
  }

  async unlinkAccount(userId: string, accountId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    const account = await db.query.externalAccounts.findFirst({
      where: and(
        eq(externalAccounts.id, accountId),
        eq(externalAccounts.userId, userId)
      )
    });
    if (!account) {
      throw new AppError(404, 'ACCOUNT_NOT_FOUND', 'Connected account not found');
    }

    const userAccounts = await db.query.externalAccounts.findMany({
      where: eq(externalAccounts.userId, userId)
    });

    const hasPassword = Boolean(user.passwordHash);
    const hasMultipleAccounts = userAccounts.length > 1;

    if (!hasPassword && !hasMultipleAccounts) {
      throw new AppError(
        400,
        'CANNOT_UNLINK_ONLY_AUTH_METHOD',
        'You cannot disconnect your only login method. Please set a password or connect another account first to avoid getting locked out.'
      );
    }

    await db.delete(externalAccounts).where(eq(externalAccounts.id, accountId));

    await db.insert(auditLogs).values({
      actorId: userId,
      action: 'PROVIDER_UNLINKED',
      targetResource: `external_accounts:${account.provider}`,
      details: {
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        username: account.username
      }
    });

    return { success: true, message: `Successfully unlinked ${account.provider} account` };
  }
}

export const oauthService = new OAuthService();

