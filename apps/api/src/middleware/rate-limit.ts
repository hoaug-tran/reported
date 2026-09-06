import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Hệ thống nhận thấy lưu lượng truy cập bất thường từ IP của bạn. Vui lòng thử lại sau ít phút.'
    }
  }
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req: Request): string => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  handler: (_req: Request, res: Response) => {
    return res.status(429).json({
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Đã vượt quá số lần thử xác thực cho phép (30 lần / 15 phút). Vui lòng thử lại sau.'
      }
    });
  }
});

export const otpSendRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req: Request): string => {
    const email = req.body?.email ? String(req.body.email).toLowerCase().trim() : '';
    const forwarded = req.headers['x-forwarded-for'];
    const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : (req.ip || 'unknown');
    return `${ip}:${email}`;
  },
  handler: (_req: Request, res: Response) => {
    return res.status(429).json({
      error: {
        code: 'OTP_RATE_LIMIT_EXCEEDED',
        message: 'Bạn đã yêu cầu gửi mã OTP quá nhiều lần. Vui lòng chờ 5 phút trước khi thử lại.'
      }
    });
  }
});
