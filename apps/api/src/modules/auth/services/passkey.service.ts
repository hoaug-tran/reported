import crypto from 'crypto';
import { db, passkeys, authChallenges, users, sessions, auditLogs, eq, and, gt } from '@reported/database';
import { AppError } from '../../../middleware/error.js';

export class PasskeyService {
  async generateRegistrationOptions(user: typeof users.$inferSelect) {
    const challenge = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    await db.delete(authChallenges).where(
      and(
        eq(authChallenges.target, user.id),
        eq(authChallenges.challengeType, 'PASSKEY_REG')
      )
    );

    await db.insert(authChallenges).values({
      target: user.id,
      challengeType: 'PASSKEY_REG',
      code: challenge,
      expiresAt
    });

    const userPasskeys = await db.query.passkeys.findMany({
      where: eq(passkeys.userId, user.id)
    });

    return {
      challenge,
      rp: {
        name: 'Reported',
        id: undefined
      },
      user: {
        id: Buffer.from(user.id).toString('base64url'),
        name: user.username,
        displayName: user.displayName
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },
        { alg: -257, type: 'public-key' }
      ],
      timeout: 60000,
      attestation: 'none',
      excludeCredentials: userPasskeys.map((p) => ({
        id: p.credentialId,
        type: 'public-key',
        transports: (p.transports as string[]) || []
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred'
      }
    };
  }

  async verifyRegistration(userId: string, data: {
    name: string;
    credentialId: string;
    publicKey: string;
    deviceType?: string;
    transports?: string[];
  }) {
    const challengeRecord = await db.query.authChallenges.findFirst({
      where: and(
        eq(authChallenges.target, userId),
        eq(authChallenges.challengeType, 'PASSKEY_REG'),
        gt(authChallenges.expiresAt, new Date())
      )
    });

    if (!challengeRecord) {
      throw new AppError(400, 'CHALLENGE_EXPIRED', 'Phiên tạo Passkey đã hết hạn. Vui lòng thử lại.');
    }

    const existing = await db.query.passkeys.findFirst({
      where: eq(passkeys.credentialId, data.credentialId)
    });

    if (existing) {
      throw new AppError(409, 'PASSKEY_ALREADY_REGISTERED', 'Khóa bảo mật (Passkey) này đã được đăng ký.');
    }

    const [created] = await db.insert(passkeys).values({
      userId,
      name: data.name,
      credentialId: data.credentialId,
      publicKey: data.publicKey,
      deviceType: data.deviceType || 'Biometric Key',
      transports: data.transports || [],
      lastUsedAt: new Date()
    }).returning();

    await db.delete(authChallenges).where(eq(authChallenges.id, challengeRecord.id));

    await db.insert(auditLogs).values({
      actorId: userId,
      action: 'PASSKEY_REGISTERED',
      targetResource: `passkeys:${created.id}`,
      details: {
        name: created.name,
        deviceType: created.deviceType
      }
    });

    return created;
  }

  async generateLoginOptions() {
    const challenge = crypto.randomBytes(32).toString('base64url');
    const challengeId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000);

    await db.insert(authChallenges).values({
      target: challengeId,
      challengeType: 'PASSKEY_LOGIN',
      code: challenge,
      expiresAt
    });

    return {
      challenge,
      challengeId,
      timeout: 60000,
      userVerification: 'preferred'
    };
  }

  async verifyLogin(data: {
    credentialId: string;
    challengeId?: string;
  }) {
    const passkey = await db.query.passkeys.findFirst({
      where: eq(passkeys.credentialId, data.credentialId)
    });

    if (!passkey) {
      throw new AppError(401, 'PASSKEY_NOT_FOUND', 'Không tìm thấy thông tin Passkey đã đăng ký.');
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, passkey.userId)
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Người dùng liên kết với Passkey không tồn tại.');
    }

    if (data.challengeId) {
      const challenge = await db.query.authChallenges.findFirst({
        where: and(
          eq(authChallenges.target, data.challengeId),
          eq(authChallenges.challengeType, 'PASSKEY_LOGIN'),
          gt(authChallenges.expiresAt, new Date())
        )
      });
      if (challenge) {
        await db.delete(authChallenges).where(eq(authChallenges.id, challenge.id));
      }
    }

    await db.update(passkeys).set({
      lastUsedAt: new Date(),
      counter: passkey.counter + 1
    }).where(eq(passkeys.id, passkey.id));

    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.insert(sessions).values({
      userId: user.id,
      token: sessionToken,
      expiresAt
    });

    await db.insert(auditLogs).values({
      actorId: user.id,
      action: 'LOGIN_PASSKEY',
      targetResource: `passkeys:${passkey.id}`,
      details: {
        passkeyName: passkey.name
      }
    });

    return {
      user,
      token: sessionToken
    };
  }

  async getUserPasskeys(userId: string) {
    return await db.query.passkeys.findMany({
      where: eq(passkeys.userId, userId)
    });
  }

  async deletePasskey(userId: string, passkeyId: string) {
    const passkey = await db.query.passkeys.findFirst({
      where: and(
        eq(passkeys.id, passkeyId),
        eq(passkeys.userId, userId)
      )
    });

    if (!passkey) {
      throw new AppError(404, 'PASSKEY_NOT_FOUND', 'Khóa bảo mật không tồn tại.');
    }

    await db.delete(passkeys).where(eq(passkeys.id, passkeyId));

    await db.insert(auditLogs).values({
      actorId: userId,
      action: 'PASSKEY_DELETED',
      targetResource: `passkeys:${passkeyId}`,
      details: {
        name: passkey.name
      }
    });

    return { success: true };
  }
}

export const passkeyService = new PasskeyService();
