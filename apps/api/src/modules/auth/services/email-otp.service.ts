import crypto from "crypto";
import { db, authChallenges, eq, and, gt } from "@reported/database";
import { sendEmail } from "../../../services/email.service.js";
import { AppError } from "../../../middleware/error.js";

export class EmailOtpService {
  async sendOtp(
    email: string,
    displayName?: string,
  ): Promise<{ success: boolean; expiresAt: Date }> {
    const normalizedEmail = email.trim().toLowerCase();

    const codeInt = crypto.randomInt(100000, 999999);
    const code = codeInt.toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await db
      .delete(authChallenges)
      .where(
        and(
          eq(authChallenges.target, normalizedEmail),
          eq(authChallenges.challengeType, "EMAIL_OTP"),
        ),
      );

    await db.insert(authChallenges).values({
      target: normalizedEmail,
      challengeType: "EMAIL_OTP",
      code,
      expiresAt,
    });

    const greeting = displayName ? `Chào ${displayName},` : "Xin chào,";
    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff; border-radius: 8px; border: 1px solid #e1e4e8; color: #24292e;">
        <div style="margin-bottom: 24px;">
          <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #1f2328;">Mã xác thực đăng nhập Reported</h2>
        </div>
        <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.5;">${greeting}</p>
        <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.5; color: #57606a;">
          Bạn vừa yêu cầu đăng nhập vào Reported. Vui lòng nhập mã bảo mật bên dưới để hoàn tất xác thực. Mã có hiệu lực trong vòng 5 phút:
        </p>
        <div style="background-color: #f6f8fa; border: 1px solid #d0d7de; border-radius: 6px; padding: 18px 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0969da;">${code}</span>
        </div>
        <p style="margin: 0; font-size: 13px; color: #8c959f; line-height: 1.5;">
          Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email. Tuyệt đối không chia sẻ mã này với bất kỳ ai để bảo vệ tài khoản của bạn.
        </p>
      </div>
    `;

    await sendEmail({
      to: normalizedEmail,
      toName: displayName,
      subject: `[Reported] Mã xác thực đăng nhập: ${code}`,
      html: emailHtml,
      text: `Mã xác thực đăng nhập Reported của bạn là: ${code} (có hiệu lực trong 5 phút).`,
    });

    return { success: true, expiresAt };
  }

  async verifyOtp(email: string, code: string): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    const challenge = await db.query.authChallenges.findFirst({
      where: and(
        eq(authChallenges.target, normalizedEmail),
        eq(authChallenges.challengeType, "EMAIL_OTP"),
        gt(authChallenges.expiresAt, new Date()),
      ),
    });

    if (!challenge) {
      throw new AppError(
        400,
        "OTP_EXPIRED_OR_INVALID",
        "Mã xác thực đã hết hạn hoặc không tồn tại. Vui lòng yêu cầu mã mới.",
      );
    }

    if (challenge.code !== cleanCode) {
      throw new AppError(400, "OTP_INCORRECT", "Mã xác thực không chính xác.");
    }

    await db.delete(authChallenges).where(eq(authChallenges.id, challenge.id));
    return true;
  }
}

export const emailOtpService = new EmailOtpService();
