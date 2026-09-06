import { Router, Request, Response, NextFunction } from 'express';
import {
  db, users, issues, issueAssignees, reviewRequests, reviewReviewers,
  eq, ilike, or, sql
} from '@reported/database';
import { AppError } from '../../middleware/error.js';

export const usersRouter = Router();

usersRouter.get('/mentions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string || '').trim().replace(/^@/, '');
    const userList = await db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      role: users.role
    })
    .from(users)
    .where(
      q ? or(
        ilike(users.username, `%${q}%`),
        ilike(users.displayName, `%${q}%`)
      ) : undefined
    )
    .limit(10);

    return res.json(userList);
  } catch (error) {
    next(error);
  }
});

usersRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string;
    const userList = await db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      role: users.role,
      email: users.email,
      githubUsername: users.githubUsername
    })
    .from(users)
    .where(
      search ? or(
        ilike(users.username, `%${search}%`),
        ilike(users.displayName, `%${search}%`)
      ) : undefined
    )
    .limit(50);

    return res.json(userList);
  } catch (error) {
    next(error);
  }
});

usersRouter.get('/:username', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.username, req.params.username)
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    const [createdIssues] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(issues)
      .where(eq(issues.authorId, user.id));

    const [assignedIssues] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(issueAssignees)
      .where(eq(issueAssignees.userId, user.id));

    const [pendingReviews] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reviewReviewers)
      .where(eq(reviewReviewers.userId, user.id));

    return res.json({
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      role: user.role,
      email: user.email,
      githubUsername: user.githubUsername,
      createdAt: user.createdAt,
      createdIssuesCount: createdIssues?.count || 0,
      assignedIssuesCount: assignedIssues?.count || 0,
      pendingReviewsCount: pendingReviews?.count || 0
    });
  } catch (error) {
    next(error);
  }
});

