import { Router, Request, Response, NextFunction } from "express";
import {
  db,
  users,
  workspaces,
  workspaceMembers,
  projects,
  projectMembers,
  labels,
  issueLabels,
  repositories,
  issues,
  reviewRequests,
  comments,
  commentEdits,
  commentReactions,
  auditLogs,
  emailJobs,
  outboxEvents,
  notifications,
  sessions,
  eq,
  ne,
  and,
  or,
  sql,
  desc,
  asc,
  ilike,
  inArray,
  gte,
  lte,
} from "@reported/database";
import {
  UserRole,
  WorkspaceRole,
  ProjectRole,
  TargetType,
} from "@reported/contracts";
import { requireAuth } from "../../middleware/auth.js";
import { AppError } from "../../middleware/error.js";
import crypto from "crypto";

export const adminRouter = Router();

adminRouter.use(requireAuth);

const hashPassword = (password: string): string => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

const assertAdmin = (req: Request, _res: Response, next: NextFunction) => {
  const user = req.user;
  if (!user) {
    return next(new AppError(401, "UNAUTHORIZED", "Authentication required"));
  }
  if (user.role !== UserRole.ADMIN) {
    return next(new AppError(403, "FORBIDDEN", "Admin privileges required"));
  }
  next();
};

adminRouter.use(assertAdmin);

adminRouter.get(
  "/stats",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const [usersCountResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users);
      const totalUsers = usersCountResult?.count || 0;

      const [twoFactorUsersResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.twoFactorEnabled, true));
      const twoFactorCount = twoFactorUsersResult?.count || 0;

      const [adminUsersResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(eq(users.role, UserRole.ADMIN));
      const adminCount = adminUsersResult?.count || 0;

      const [issuesCountResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(issues)
        .where(eq(issues.isDeleted, false));
      const totalIssues = issuesCountResult?.count || 0;

      const [openIssuesResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(issues)
        .where(
          and(
            eq(issues.isDeleted, false),
            or(eq(issues.status, "OPEN"), eq(issues.status, "IN_PROGRESS")),
          ),
        );
      const openIssues = openIssuesResult?.count || 0;

      const [resolvedIssuesResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(issues)
        .where(
          and(
            eq(issues.isDeleted, false),
            or(eq(issues.status, "RESOLVED"), eq(issues.status, "CLOSED")),
          ),
        );
      const resolvedIssues = resolvedIssuesResult?.count || 0;

      const [reviewsCountResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(reviewRequests)
        .where(eq(reviewRequests.isDeleted, false));
      const totalReviews = reviewsCountResult?.count || 0;

      const [commentsCountResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(comments)
        .where(eq(comments.isDeleted, false));
      const totalComments = commentsCountResult?.count || 0;

      const [hiddenCommentsResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(comments)
        .where(and(eq(comments.isDeleted, false), eq(comments.isHidden, true)));
      const hiddenComments = hiddenCommentsResult?.count || 0;

      const [reactionsCountResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(commentReactions);
      const totalReactions = reactionsCountResult?.count || 0;

      const [workspacesCountResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(workspaces);
      const totalWorkspaces = workspacesCountResult?.count || 0;

      const [projectsCountResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(projects);
      const totalProjects = projectsCountResult?.count || 0;

      const [labelsCountResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(labels);
      const totalLabels = labelsCountResult?.count || 0;

      const [reposCountResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(repositories);
      const totalRepositories = reposCountResult?.count || 0;

      const [emailJobsPending] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(emailJobs)
        .where(or(eq(emailJobs.status, "PENDING"), eq(emailJobs.status, "QUEUED")));

      const [outboxPending] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(outboxEvents)
        .where(eq(outboxEvents.status, "PENDING"));

      const reactionTypeCounts = await db
        .select({
          reaction: commentReactions.reaction,
          count: sql<number>`count(*)::int`,
        })
        .from(commentReactions)
        .groupBy(commentReactions.reaction);

      const issueStatusCounts = await db
        .select({
          status: issues.status,
          count: sql<number>`count(*)::int`,
        })
        .from(issues)
        .where(eq(issues.isDeleted, false))
        .groupBy(issues.status);

      const userRoleCounts = await db
        .select({
          role: users.role,
          count: sql<number>`count(*)::int`,
        })
        .from(users)
        .groupBy(users.role);

      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

      const recentIssues = await db
        .select({
          date: sql<string>`to_char(${issues.createdAt}, 'YYYY-MM-DD')`,
          count: sql<number>`count(*)::int`,
        })
        .from(issues)
        .where(gte(issues.createdAt, fourteenDaysAgo))
        .groupBy(sql`to_char(${issues.createdAt}, 'YYYY-MM-DD')`);

      const recentReviews = await db
        .select({
          date: sql<string>`to_char(${reviewRequests.createdAt}, 'YYYY-MM-DD')`,
          count: sql<number>`count(*)::int`,
        })
        .from(reviewRequests)
        .where(gte(reviewRequests.createdAt, fourteenDaysAgo))
        .groupBy(sql`to_char(${reviewRequests.createdAt}, 'YYYY-MM-DD')`);

      const recentComments = await db
        .select({
          date: sql<string>`to_char(${comments.createdAt}, 'YYYY-MM-DD')`,
          count: sql<number>`count(*)::int`,
        })
        .from(comments)
        .where(gte(comments.createdAt, fourteenDaysAgo))
        .groupBy(sql`to_char(${comments.createdAt}, 'YYYY-MM-DD')`);

      const recentReactions = await db
        .select({
          date: sql<string>`to_char(${commentReactions.createdAt}, 'YYYY-MM-DD')`,
          count: sql<number>`count(*)::int`,
        })
        .from(commentReactions)
        .where(gte(commentReactions.createdAt, fourteenDaysAgo))
        .groupBy(sql`to_char(${commentReactions.createdAt}, 'YYYY-MM-DD')`);

      const daysMap = new Map<
        string,
        {
          date: string;
          posts: number;
          comments: number;
          reactions: number;
        }
      >();

      for (let i = 13; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().split("T")[0];
        daysMap.set(key, { date: key, posts: 0, comments: 0, reactions: 0 });
      }

      recentIssues.forEach((r) => {
        if (daysMap.has(r.date)) {
          daysMap.get(r.date)!.posts += r.count;
        }
      });
      recentReviews.forEach((r) => {
        if (daysMap.has(r.date)) {
          daysMap.get(r.date)!.posts += r.count;
        }
      });
      recentComments.forEach((r) => {
        if (daysMap.has(r.date)) {
          daysMap.get(r.date)!.comments += r.count;
        }
      });
      recentReactions.forEach((r) => {
        if (daysMap.has(r.date)) {
          daysMap.get(r.date)!.reactions += r.count;
        }
      });

      const timeline = Array.from(daysMap.values());

      const topContributors = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          role: users.role,
          commentsCount: sql<number>`(select count(*)::int from comments where comments.author_id = users.id)`,
          issuesCount: sql<number>`(select count(*)::int from issues where issues.author_id = users.id)`,
        })
        .from(users)
        .orderBy(
          desc(
            sql`(select count(*)::int from comments where comments.author_id = users.id) + (select count(*)::int from issues where issues.author_id = users.id)`,
          ),
        )
        .limit(5);

      return res.json({
        overview: {
          totalUsers,
          twoFactorCount,
          adminCount,
          totalIssues,
          openIssues,
          resolvedIssues,
          totalReviews,
          totalPosts: totalIssues + totalReviews,
          totalComments,
          hiddenComments,
          totalReactions,
          totalWorkspaces,
          totalProjects,
          totalLabels,
          totalRepositories,
          pendingEmailJobs: emailJobsPending?.count || 0,
          pendingOutboxEvents: outboxPending?.count || 0,
        },
        distributions: {
          reactions: reactionTypeCounts,
          issueStatus: issueStatusCounts,
          roles: userRoleCounts,
        },
        timeline,
        topContributors,
      });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.get(
  "/workspaces",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
      const limit = Math.min(
        100,
        Math.max(1, parseInt((req.query.limit as string) || "20", 10)),
      );
      const offset = (page - 1) * limit;
      const search = ((req.query.search as string) || "").trim();

      const searchCondition = search
        ? or(
            ilike(workspaces.name, `%${search}%`),
            ilike(workspaces.slug, `%${search}%`),
            ilike(workspaces.description, `%${search}%`),
          )
        : undefined;

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(workspaces)
        .where(searchCondition);
      const total = totalResult?.count || 0;

      const rawWorkspaces = await db
        .select({
          id: workspaces.id,
          name: workspaces.name,
          slug: workspaces.slug,
          description: workspaces.description,
          avatarUrl: workspaces.avatarUrl,
          ownerId: workspaces.ownerId,
          createdAt: workspaces.createdAt,
          updatedAt: workspaces.updatedAt,
          ownerUsername: users.username,
          ownerDisplayName: users.displayName,
          ownerEmail: users.email,
          ownerAvatarUrl: users.avatarUrl,
          membersCount: sql<number>`(select count(*)::int from workspace_members where workspace_members.workspace_id = workspaces.id)`,
          projectsCount: sql<number>`(select count(*)::int from projects where projects.workspace_id = workspaces.id)`,
          issuesCount: sql<number>`(select count(*)::int from issues where issues.workspace_id = workspaces.id and issues.is_deleted = false)`,
        })
        .from(workspaces)
        .innerJoin(users, eq(workspaces.ownerId, users.id))
        .where(searchCondition)
        .orderBy(desc(workspaces.createdAt))
        .limit(limit)
        .offset(offset);

      return res.json({
        data: rawWorkspaces,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.post(
  "/workspaces",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, slug, description, ownerId } = req.body;
      const adminActor = req.user!;

      if (!name || !slug) {
        throw new AppError(400, "MISSING_FIELDS", "name and slug are required");
      }

      const cleanSlug = slug.toLowerCase().trim();
      const existing = await db.query.workspaces.findFirst({
        where: eq(workspaces.slug, cleanSlug),
      });
      if (existing) {
        throw new AppError(409, "SLUG_EXISTS", "Workspace slug is already in use");
      }

      const resolvedOwnerId = ownerId || adminActor.id;

      const [created] = await db
        .insert(workspaces)
        .values({
          name: name.trim(),
          slug: cleanSlug,
          description: description?.trim() || null,
          ownerId: resolvedOwnerId,
        })
        .returning();

      await db.insert(workspaceMembers).values({
        workspaceId: created.id,
        userId: resolvedOwnerId,
        role: WorkspaceRole.OWNER,
      });

      await db.insert(auditLogs).values({
        actorId: adminActor.id,
        action: "CREATE_WORKSPACE",
        targetResource: `workspaces:${created.id}`,
        details: { name: created.name, slug: created.slug, ownerId: resolvedOwnerId },
      });

      return res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.patch(
  "/workspaces/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { name, slug, description, ownerId } = req.body;
      const adminActor = req.user!;

      const existing = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, id),
      });
      if (!existing) {
        throw new AppError(404, "NOT_FOUND", "Workspace not found");
      }

      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (name) updates.name = name.trim();
      if (description !== undefined) updates.description = description ? description.trim() : null;
      if (ownerId) updates.ownerId = ownerId;
      if (slug && slug.toLowerCase().trim() !== existing.slug) {
        const cleanSlug = slug.toLowerCase().trim();
        const conflict = await db.query.workspaces.findFirst({
          where: eq(workspaces.slug, cleanSlug),
        });
        if (conflict) {
          throw new AppError(409, "SLUG_EXISTS", "Slug is already used");
        }
        updates.slug = cleanSlug;
      }

      const [updated] = await db
        .update(workspaces)
        .set(updates)
        .where(eq(workspaces.id, id))
        .returning();

      await db.insert(auditLogs).values({
        actorId: adminActor.id,
        action: "UPDATE_WORKSPACE",
        targetResource: `workspaces:${id}`,
        details: updates,
      });

      return res.json(updated);
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.delete(
  "/workspaces/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const adminActor = req.user!;

      const target = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, id),
      });
      if (!target) {
        throw new AppError(404, "NOT_FOUND", "Workspace not found");
      }

      await db.delete(workspaces).where(eq(workspaces.id, id));

      await db.insert(auditLogs).values({
        actorId: adminActor.id,
        action: "DELETE_WORKSPACE",
        targetResource: `workspaces:${id}`,
        details: { name: target.name, slug: target.slug },
      });

      return res.json({ success: true, message: "Workspace deleted" });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.get(
  "/workspaces/:id/members",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const memberList = await db
        .select({
          id: workspaceMembers.id,
          userId: users.id,
          username: users.username,
          displayName: users.displayName,
          email: users.email,
          avatarUrl: users.avatarUrl,
          role: workspaceMembers.role,
          joinedAt: workspaceMembers.joinedAt,
        })
        .from(workspaceMembers)
        .innerJoin(users, eq(workspaceMembers.userId, users.id))
        .where(eq(workspaceMembers.workspaceId, id))
        .orderBy(workspaceMembers.joinedAt);

      return res.json(memberList);
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.post(
  "/workspaces/:id/members",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { userId, role } = req.body;
      const adminActor = req.user!;

      if (!userId) {
        throw new AppError(400, "MISSING_USER", "userId is required");
      }

      const existingMem = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, id),
          eq(workspaceMembers.userId, userId),
        ),
      });
      if (existingMem) {
        throw new AppError(409, "ALREADY_MEMBER", "User is already in this workspace");
      }

      const [newMem] = await db
        .insert(workspaceMembers)
        .values({
          workspaceId: id,
          userId,
          role: role || WorkspaceRole.MEMBER,
        })
        .returning();

      await db.insert(auditLogs).values({
        actorId: adminActor.id,
        action: "ADD_WORKSPACE_MEMBER",
        targetResource: `workspaces:${id}:members:${userId}`,
        details: { role: newMem.role },
      });

      return res.status(201).json(newMem);
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.patch(
  "/workspaces/:id/members/:userId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, userId } = req.params;
      const { role } = req.body;
      const adminActor = req.user!;

      if (!role) {
        throw new AppError(400, "MISSING_ROLE", "role is required");
      }

      const [updated] = await db
        .update(workspaceMembers)
        .set({ role })
        .where(
          and(
            eq(workspaceMembers.workspaceId, id),
            eq(workspaceMembers.userId, userId),
          ),
        )
        .returning();

      if (!updated) {
        throw new AppError(404, "MEMBER_NOT_FOUND", "Member not found");
      }

      await db.insert(auditLogs).values({
        actorId: adminActor.id,
        action: "UPDATE_WORKSPACE_MEMBER_ROLE",
        targetResource: `workspaces:${id}:members:${userId}`,
        details: { role },
      });

      return res.json(updated);
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.delete(
  "/workspaces/:id/members/:userId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, userId } = req.params;
      const adminActor = req.user!;

      await db
        .delete(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, id),
            eq(workspaceMembers.userId, userId),
          ),
        );

      await db.insert(auditLogs).values({
        actorId: adminActor.id,
        action: "REMOVE_WORKSPACE_MEMBER",
        targetResource: `workspaces:${id}:members:${userId}`,
        details: {},
      });

      return res.json({ success: true, message: "Member removed from workspace" });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.post(
  "/users",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, email, password, displayName, role } = req.body;
      const adminActor = req.user!;

      if (!username || !email || !password || !displayName) {
        throw new AppError(400, "MISSING_FIELDS", "username, email, password, displayName are required");
      }

      const cleanUsername = username.trim().toLowerCase();
      const cleanEmail = email.trim().toLowerCase();

      const existing = await db.query.users.findFirst({
        where: or(
          eq(users.username, cleanUsername),
          eq(users.email, cleanEmail),
        ),
      });

      if (existing) {
        throw new AppError(409, "USER_EXISTS", "Username or email already exists");
      }

      const passwordHash = hashPassword(password);

      const [created] = await db
        .insert(users)
        .values({
          username: cleanUsername,
          email: cleanEmail,
          displayName: displayName.trim(),
          passwordHash,
          role: role || UserRole.USER,
        })
        .returning();

      await db.insert(auditLogs).values({
        actorId: adminActor.id,
        action: "CREATE_USER",
        targetResource: `users:${created.id}`,
        details: { username: created.username, email: created.email, role: created.role },
      });

      return res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.patch(
  "/users/:id/password",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const newPassword = (req.body.newPassword || req.body.password || "").trim();
      const adminActor = req.user!;

      if (!newPassword || newPassword.length < 6) {
        throw new AppError(400, "INVALID_PASSWORD", "Password must be at least 6 characters");
      }

      const target = await db.query.users.findFirst({
        where: eq(users.id, id),
      });
      if (!target) {
        throw new AppError(404, "NOT_FOUND", "User not found");
      }

      const passwordHash = hashPassword(newPassword);

      await db
        .update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.id, id));

      await db.insert(auditLogs).values({
        actorId: adminActor.id,
        action: "RESET_USER_PASSWORD",
        targetResource: `users:${id}`,
        details: { username: target.username },
      });

      return res.json({ success: true, message: "Password reset successful" });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.patch(
  "/users/:id/2fa",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { twoFactorEnabled } = req.body;
      const adminActor = req.user!;

      const [updated] = await db
        .update(users)
        .set({
          twoFactorEnabled: Boolean(twoFactorEnabled),
          twoFactorSecret: twoFactorEnabled ? undefined : null,
          twoFactorBackupCodes: twoFactorEnabled ? undefined : null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning();

      await db.insert(auditLogs).values({
        actorId: adminActor.id,
        action: "TOGGLE_USER_2FA",
        targetResource: `users:${id}`,
        details: { twoFactorEnabled: Boolean(twoFactorEnabled) },
      });

      return res.json({ success: true, user: updated });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.patch(
  "/users/:id/profile",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { displayName, email, bio, githubUsername, role } = req.body;
      const adminActor = req.user!;

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (typeof displayName === "string") updates.displayName = displayName.trim();
      if (typeof email === "string") updates.email = email.trim();
      if (typeof bio === "string") updates.bio = bio.trim() || null;
      if (typeof githubUsername === "string") updates.githubUsername = githubUsername.trim() || null;
      if (typeof role === "string" && ["ADMIN", "USER"].includes(role)) {
        if (id === adminActor.id && role !== "ADMIN") {
          throw new AppError(400, "CANNOT_DEMOTE_SELF", "You cannot demote yourself from admin");
        }
        updates.role = role;
      }

      const [updated] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, id))
        .returning();

      await db.insert(auditLogs).values({
        actorId: adminActor.id,
        action: "UPDATE_USER_PROFILE",
        targetResource: `users:${id}`,
        details: updates,
      });

      return res.json({ success: true, user: updated });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.delete(
  "/users/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const adminActor = req.user!;

      if (id === adminActor.id) {
        throw new AppError(400, "CANNOT_DELETE_SELF", "You cannot delete your own account");
      }

      const target = await db.query.users.findFirst({
        where: eq(users.id, id),
      });
      if (!target) {
        throw new AppError(404, "NOT_FOUND", "User not found");
      }

      await db.delete(users).where(eq(users.id, id));

      await db.insert(auditLogs).values({
        actorId: adminActor.id,
        action: "DELETE_USER",
        targetResource: `users:${id}`,
        details: { username: target.username, email: target.email },
      });

      return res.json({ success: true, message: "User deleted" });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.get(
  "/projects",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
      const limit = Math.min(
        100,
        Math.max(1, parseInt((req.query.limit as string) || "20", 10)),
      );
      const offset = (page - 1) * limit;
      const search = ((req.query.search as string) || "").trim();
      const workspaceId = ((req.query.workspaceId as string) || "").trim();

      const searchCondition = search
        ? or(
            ilike(projects.name, `%${search}%`),
            ilike(projects.key, `%${search}%`),
            ilike(projects.slug, `%${search}%`),
          )
        : undefined;

      const wsCondition = workspaceId ? eq(projects.workspaceId, workspaceId) : undefined;
      const whereClause = searchCondition && wsCondition ? and(searchCondition, wsCondition) : searchCondition || wsCondition;

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(projects)
        .where(whereClause);
      const total = totalResult?.count || 0;

      const raw = await db
        .select({
          id: projects.id,
          name: projects.name,
          key: projects.key,
          slug: projects.slug,
          description: projects.description,
          workspaceId: projects.workspaceId,
          createdAt: projects.createdAt,
          updatedAt: projects.updatedAt,
          workspaceName: workspaces.name,
          workspaceSlug: workspaces.slug,
          issuesCount: sql<number>`(select count(*)::int from issues where issues.project_id = projects.id and issues.is_deleted = false)`,
        })
        .from(projects)
        .innerJoin(workspaces, eq(projects.workspaceId, workspaces.id))
        .where(whereClause)
        .orderBy(desc(projects.createdAt))
        .limit(limit)
        .offset(offset);

      return res.json({
        data: raw,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.post(
  "/projects",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { workspaceId, name, key, slug, description } = req.body;
      const adminActor = req.user!;

      if (!workspaceId || !name || !key || !slug) {
        throw new AppError(400, "MISSING_FIELDS", "workspaceId, name, key, slug are required");
      }

      const [created] = await db
        .insert(projects)
        .values({
          workspaceId,
          name: name.trim(),
          key: key.trim().toUpperCase(),
          slug: slug.trim().toLowerCase(),
          description: description?.trim() || null,
        })
        .returning();

      await db.insert(auditLogs).values({
        actorId: adminActor.id,
        action: "CREATE_PROJECT",
        targetResource: `projects:${created.id}`,
        details: { name: created.name, key: created.key, workspaceId },
      });

      return res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.patch(
  "/projects/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { name, key, slug, description } = req.body;
      const adminActor = req.user!;

      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
      };
      if (name) updates.name = name.trim();
      if (key) updates.key = key.trim().toUpperCase();
      if (slug) updates.slug = slug.trim().toLowerCase();
      if (description !== undefined) updates.description = description ? description.trim() : null;

      const [updated] = await db
        .update(projects)
        .set(updates)
        .where(eq(projects.id, id))
        .returning();

      await db.insert(auditLogs).values({
        actorId: adminActor.id,
        action: "UPDATE_PROJECT",
        targetResource: `projects:${id}`,
        details: updates,
      });

      return res.json(updated);
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.delete(
  "/projects/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const adminActor = req.user!;

      await db.delete(projects).where(eq(projects.id, id));

      await db.insert(auditLogs).values({
        actorId: adminActor.id,
        action: "DELETE_PROJECT",
        targetResource: `projects:${id}`,
        details: {},
      });

      return res.json({ success: true, message: "Project deleted" });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.get(
  "/labels",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
      const limit = Math.min(
        100,
        Math.max(1, parseInt((req.query.limit as string) || "20", 10)),
      );
      const offset = (page - 1) * limit;
      const search = ((req.query.search as string) || "").trim();

      const conditions: any[] = [];
      if (search) {
        conditions.push(ilike(labels.name, `%${search}%`));
      }
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(labels)
        .where(whereClause);
      const total = totalResult?.count || 0;

      const rawLabels = await db
        .select({
          id: labels.id,
          name: labels.name,
          color: labels.color,
          description: labels.description,
          createdAt: labels.createdAt,
          issuesCount: sql<number>`(select count(*)::int from issue_labels where issue_labels.label_id = labels.id)`,
        })
        .from(labels)
        .where(whereClause)
        .orderBy(asc(labels.name))
        .limit(limit)
        .offset(offset);

      if (req.query.all === "true") {
        return res.json(rawLabels);
      }

      return res.json({
        data: rawLabels,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.post(
  "/labels",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, color, description } = req.body;
      const adminActor = req.user!;

      if (!name) {
        throw new AppError(400, "MISSING_NAME", "Label name is required");
      }

      const cleanName = name.trim().toLowerCase();
      const existing = await db.query.labels.findFirst({
        where: eq(labels.name, cleanName),
      });
      if (existing) {
        throw new AppError(409, "LABEL_EXISTS", "Label already exists");
      }

      const [created] = await db
        .insert(labels)
        .values({
          name: cleanName,
          color: color?.trim() || "#58a6ff",
          description: description?.trim() || null,
        })
        .returning();

      await db.insert(auditLogs).values({
        actorId: adminActor.id,
        action: "CREATE_LABEL",
        targetResource: `labels:${created.id}`,
        details: { name: created.name, color: created.color },
      });

      return res.status(201).json(created);
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.patch(
  "/labels/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { name, color, description } = req.body;
      const adminActor = req.user!;

      const updates: Record<string, unknown> = {};
      if (name) updates.name = name.trim().toLowerCase();
      if (color) updates.color = color.trim();
      if (description !== undefined) updates.description = description ? description.trim() : null;

      const [updated] = await db
        .update(labels)
        .set(updates)
        .where(eq(labels.id, id))
        .returning();

      await db.insert(auditLogs).values({
        actorId: adminActor.id,
        action: "UPDATE_LABEL",
        targetResource: `labels:${id}`,
        details: updates,
      });

      return res.json(updated);
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.delete(
  "/labels/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const adminActor = req.user!;

      await db.delete(labels).where(eq(labels.id, id));

      await db.insert(auditLogs).values({
        actorId: adminActor.id,
        action: "DELETE_LABEL",
        targetResource: `labels:${id}`,
        details: {},
      });

      return res.json({ success: true, message: "Label deleted" });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.get(
  "/repositories",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const repos = await db
        .select({
          id: repositories.id,
          workspaceId: repositories.workspaceId,
          name: repositories.name,
          owner: repositories.owner,
          fullName: repositories.fullName,
          isPrivate: repositories.isPrivate,
          defaultBranch: repositories.defaultBranch,
          createdAt: repositories.createdAt,
          workspaceName: workspaces.name,
          workspaceSlug: workspaces.slug,
          pullRequestsCount: sql<number>`(select count(*)::int from pull_requests where pull_requests.repository_id = repositories.id)`,
        })
        .from(repositories)
        .innerJoin(workspaces, eq(repositories.workspaceId, workspaces.id))
        .orderBy(desc(repositories.createdAt));

      return res.json(repos);
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.delete(
  "/repositories/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const adminActor = req.user!;

      await db.delete(repositories).where(eq(repositories.id, id));

      await db.insert(auditLogs).values({
        actorId: adminActor.id,
        action: "DELETE_REPOSITORY",
        targetResource: `repositories:${id}`,
        details: {},
      });

      return res.json({ success: true, message: "Repository unlinked and removed" });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.get(
  "/queues",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const recentEmails = await db
        .select()
        .from(emailJobs)
        .orderBy(desc(emailJobs.createdAt))
        .limit(20);

      const recentOutbox = await db
        .select()
        .from(outboxEvents)
        .orderBy(desc(outboxEvents.createdAt))
        .limit(20);

      return res.json({
        emails: recentEmails,
        outbox: recentOutbox,
      });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.post(
  "/queues/retry",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;
      const adminActor = req.user!;
      let emailRetried = 0;
      let outboxRetried = 0;

      if (!type || type === "emails" || type === "all") {
        const emailRes = await db
          .update(emailJobs)
          .set({ status: "QUEUED", error: null })
          .where(eq(emailJobs.status, "FAILED"))
          .returning();
        emailRetried = emailRes.length;
      }
      if (!type || type === "outbox" || type === "all") {
        const outboxRes = await db
          .update(outboxEvents)
          .set({ status: "PENDING", attempts: 0, error: null })
          .where(eq(outboxEvents.status, "FAILED"))
          .returning();
        outboxRetried = outboxRes.length;
      }

      await db.insert(auditLogs).values({
        actorId: adminActor.id,
        action: "RETRY_QUEUES",
        targetResource: `queues:${type || "all"}`,
        details: { queueType: type, emailRetried, outboxRetried },
      });

      return res.json({ success: true, emailRetried, outboxRetried });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.get(
  "/users",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
      const limit = Math.min(
        100,
        Math.max(1, parseInt((req.query.limit as string) || "20", 10)),
      );
      const offset = (page - 1) * limit;
      const search = ((req.query.search as string) || "").trim();
      const roleFilter = ((req.query.role as string) || "").trim();

      const searchCondition = search
        ? or(
            ilike(users.username, `%${search}%`),
            ilike(users.displayName, `%${search}%`),
            ilike(users.email, `%${search}%`),
          )
        : undefined;

      const roleCondition = roleFilter ? eq(users.role, roleFilter) : undefined;

      const whereClause =
        searchCondition && roleCondition
          ? and(searchCondition, roleCondition)
          : searchCondition || roleCondition;

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(users)
        .where(whereClause);
      const total = totalResult?.count || 0;

      const rawUsers = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          email: users.email,
          avatarUrl: users.avatarUrl,
          bio: users.bio,
          githubUsername: users.githubUsername,
          role: users.role,
          twoFactorEnabled: users.twoFactorEnabled,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          issuesCount: sql<number>`(select count(*)::int from issues where issues.author_id = users.id and issues.is_deleted = false)`,
          reviewsCount: sql<number>`(select count(*)::int from review_requests where review_requests.author_id = users.id and review_requests.is_deleted = false)`,
          commentsCount: sql<number>`(select count(*)::int from comments where comments.author_id = users.id and comments.is_deleted = false)`,
          reactionsCount: sql<number>`(select count(*)::int from comment_reactions where comment_reactions.user_id = users.id)`,
          workspacesCount: sql<number>`(select count(*)::int from workspace_members where workspace_members.user_id = users.id)`,
        })
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset);

      return res.json({
        data: rawUsers.map((u) => ({
          ...u,
          postsCount: u.issuesCount + u.reviewsCount,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.get(
  "/users/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const targetUser = await db.query.users.findFirst({
        where: eq(users.id, id),
      });

      if (!targetUser) {
        throw new AppError(404, "NOT_FOUND", "User not found");
      }

      const userWorkspaces = await db
        .select({
          workspaceId: workspaces.id,
          name: workspaces.name,
          slug: workspaces.slug,
          role: workspaceMembers.role,
          joinedAt: workspaceMembers.joinedAt,
        })
        .from(workspaceMembers)
        .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
        .where(eq(workspaceMembers.userId, id));

      const recentIssues = await db
        .select({
          id: issues.id,
          number: issues.number,
          title: issues.title,
          type: issues.type,
          status: issues.status,
          createdAt: issues.createdAt,
        })
        .from(issues)
        .where(and(eq(issues.authorId, id), eq(issues.isDeleted, false)))
        .orderBy(desc(issues.createdAt))
        .limit(5);

      const recentReviews = await db
        .select({
          id: reviewRequests.id,
          number: reviewRequests.number,
          title: reviewRequests.title,
          reviewType: reviewRequests.reviewType,
          status: reviewRequests.status,
          createdAt: reviewRequests.createdAt,
        })
        .from(reviewRequests)
        .where(
          and(
            eq(reviewRequests.authorId, id),
            eq(reviewRequests.isDeleted, false),
          ),
        )
        .orderBy(desc(reviewRequests.createdAt))
        .limit(5);

      const recentComments = await db
        .select({
          id: comments.id,
          targetType: comments.targetType,
          targetId: comments.targetId,
          content: comments.content,
          isHidden: comments.isHidden,
          createdAt: comments.createdAt,
        })
        .from(comments)
        .where(and(eq(comments.authorId, id), eq(comments.isDeleted, false)))
        .orderBy(desc(comments.createdAt))
        .limit(5);

      const recentReactions = await db
        .select({
          commentId: commentReactions.commentId,
          reaction: commentReactions.reaction,
          createdAt: commentReactions.createdAt,
        })
        .from(commentReactions)
        .where(eq(commentReactions.userId, id))
        .orderBy(desc(commentReactions.createdAt))
        .limit(5);

      return res.json({
        user: {
          id: targetUser.id,
          username: targetUser.username,
          displayName: targetUser.displayName,
          email: targetUser.email,
          avatarUrl: targetUser.avatarUrl,
          bio: targetUser.bio,
          githubUsername: targetUser.githubUsername,
          role: targetUser.role,
          twoFactorEnabled: targetUser.twoFactorEnabled,
          createdAt: targetUser.createdAt,
          updatedAt: targetUser.updatedAt,
        },
        workspaces: userWorkspaces,
        recentIssues,
        recentReviews,
        recentComments,
        recentReactions,
      });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.patch(
  "/users/:id/role",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      const adminActor = req.user!;

      if (!role || !Object.values(UserRole).includes(role as UserRole)) {
        throw new AppError(400, "INVALID_ROLE", "Valid role required");
      }

      const target = await db.query.users.findFirst({
        where: eq(users.id, id),
      });

      if (!target) {
        throw new AppError(404, "NOT_FOUND", "User not found");
      }

      if (target.id === adminActor.id && role !== UserRole.ADMIN) {
        throw new AppError(
          400,
          "CANNOT_DEMOTE_SELF",
          "You cannot remove admin privileges from your own account",
        );
      }

      const [updated] = await db
        .update(users)
        .set({ role, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();

      await db.insert(auditLogs).values({
        actorId: adminActor.id,
        action: "UPDATE_USER_ROLE",
        targetResource: `users:${id}`,
        details: {
          previousRole: target.role,
          newRole: role,
          targetUsername: target.username,
        },
      });

      return res.json(updated);
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.patch(
  "/users/:id/status",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { twoFactorEnabled, displayName, bio } = req.body;
      const adminActor = req.user!;

      const target = await db.query.users.findFirst({
        where: eq(users.id, id),
      });

      if (!target) {
        throw new AppError(404, "NOT_FOUND", "User not found");
      }

      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (typeof twoFactorEnabled === "boolean") {
        updates.twoFactorEnabled = twoFactorEnabled;
        if (!twoFactorEnabled) {
          updates.twoFactorSecret = null;
          updates.twoFactorBackupCodes = null;
        }
      }

      if (typeof displayName === "string" && displayName.trim()) {
        updates.displayName = displayName.trim();
      }

      if (typeof bio === "string") {
        updates.bio = bio.trim();
      }

      const [updated] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, id))
        .returning();

      await db.insert(auditLogs).values({
        actorId: adminActor.id,
        action: "UPDATE_USER_STATUS",
        targetResource: `users:${id}`,
        details: {
          modifiedFields: Object.keys(updates),
          targetUsername: target.username,
        },
      });

      return res.json(updated);
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.get(
  "/posts",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
      const limit = Math.min(
        100,
        Math.max(1, parseInt((req.query.limit as string) || "20", 10)),
      );
      const offset = (page - 1) * limit;
      const search = ((req.query.search as string) || "").trim();
      const typeFilter = ((req.query.type as string) || (req.query.postType as string) || "").trim().toUpperCase();
      const statusFilter = ((req.query.status as string) || "").trim().toUpperCase();
      const workspaceFilter = ((req.query.workspaceId as string) || "").trim();

      let items: any[] = [];
      let total = 0;

      if (typeFilter === "REVIEW") {
        const searchCond = search
          ? or(
              ilike(reviewRequests.title, `%${search}%`),
              ilike(reviewRequests.description, `%${search}%`),
            )
          : undefined;
        const statusCond = statusFilter
          ? eq(reviewRequests.status, statusFilter)
          : undefined;
        const wsCond = workspaceFilter ? eq(reviewRequests.workspaceId, workspaceFilter) : undefined;
        const conditions = [searchCond, statusCond, wsCond].filter(Boolean);
        const whereClause = conditions.length > 0 ? and(...(conditions as any[])) : undefined;

        const [cnt] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(reviewRequests)
          .where(whereClause);
        total = cnt?.count || 0;

        const revs = await db
          .select({
            id: reviewRequests.id,
            number: reviewRequests.number,
            title: reviewRequests.title,
            description: reviewRequests.description,
            status: reviewRequests.status,
            reviewType: reviewRequests.reviewType,
            authorId: reviewRequests.authorId,
            workspaceId: reviewRequests.workspaceId,
            isDeleted: reviewRequests.isDeleted,
            createdAt: reviewRequests.createdAt,
            updatedAt: reviewRequests.updatedAt,
            authorUsername: users.username,
            authorDisplayName: users.displayName,
            authorAvatarUrl: users.avatarUrl,
            workspaceName: workspaces.name,
            workspaceSlug: workspaces.slug,
            commentsCount: sql<number>`(select count(*)::int from comments where comments.target_id = review_requests.id and comments.is_deleted = false)`,
          })
          .from(reviewRequests)
          .innerJoin(users, eq(reviewRequests.authorId, users.id))
          .leftJoin(workspaces, eq(reviewRequests.workspaceId, workspaces.id))
          .where(whereClause)
          .orderBy(desc(reviewRequests.createdAt))
          .limit(limit)
          .offset(offset);

        items = revs.map((r) => ({
          ...r,
          postType: "REVIEW",
        }));
      } else if (typeFilter === "ISSUE" || typeFilter === "BUG" || typeFilter === "TASK" || typeFilter === "FEATURE") {
        const searchCond = search
          ? or(
              ilike(issues.title, `%${search}%`),
              ilike(issues.description, `%${search}%`),
            )
          : undefined;
        const statusCond = statusFilter ? eq(issues.status, statusFilter) : undefined;
        const specificTypeCond =
          typeFilter !== "ISSUE" ? eq(issues.type, typeFilter) : undefined;
        const wsCond = workspaceFilter ? eq(issues.workspaceId, workspaceFilter) : undefined;

        const conditions = [searchCond, statusCond, specificTypeCond, wsCond].filter(Boolean);
        const whereClause = conditions.length > 0 ? and(...(conditions as any[])) : undefined;

        const [cnt] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(issues)
          .where(whereClause);
        total = cnt?.count || 0;

        const iss = await db
          .select({
            id: issues.id,
            number: issues.number,
            title: issues.title,
            description: issues.description,
            type: issues.type,
            status: issues.status,
            priority: issues.priority,
            severity: issues.severity,
            authorId: issues.authorId,
            workspaceId: issues.workspaceId,
            isDeleted: issues.isDeleted,
            createdAt: issues.createdAt,
            updatedAt: issues.updatedAt,
            authorUsername: users.username,
            authorDisplayName: users.displayName,
            authorAvatarUrl: users.avatarUrl,
            workspaceName: workspaces.name,
            workspaceSlug: workspaces.slug,
            commentsCount: sql<number>`(select count(*)::int from comments where comments.target_id = issues.id and comments.is_deleted = false)`,
          })
          .from(issues)
          .innerJoin(users, eq(issues.authorId, users.id))
          .leftJoin(workspaces, eq(issues.workspaceId, workspaces.id))
          .where(whereClause)
          .orderBy(desc(issues.createdAt))
          .limit(limit)
          .offset(offset);

        items = iss.map((i) => ({
          ...i,
          postType: "ISSUE",
        }));
      } else {
        const wsCondIssues = workspaceFilter ? eq(issues.workspaceId, workspaceFilter) : undefined;
        const wsCondReviews = workspaceFilter ? eq(reviewRequests.workspaceId, workspaceFilter) : undefined;

        const [issuesCnt] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(issues)
          .where(wsCondIssues);
        const [reviewsCnt] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(reviewRequests)
          .where(wsCondReviews);
        total = (issuesCnt?.count || 0) + (reviewsCnt?.count || 0);

        const iss = await db
          .select({
            id: issues.id,
            number: issues.number,
            title: issues.title,
            description: issues.description,
            type: issues.type,
            status: issues.status,
            priority: issues.priority,
            severity: issues.severity,
            authorId: issues.authorId,
            workspaceId: issues.workspaceId,
            isDeleted: issues.isDeleted,
            createdAt: issues.createdAt,
            updatedAt: issues.updatedAt,
            authorUsername: users.username,
            authorDisplayName: users.displayName,
            authorAvatarUrl: users.avatarUrl,
            workspaceName: workspaces.name,
            workspaceSlug: workspaces.slug,
            commentsCount: sql<number>`(select count(*)::int from comments where comments.target_id = issues.id and comments.is_deleted = false)`,
          })
          .from(issues)
          .innerJoin(users, eq(issues.authorId, users.id))
          .leftJoin(workspaces, eq(issues.workspaceId, workspaces.id))
          .where(wsCondIssues)
          .orderBy(desc(issues.createdAt))
          .limit(limit)
          .offset(offset);

        items = iss.map((i) => ({
          ...i,
          postType: "ISSUE",
        }));
      }

      return res.json({
        data: items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.patch(
  "/posts/:postType/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { postType, id } = req.params;
      const { isDeleted, status, priority, title, description } = req.body;
      const adminActor = req.user!;

      if (postType.toUpperCase() === "ISSUE") {
        const target = await db.query.issues.findFirst({
          where: eq(issues.id, id),
        });
        if (!target) {
          throw new AppError(404, "NOT_FOUND", "Issue not found");
        }

        const updates: Record<string, unknown> = {
          updatedAt: new Date(),
        };
        if (typeof isDeleted === "boolean") updates.isDeleted = isDeleted;
        if (typeof status === "string") updates.status = status;
        if (typeof priority === "string") updates.priority = priority;
        if (typeof title === "string" && title.trim()) updates.title = title.trim();
        if (typeof description === "string") updates.description = description.trim();

        const [updated] = await db
          .update(issues)
          .set(updates)
          .where(eq(issues.id, id))
          .returning();

        await db.insert(auditLogs).values({
          actorId: adminActor.id,
          action: "MODERATE_ISSUE",
          targetResource: `issues:${id}`,
          details: { updates, issueNumber: target.number, title: target.title },
        });

        return res.json(updated);
      } else {
        const target = await db.query.reviewRequests.findFirst({
          where: eq(reviewRequests.id, id),
        });
        if (!target) {
          throw new AppError(404, "NOT_FOUND", "Review not found");
        }

        const updates: Record<string, unknown> = {
          updatedAt: new Date(),
        };
        if (typeof isDeleted === "boolean") updates.isDeleted = isDeleted;
        if (typeof status === "string") updates.status = status;
        if (typeof title === "string" && title.trim()) updates.title = title.trim();
        if (typeof description === "string") updates.description = description.trim();

        const [updated] = await db
          .update(reviewRequests)
          .set(updates)
          .where(eq(reviewRequests.id, id))
          .returning();

        await db.insert(auditLogs).values({
          actorId: adminActor.id,
          action: "MODERATE_REVIEW",
          targetResource: `reviews:${id}`,
          details: { updates, reviewNumber: target.number, title: target.title },
        });

        return res.json(updated);
      }
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.delete(
  "/posts/:postType/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { postType, id } = req.params;
      const adminActor = req.user!;

      if (postType.toUpperCase() === "ISSUE") {
        await db.delete(issues).where(eq(issues.id, id));
      } else {
        await db.delete(reviewRequests).where(eq(reviewRequests.id, id));
      }

      await db.insert(auditLogs).values({
        actorId: adminActor.id,
        action: "PERMANENT_DELETE_POST",
        targetResource: `${postType.toLowerCase()}s:${id}`,
        details: {},
      });

      return res.json({ success: true, message: "Post permanently deleted" });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.get(
  "/comments",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
      const limit = Math.min(
        100,
        Math.max(1, parseInt((req.query.limit as string) || "20", 10)),
      );
      const offset = (page - 1) * limit;
      const search = ((req.query.search as string) || "").trim();
      const targetId = ((req.query.targetId as string) || "").trim();
      const authorId = ((req.query.authorId as string) || "").trim();
      const isHiddenParam = req.query.isHidden as string;

      const conditions: any[] = [eq(comments.isDeleted, false)];

      if (search) {
        conditions.push(ilike(comments.content, `%${search}%`));
      }
      if (targetId) {
        conditions.push(eq(comments.targetId, targetId));
      }
      if (authorId) {
        conditions.push(eq(comments.authorId, authorId));
      }
      if (isHiddenParam === "true") {
        conditions.push(eq(comments.isHidden, true));
      } else if (isHiddenParam === "false") {
        conditions.push(eq(comments.isHidden, false));
      }

      const whereClause = and(...conditions);

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(comments)
        .where(whereClause);
      const total = totalResult?.count || 0;

      const rawComments = await db
        .select({
          id: comments.id,
          targetType: comments.targetType,
          targetId: comments.targetId,
          parentId: comments.parentId,
          content: comments.content,
          isHidden: comments.isHidden,
          hiddenReason: comments.hiddenReason,
          hiddenAt: comments.hiddenAt,
          createdAt: comments.createdAt,
          updatedAt: comments.updatedAt,
          editedAt: comments.editedAt,
          authorId: comments.authorId,
          authorUsername: users.username,
          authorDisplayName: users.displayName,
          authorAvatarUrl: users.avatarUrl,
          authorRole: users.role,
          reactionsCount: sql<number>`(select count(*)::int from comment_reactions where comment_reactions.comment_id = comments.id)`,
          editsCount: sql<number>`(select count(*)::int from comment_edits where comment_edits.comment_id = comments.id)`,
        })
        .from(comments)
        .innerJoin(users, eq(comments.authorId, users.id))
        .where(whereClause)
        .orderBy(desc(comments.createdAt))
        .limit(limit)
        .offset(offset);

      const enriched = await Promise.all(
        rawComments.map(async (c) => {
          let postTitle = "";
          let postNumber = 0;
          let postLink = "";

          if (c.targetType === TargetType.ISSUE) {
            const iss = await db.query.issues.findFirst({
              where: eq(issues.id, c.targetId),
            });
            if (iss) {
              postTitle = iss.title;
              postNumber = iss.number;
              postLink = `/issues/${iss.number}`;
            }
          } else {
            const rev = await db.query.reviewRequests.findFirst({
              where: eq(reviewRequests.id, c.targetId),
            });
            if (rev) {
              postTitle = rev.title;
              postNumber = rev.number;
              postLink = `/reviews/${rev.number}`;
            }
          }

          return {
            ...c,
            postTitle,
            postNumber,
            postLink,
            targetTitle: postTitle,
            targetNumber: postNumber,
          };
        }),
      );

      return res.json({
        data: enriched,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.patch(
  "/comments/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const adminActor = req.user!;

      if (!content || !content.trim()) {
        throw new AppError(400, "MISSING_CONTENT", "content is required");
      }

      const comment = await db.query.comments.findFirst({
        where: eq(comments.id, id),
      });
      if (!comment) {
        throw new AppError(404, "NOT_FOUND", "Comment not found");
      }

      await db.insert(commentEdits).values({
        commentId: comment.id,
        editorId: adminActor.id,
        previousContent: comment.content,
        newContent: content.trim(),
      });

      const [updated] = await db
        .update(comments)
        .set({
          content: content.trim(),
          editedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(comments.id, id))
        .returning();

      await db.insert(auditLogs).values({
        actorId: adminActor.id,
        action: "EDIT_COMMENT",
        targetResource: `comments:${id}`,
        details: { previousContent: comment.content, newContent: content.trim() },
      });

      return res.json(updated);
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.delete(
  "/comments/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const adminActor = req.user!;

      await db.delete(comments).where(eq(comments.id, id));

      await db.insert(auditLogs).values({
        actorId: adminActor.id,
        action: "DELETE_COMMENT_PERMANENT",
        targetResource: `comments:${id}`,
        details: {},
      });

      return res.json({ success: true, message: "Comment deleted permanently" });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.get(
  "/comments/:id/edits",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const edits = await db
        .select({
          id: commentEdits.id,
          commentId: commentEdits.commentId,
          editorId: commentEdits.editorId,
          previousContent: commentEdits.previousContent,
          newContent: commentEdits.newContent,
          createdAt: commentEdits.createdAt,
          editorUsername: users.username,
          editorDisplayName: users.displayName,
          editorAvatarUrl: users.avatarUrl,
        })
        .from(commentEdits)
        .innerJoin(users, eq(commentEdits.editorId, users.id))
        .where(eq(commentEdits.commentId, id))
        .orderBy(desc(commentEdits.createdAt));

      return res.json(edits);
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.patch(
  "/comments/:id/moderate",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { isHidden, hiddenReason, isDeleted } = req.body;
      const adminActor = req.user!;

      const comment = await db.query.comments.findFirst({
        where: eq(comments.id, id),
      });

      if (!comment) {
        throw new AppError(404, "NOT_FOUND", "Comment not found");
      }

      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (typeof isHidden === "boolean") {
        updates.isHidden = isHidden;
        updates.hiddenReason = isHidden ? hiddenReason || "ADMIN_MODERATION" : null;
        updates.hiddenBy = isHidden ? adminActor.id : null;
        updates.hiddenAt = isHidden ? new Date() : null;
      }

      if (typeof isDeleted === "boolean") {
        updates.isDeleted = isDeleted;
      }

      const [updated] = await db
        .update(comments)
        .set(updates)
        .where(eq(comments.id, id))
        .returning();

      await db.insert(auditLogs).values({
        actorId: adminActor.id,
        action: "MODERATE_COMMENT",
        targetResource: `comments:${id}`,
        details: { updates, commentAuthorId: comment.authorId },
      });

      return res.json(updated);
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.get(
  "/reactions",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
      const limit = Math.min(
        100,
        Math.max(1, parseInt((req.query.limit as string) || "30", 10)),
      );
      const offset = (page - 1) * limit;
      const reactionType = ((req.query.reactionType as string) || "").trim();
      const userId = ((req.query.userId as string) || "").trim();
      const commentId = ((req.query.commentId as string) || "").trim();

      const conditions: any[] = [];
      if (reactionType) conditions.push(eq(commentReactions.reaction, reactionType));
      if (userId) conditions.push(eq(commentReactions.userId, userId));
      if (commentId) conditions.push(eq(commentReactions.commentId, commentId));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(commentReactions)
        .where(whereClause);
      const total = totalResult?.count || 0;

      const raw = await db
        .select({
          commentId: commentReactions.commentId,
          reaction: commentReactions.reaction,
          createdAt: commentReactions.createdAt,
          userId: commentReactions.userId,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          userRole: users.role,
        })
        .from(commentReactions)
        .innerJoin(users, eq(commentReactions.userId, users.id))
        .where(whereClause)
        .orderBy(desc(commentReactions.createdAt))
        .limit(limit)
        .offset(offset);

      const enriched = await Promise.all(
        raw.map(async (r) => {
          const comm = await db.query.comments.findFirst({
            where: eq(comments.id, r.commentId),
          });

          let targetPost: {
            type: string;
            id: string;
            title: string;
            link: string;
          } | null = null;
          let commentSnippet = "";
          let commentAuthorUsername = "";

          if (comm) {
            commentSnippet =
              comm.content.length > 80
                ? comm.content.substring(0, 80) + "..."
                : comm.content;

            const commAuthor = await db.query.users.findFirst({
              where: eq(users.id, comm.authorId),
            });
            if (commAuthor) {
              commentAuthorUsername = commAuthor.username;
            }

            if (comm.targetType === TargetType.ISSUE) {
              const iss = await db.query.issues.findFirst({
                where: eq(issues.id, comm.targetId),
              });
              if (iss) {
                targetPost = {
                  type: "ISSUE",
                  id: iss.id,
                  title: iss.title,
                  link: `/issues/${iss.number}`,
                };
              }
            } else {
              const rev = await db.query.reviewRequests.findFirst({
                where: eq(reviewRequests.id, comm.targetId),
              });
              if (rev) {
                targetPost = {
                  type: "REVIEW",
                  id: rev.id,
                  title: rev.title,
                  link: `/reviews/${rev.number}`,
                };
              }
            }
          }

          return {
            ...r,
            commentSnippet,
            commentAuthorUsername,
            targetPost,
          };
        }),
      );

      return res.json({
        data: enriched,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.delete(
  "/reactions",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { commentId, userId, reaction } = req.body;
      const adminActor = req.user!;

      if (!commentId || !userId || !reaction) {
        throw new AppError(
          400,
          "MISSING_FIELDS",
          "commentId, userId, reaction are required",
        );
      }

      await db
        .delete(commentReactions)
        .where(
          and(
            eq(commentReactions.commentId, commentId),
            eq(commentReactions.userId, userId),
            eq(commentReactions.reaction, reaction),
          ),
        );

      await db.insert(auditLogs).values({
        actorId: adminActor.id,
        action: "DELETE_REACTION",
        targetResource: `comments:${commentId}:reactions`,
        details: { removedUserId: userId, reaction },
      });

      return res.json({ success: true, message: "Reaction removed" });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.get(
  "/audit-logs",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
      const limit = Math.min(
        100,
        Math.max(1, parseInt((req.query.limit as string) || "20", 10)),
      );
      const offset = (page - 1) * limit;

      const [totalResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(auditLogs);
      const total = totalResult?.count || 0;

      const logs = await db
        .select({
          id: auditLogs.id,
          actorId: auditLogs.actorId,
          action: auditLogs.action,
          targetResource: auditLogs.targetResource,
          details: auditLogs.details,
          ipAddress: auditLogs.ipAddress,
          createdAt: auditLogs.createdAt,
          actorUsername: users.username,
          actorDisplayName: users.displayName,
          actorAvatarUrl: users.avatarUrl,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.actorId, users.id))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset);

      return res.json({
        data: logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

adminRouter.post(
  "/system/broadcast",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { title, message, link } = req.body;
      if (!title || !message) {
        return next(new AppError(400, "BAD_REQUEST", "Title and message are required"));
      }
      const allUsers = await db.select({ id: users.id }).from(users);
      if (allUsers.length > 0) {
        const notifsToInsert = allUsers.map((u) => ({
          userId: u.id,
          actorId: req.user!.id,
          type: "SYSTEM_ANNOUNCEMENT",
          title: String(title).trim(),
          message: String(message).trim(),
          link: link ? String(link).trim() : "/",
          isRead: false,
        }));
        await db.insert(notifications).values(notifsToInsert);
      }
      await db.insert(auditLogs).values({
        actorId: req.user!.id,
        action: "SYSTEM_BROADCAST",
        targetResource: "SYSTEM",
        details: { title, recipientCount: allUsers.length },
        ipAddress: req.ip || null,
      });
      return res.json({ success: true, count: allUsers.length });
    } catch (err) {
      next(err);
    }
  },
);

adminRouter.post(
  "/system/cleanup",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const now = new Date();
      await db.delete(sessions).where(lte(sessions.expiresAt, now));
      await db.delete(outboxEvents).where(eq(outboxEvents.status, "PROCESSED"));
      await db.delete(emailJobs).where(eq(emailJobs.status, "SENT"));
      await db.insert(auditLogs).values({
        actorId: req.user!.id,
        action: "SYSTEM_CLEANUP",
        targetResource: "SYSTEM",
        details: { timestamp: now.toISOString() },
        ipAddress: req.ip || null,
      });
      return res.json({
        success: true,
        message: "Cleanup completed successfully",
      });
    } catch (err) {
      next(err);
    }
  },
);

adminRouter.get(
  "/system/diagnostics",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const t0 = Date.now();
      await db.execute(sql`SELECT 1`);
      const dbLatencyMs = Date.now() - t0;
      const [usersCnt] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
      const [wsCnt] = await db.select({ count: sql<number>`count(*)::int` }).from(workspaces);
      const [issuesCnt] = await db.select({ count: sql<number>`count(*)::int` }).from(issues);
      const [reviewsCnt] = await db.select({ count: sql<number>`count(*)::int` }).from(reviewRequests);
      const [commentsCnt] = await db.select({ count: sql<number>`count(*)::int` }).from(comments);
      const [reactionsCnt] = await db.select({ count: sql<number>`count(*)::int` }).from(commentReactions);
      const [sessionsCnt] = await db.select({ count: sql<number>`count(*)::int` }).from(sessions);
      const [outboxCnt] = await db.select({ count: sql<number>`count(*)::int` }).from(outboxEvents);
      const [emailJobsCnt] = await db.select({ count: sql<number>`count(*)::int` }).from(emailJobs);
      const [auditCnt] = await db.select({ count: sql<number>`count(*)::int` }).from(auditLogs);

      const mem = process.memoryUsage();
      return res.json({
        dbLatencyMs,
        status: "HEALTHY",
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        memory: {
          rssMb: Math.round(mem.rss / 1024 / 1024),
          heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
          heapTotalMb: Math.round(mem.heapTotal / 1024 / 1024),
        },
        counts: {
          users: usersCnt?.count || 0,
          workspaces: wsCnt?.count || 0,
          issues: issuesCnt?.count || 0,
          reviews: reviewsCnt?.count || 0,
          comments: commentsCnt?.count || 0,
          reactions: reactionsCnt?.count || 0,
          sessions: sessionsCnt?.count || 0,
          outbox: outboxCnt?.count || 0,
          emailJobs: emailJobsCnt?.count || 0,
          auditLogs: auditCnt?.count || 0,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);
