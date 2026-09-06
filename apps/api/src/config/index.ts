import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const jwtSecret = process.env.JWT_SECRET;
const sessionSecret = process.env.SESSION_SECRET;

if (!jwtSecret || !sessionSecret) {
  throw new Error('JWT_SECRET and SESSION_SECRET must be set in environment variables');
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  jwtSecret,
  sessionSecret,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET || '',
  mailDriver: process.env.MAIL_DRIVER || (process.env.RESEND_API_KEY ? 'resend' : 'smtp'),
  resendApiKey: process.env.RESEND_API_KEY || '',
  emailFrom: process.env.MAIL_FROM || process.env.EMAIL_FROM || 'Reported <no-reply@engwithme.trkhoang.com>',
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '1025', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    secure: process.env.SMTP_SECURE === 'true'
  },
  oauth: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      redirectUri: `${process.env.CLIENT_URL || 'http://localhost:5173'}/oauth/callback`
    },
    gitlab: {
      clientId: process.env.GITLAB_CLIENT_ID || '',
      clientSecret: process.env.GITLAB_CLIENT_SECRET || '',
      redirectUri: `${process.env.CLIENT_URL || 'http://localhost:5173'}/oauth/callback`
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: `${process.env.CLIENT_URL || 'http://localhost:5173'}/oauth/callback`
    }
  }
};

