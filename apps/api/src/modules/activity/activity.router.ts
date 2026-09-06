import { Router, Request, Response, NextFunction } from 'express';
import { db, activities, users, eq, and, desc } from '@reported/database';
import { AppError } from '../../middleware/error.js';

export const activityRouter = Router();

activityRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetType = req.query.targetType as string;
    const targetId = req.query.targetId as string;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);

    const conditions = [];
    if (targetType && targetId) {
      conditions.push(eq(activities.targetType, targetType));
      conditions.push(eq(activities.targetId, targetId));
    }

    const items = await db.select().from(activities)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(activities.createdAt))
      .limit(limit);

    const enriched = await Promise.all(items.map(async (act) => {
      const actor = await db.query.users.findFirst({
        where: eq(users.id, act.actorId)
      });

      return {
        id: act.id,
        targetType: act.targetType,
        targetId: act.targetId,
        actionType: act.actionType,
        metadata: act.metadata,
        actor: {
          id: actor!.id,
          username: actor!.username,
          displayName: actor!.displayName,
          avatarUrl: actor!.avatarUrl
        },
        createdAt: act.createdAt.toISOString()
      };
    }));

    return res.json(enriched);
  } catch (error) {
    next(error);
  }
});

