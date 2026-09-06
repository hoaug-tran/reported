import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { config } from './config/index.js';
import { authenticate } from './middleware/auth.js';
import { errorHandler } from './middleware/error.js';
import { startOutboxWorker } from './events/outbox.js';
import { migrate } from '@reported/database';

import { authRouter } from './modules/auth/auth.router.js';
import { usersRouter } from './modules/users/users.router.js';
import { workspacesRouter } from './modules/workspaces/workspaces.router.js';
import { issuesRouter } from './modules/issues/issues.router.js';
import { reviewsRouter } from './modules/reviews/reviews.router.js';
import { commentsRouter } from './modules/comments/comments.router.js';
import { githubRouter } from './modules/github/github.router.js';
import { notificationsRouter } from './modules/notifications/notifications.router.js';
import { emailRouter } from './modules/email/email.router.js';
import { activityRouter } from './modules/activity/activity.router.js';
import { searchRouter } from './modules/search/search.router.js';
import { attachmentsRouter } from './modules/attachments/attachments.router.js';
import { savedViewsRouter } from './modules/saved-views/saved-views.router.js';

import { globalRateLimiter } from './middleware/rate-limit.js';

export const app: express.Express = express();

app.set('trust proxy', 1);
app.set('etag', false);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'sameorigin' },
  hidePoweredBy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
}));

app.use(globalRateLimiter);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));

app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use(authenticate);

app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'reported-api'
  });
});

const api = express.Router();
api.use('/auth', authRouter);
api.use('/users', usersRouter);
api.use('/workspaces', workspacesRouter);
api.use('/issues', issuesRouter);
api.use('/reviews', reviewsRouter);
api.use('/comments', commentsRouter);
api.use('/github', githubRouter);
api.use('/notifications', notificationsRouter);
api.use('/emails', emailRouter);
api.use('/activity', activityRouter);
api.use('/search', searchRouter);
api.use('/attachments', attachmentsRouter);
api.use('/saved-views', savedViewsRouter);

app.use('/api/v1', api);

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  migrate()
    .catch((err) => {
      console.error('Failed to run auto-migrations on startup:', err);
    })
    .then(() => {
      app.listen(config.port, () => {
        console.log(`⚡ Reported API running on http://localhost:${config.port}`);
        startOutboxWorker(3000);
      });
    });
}

