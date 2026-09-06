import { Router, Request, Response, NextFunction } from 'express';
import {
  db, issues, reviewRequests, users, repositories,
  ilike, or, eq, and
} from '@reported/database';
import { SearchResultItemDto } from '@reported/contracts';

export const searchRouter = Router();

searchRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = (req.query.q as string || '').trim();
    if (!q) {
      return res.json([]);
    }

    const results: SearchResultItemDto[] = [];

    const matchingIssues = await db.select().from(issues)
      .where(and(
        eq(issues.isDeleted, false),
        or(
          ilike(issues.title, `%${q}%`),
          ilike(issues.description, `%${q}%`)
        )
      ))
      .limit(8);

    for (const item of matchingIssues) {
      results.push({
        id: item.id,
        type: 'ISSUE',
        number: item.number,
        title: item.title,
        snippet: item.description.slice(0, 100),
        status: item.status,
        link: `/issues/${item.number}`
      });
    }

    const matchingReviews = await db.select().from(reviewRequests)
      .where(and(
        eq(reviewRequests.isDeleted, false),
        or(
          ilike(reviewRequests.title, `%${q}%`),
          ilike(reviewRequests.description, `%${q}%`)
        )
      ))
      .limit(8);

    for (const item of matchingReviews) {
      results.push({
        id: item.id,
        type: 'REVIEW',
        number: item.number,
        title: item.title,
        snippet: item.description.slice(0, 100),
        status: item.status,
        link: `/reviews/${item.number}`
      });
    }

    const matchingUsers = await db.select().from(users)
      .where(or(
        ilike(users.username, `%${q}%`),
        ilike(users.displayName, `%${q}%`)
      ))
      .limit(5);

    for (const item of matchingUsers) {
      results.push({
        id: item.id,
        type: 'USER',
        title: `${item.displayName} (@${item.username})`,
        snippet: item.bio || undefined,
        link: `/users/${item.username}`
      });
    }

    const matchingRepos = await db.select().from(repositories)
      .where(or(
        ilike(repositories.name, `%${q}%`),
        ilike(repositories.fullName, `%${q}%`)
      ))
      .limit(5);

    for (const item of matchingRepos) {
      results.push({
        id: item.id,
        type: 'REPOSITORY',
        title: item.fullName,
        link: `/repositories`
      });
    }

    return res.json(results);
  } catch (error) {
    next(error);
  }
});

