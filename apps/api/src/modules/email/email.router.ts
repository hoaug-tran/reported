import { Router, Request, Response, NextFunction } from 'express';
import { db, emailJobs, desc } from '@reported/database';
import { requireAuth } from '../../middleware/auth.js';
import { sendEmail } from '../../services/email.service.js';

export const emailRouter = Router();

emailRouter.get('/', requireAuth, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const jobs = await db.select().from(emailJobs)
      .orderBy(desc(emailJobs.createdAt))
      .limit(50);

    return res.json(jobs);
  } catch (error) {
    next(error);
  }
});

emailRouter.post('/send-test', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const targetEmail = req.body.recipientEmail?.trim() || user.email;
    const targetName = req.body.recipientName?.trim() || user.displayName;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2328; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #d0d7de; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0969da; padding: 18px 24px; color: #ffffff;">
          <h2 style="margin: 0; font-size: 18px;">Reported Notification System Test</h2>
        </div>
        <div style="padding: 24px;">
          <p>Xin chào <strong>${targetName}</strong>,</p>
          <p>Đây là email kiểm tra hệ thống thông báo từ nền tảng <strong>Reported</strong> để xác thực kênh chuyển phát Email và Transactional Outbox Worker.</p>
          <div style="margin: 20px 0; padding: 14px; background-color: #f6f8fa; border-radius: 6px; font-size: 13px; color: #57606a;">
            <div>• Người gửi: Reported Platform</div>
            <div>• Người nhận: ${targetEmail}</div>
            <div>• Thời điểm: ${new Date().toLocaleString()}</div>
          </div>
          <hr style="border: none; border-top: 1px solid #d0d7de; margin: 20px 0;" />
          <p style="font-size: 12px; color: #57606a; margin: 0;">Reported • Nền tảng trao đổi kỹ thuật cho lập trình viên</p>
        </div>
      </div>
    `;

    const text = `Reported Test Email\n\nXin chào ${targetName},\nĐây là email kiểm tra hệ thống thông báo từ nền tảng Reported.\nThời điểm: ${new Date().toISOString()}`;

    const sendResult = await sendEmail({
      to: targetEmail,
      toName: targetName,
      subject: `[Reported] Kiểm tra hệ thống thông báo Email (${new Date().toLocaleTimeString()})`,
      html,
      text
    });

    const [job] = await db.insert(emailJobs).values({
      recipientEmail: targetEmail,
      recipientName: targetName,
      subject: `[Reported] Kiểm tra hệ thống thông báo Email`,
      template: 'test-notification',
      htmlBody: html,
      textBody: text,
      status: sendResult.success ? (sendResult.mode === 'smtp' ? 'SENT' : 'SIMULATED') : 'FAILED',
      sentAt: sendResult.success ? new Date() : null
    }).returning();

    return res.status(201).json({
      ...job,
      deliveryResult: sendResult
    });
  } catch (error) {
    next(error);
  }
});

