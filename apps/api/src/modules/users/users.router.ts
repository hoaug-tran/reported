import { Router, Request, Response, NextFunction } from 'express';
import {
  db, users, issues, issueAssignees, reviewRequests, reviewReviewers, comments,
  eq, ilike, or, sql, desc, gte, and, ne
} from '@reported/database';
import { AppError } from '../../middleware/error.js';
import { requireAuth } from '../../middleware/auth.js';

export const usersRouter = Router();

usersRouter.patch('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { displayName, email, bio, avatarUrl, githubUsername } = req.body;

    const updates: Record<string, unknown> = {
      updatedAt: new Date()
    };

    if (typeof displayName === 'string' && displayName.trim()) {
      updates.displayName = displayName.trim();
    }

    if (typeof email === 'string' && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      const existing = await db.query.users.findFirst({
        where: and(eq(users.email, cleanEmail), ne(users.id, userId))
      });
      if (existing) {
        throw new AppError(400, 'EMAIL_EXISTS', 'Email is already in use by another account');
      }
      updates.email = cleanEmail;
    }

    if (typeof bio === 'string') {
      updates.bio = bio.trim().slice(0, 500);
    }

    if (typeof avatarUrl === 'string') {
      updates.avatarUrl = avatarUrl.trim();
    }

    if (typeof githubUsername === 'string') {
      updates.githubUsername = githubUsername.trim().replace(/^@/, '');
    }

    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();

    return res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      displayName: updatedUser.displayName,
      avatarUrl: updatedUser.avatarUrl,
      bio: updatedUser.bio,
      role: updatedUser.role,
      email: updatedUser.email,
      githubUsername: updatedUser.githubUsername,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt
    });
  } catch (error) {
    next(error);
  }
});

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

usersRouter.get('/:username/activity', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.username, req.params.username)
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    }

    const oneYearAgo = new Date();
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);

    const userIssues = await db
      .select({
        id: issues.id,
        title: issues.title,
        number: issues.number,
        status: issues.status,
        createdAt: issues.createdAt
      })
      .from(issues)
      .where(and(eq(issues.authorId, user.id), gte(issues.createdAt, oneYearAgo)))
      .orderBy(desc(issues.createdAt));

    const userReviews = await db
      .select({
        id: reviewRequests.id,
        title: reviewRequests.title,
        status: reviewRequests.status,
        createdAt: reviewRequests.createdAt
      })
      .from(reviewRequests)
      .where(and(eq(reviewRequests.authorId, user.id), gte(reviewRequests.createdAt, oneYearAgo)))
      .orderBy(desc(reviewRequests.createdAt));

    const userComments = await db
      .select({
        id: comments.id,
        targetType: comments.targetType,
        targetId: comments.targetId,
        createdAt: comments.createdAt
      })
      .from(comments)
      .where(and(eq(comments.authorId, user.id), gte(comments.createdAt, oneYearAgo)))
      .orderBy(desc(comments.createdAt));

    const dailyMap: Record<string, { count: number; issues: number; reviews: number; comments: number }> = {};

    for (const item of userIssues) {
      const d = new Date(item.createdAt).toISOString().split('T')[0];
      if (!dailyMap[d]) dailyMap[d] = { count: 0, issues: 0, reviews: 0, comments: 0 };
      dailyMap[d].count += 1;
      dailyMap[d].issues += 1;
    }

    for (const item of userReviews) {
      const d = new Date(item.createdAt).toISOString().split('T')[0];
      if (!dailyMap[d]) dailyMap[d] = { count: 0, issues: 0, reviews: 0, comments: 0 };
      dailyMap[d].count += 1;
      dailyMap[d].reviews += 1;
    }

    for (const item of userComments) {
      const d = new Date(item.createdAt).toISOString().split('T')[0];
      if (!dailyMap[d]) dailyMap[d] = { count: 0, issues: 0, reviews: 0, comments: 0 };
      dailyMap[d].count += 1;
      dailyMap[d].comments += 1;
    }

    let totalContributions = 0;
    const sortedDates = Object.keys(dailyMap).sort();
    for (const d of sortedDates) {
      totalContributions += dailyMap[d].count;
    }

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const today = new Date();
    for (let i = 0; i <= 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      if (dailyMap[dateStr]?.count > 0) {
        tempStreak++;
        if (i === 0 || i === 1) {
          currentStreak = tempStreak;
        }
        if (tempStreak > longestStreak) {
          longestStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
      }
    }

    const recentItems = [
      ...userIssues.slice(0, 10).map(i => ({
        type: 'issue',
        id: i.id,
        title: i.title,
        link: `/issues/${i.id}`,
        status: i.status,
        createdAt: i.createdAt
      })),
      ...userReviews.slice(0, 10).map(r => ({
        type: 'review',
        id: r.id,
        title: r.title,
        link: `/reviews/${r.id}`,
        status: r.status,
        createdAt: r.createdAt
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 15);

    return res.json({
      dailyMap,
      totalContributions,
      currentStreak,
      longestStreak,
      recentItems,
      recentIssues: userIssues.slice(0, 10),
      recentReviews: userReviews.slice(0, 10)
    });
  } catch (error) {
    next(error);
  }
});

