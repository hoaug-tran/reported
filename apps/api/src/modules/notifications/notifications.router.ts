import { Router, Request, Response, NextFunction } from "express";
import {
  db,
  notifications,
  notificationPreferences,
  users,
  eq,
  and,
  desc,
  sql,
} from "@reported/database";
import {
  NotificationType,
  NotificationChannel,
  UpdateNotificationPreferencesSchema,
} from "@reported/contracts";
import { requireAuth } from "../../middleware/auth.js";
import { AppError } from "../../middleware/error.js";

export const notificationsRouter = Router();

notificationsRouter.get(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const unreadOnly = req.query.unreadOnly === "true";

      const conditions = [eq(notifications.userId, user.id)];
      if (unreadOnly) {
        conditions.push(eq(notifications.isRead, false));
      }

      const items = await db
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.createdAt))
        .limit(50);

      const [unreadCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, user.id),
            eq(notifications.isRead, false),
          ),
        );

      const enriched = await Promise.all(
        items.map(async (n) => {
          const actor = n.actorId
            ? await db.query.users.findFirst({
                where: eq(users.id, n.actorId),
              })
            : null;

          return {
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message,
            link: n.link,
            isRead: n.isRead,
            actor: actor
              ? {
                  id: actor.id,
                  username: actor.username,
                  displayName: actor.displayName,
                  avatarUrl: actor.avatarUrl,
                }
              : null,
            createdAt: n.createdAt.toISOString(),
          };
        }),
      );

      return res.json({
        notifications: enriched,
        unreadCount: unreadCount?.count || 0,
      });
    } catch (error) {
      next(error);
    }
  },
);

notificationsRouter.patch(
  "/:id/read",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(
          and(
            eq(notifications.id, req.params.id),
            eq(notifications.userId, user.id),
          ),
        );

      return res.json({ message: "Notification marked as read" });
    } catch (error) {
      next(error);
    }
  },
);

notificationsRouter.post(
  "/read-all",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      await db
        .update(notifications)
        .set({ isRead: true, readAt: new Date() })
        .where(
          and(
            eq(notifications.userId, user.id),
            eq(notifications.isRead, false),
          ),
        );

      return res.json({ message: "All notifications marked as read" });
    } catch (error) {
      next(error);
    }
  },
);

notificationsRouter.get(
  "/preferences",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const prefs = await db.query.notificationPreferences.findMany({
        where: eq(notificationPreferences.userId, user.id),
      });

      const prefMap: Record<string, NotificationChannel> = {
        [NotificationType.MENTIONED]: NotificationChannel.BOTH,
        [NotificationType.ASSIGNED]: NotificationChannel.BOTH,
        [NotificationType.REVIEW_REQUESTED]: NotificationChannel.BOTH,
        [NotificationType.COMMENTED]: NotificationChannel.IN_APP,
        [NotificationType.ISSUE_STATUS_CHANGED]: NotificationChannel.IN_APP,
        [NotificationType.REVIEW_STATUS_CHANGED]: NotificationChannel.IN_APP,
      };

      for (const p of prefs) {
        prefMap[p.eventType] = p.channel as NotificationChannel;
      }

      return res.json(prefMap);
    } catch (error) {
      next(error);
    }
  },
);

notificationsRouter.put(
  "/preferences",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = UpdateNotificationPreferencesSchema.parse(req.body);
      const user = req.user!;

      for (const [eventType, channel] of Object.entries(input.preferences)) {
        const existing = await db.query.notificationPreferences.findFirst({
          where: and(
            eq(notificationPreferences.userId, user.id),
            eq(notificationPreferences.eventType, eventType),
          ),
        });

        if (existing) {
          await db
            .update(notificationPreferences)
            .set({ channel, updatedAt: new Date() })
            .where(
              and(
                eq(notificationPreferences.userId, user.id),
                eq(notificationPreferences.eventType, eventType),
              ),
            );
        } else {
          await db.insert(notificationPreferences).values({
            userId: user.id,
            eventType,
            channel,
          });
        }
      }

      return res.json({ message: "Notification preferences updated" });
    } catch (error) {
      next(error);
    }
  },
);
