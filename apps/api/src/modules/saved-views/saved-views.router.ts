import { Router, Request, Response, NextFunction } from "express";
import { db, savedViews, eq, and } from "@reported/database";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";

export const savedViewsRouter = Router();

const CreateSavedViewSchema = z.object({
  name: z.string().min(1).max(50),
  targetType: z.enum(["ISSUE", "REVIEW"]),
  filterState: z.record(z.any()),
});

savedViewsRouter.get(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const views = await db.query.savedViews.findMany({
        where: eq(savedViews.userId, user.id),
      });
      return res.json(views);
    } catch (error) {
      next(error);
    }
  },
);

savedViewsRouter.post(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = CreateSavedViewSchema.parse(req.body);
      const user = req.user!;

      const [view] = await db
        .insert(savedViews)
        .values({
          userId: user.id,
          name: input.name,
          targetType: input.targetType,
          filterState: input.filterState,
        })
        .returning();

      return res.status(201).json(view);
    } catch (error) {
      next(error);
    }
  },
);

savedViewsRouter.delete(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      await db
        .delete(savedViews)
        .where(
          and(eq(savedViews.id, req.params.id), eq(savedViews.userId, user.id)),
        );
      return res.json({ message: "Saved view removed" });
    } catch (error) {
      next(error);
    }
  },
);
