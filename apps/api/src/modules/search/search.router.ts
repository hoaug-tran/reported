import { Router, Request, Response, NextFunction } from 'express';
import {
  db, issues, reviewRequests, users, repositories, projects, comments,
  ilike, or, eq, and, desc
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
    const cleanNum = parseInt(q.replace(/^#/, ''), 10);

    if (!isNaN(cleanNum)) {
      const numIssue = await db.query.issues.findFirst({
        where: and(eq(issues.number, cleanNum), eq(issues.isDeleted, false))
      });
      if (numIssue) {
        results.push({
          id: numIssue.id,
          type: 'ISSUE',
          number: numIssue.number,
          title: numIssue.title,
          snippet: numIssue.description.slice(0, 100),
          status: numIssue.status,
          link: `/issues/${numIssue.number}`
        });
      }

      const numReview = await db.query.reviewRequests.findFirst({
        where: and(eq(reviewRequests.number, cleanNum), eq(reviewRequests.isDeleted, false))
      });
      if (numReview) {
        results.push({
          id: numReview.id,
          type: 'REVIEW',
          number: numReview.number,
          title: numReview.title,
          snippet: numReview.description.slice(0, 100),
          status: numReview.status,
          link: `/reviews/${numReview.number}`
        });
      }
    }

    const matchingProjects = await db.select().from(projects)
      .where(or(
        ilike(projects.name, `%${q}%`),
        ilike(projects.key, `%${q}%`),
        ilike(projects.description, `%${q}%`)
      ))
      .limit(6);

    for (const p of matchingProjects) {
      results.push({
        id: p.id,
        type: 'PROJECT',
        title: `${p.name} [${p.key}]`,
        snippet: p.description || undefined,
        link: `/issues?projectId=${p.id}`
      });
    }

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
      if (!results.some(r => r.id === item.id)) {
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
      if (!results.some(r => r.id === item.id)) {
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
    }

    const matchingComments = await db.select().from(comments)
      .where(and(
        eq(comments.isDeleted, false),
        ilike(comments.content, `%${q}%`)
      ))
      .limit(5);

    for (const comm of matchingComments) {
      let targetLink = '';
      let targetTitle = '';
      if (comm.targetType === 'ISSUE') {
        const iss = await db.query.issues.findFirst({
          where: eq(issues.id, comm.targetId)
        });
        if (iss) {
          targetLink = `/issues/${iss.number}`;
          targetTitle = `Bình luận trong #${iss.number}: ${iss.title}`;
        }
      } else if (comm.targetType === 'REVIEW') {
        const rev = await db.query.reviewRequests.findFirst({
          where: eq(reviewRequests.id, comm.targetId)
        });
        if (rev) {
          targetLink = `/reviews/${rev.number}`;
          targetTitle = `Bình luận trong #${rev.number}: ${rev.title}`;
        }
      }

      if (targetLink) {
        results.push({
          id: comm.id,
          type: 'COMMENT',
          title: targetTitle,
          snippet: comm.content.slice(0, 120),
          link: targetLink
        });
      }
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
