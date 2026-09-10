import { Router, Request, Response, NextFunction } from "express";
import {
  db,
  workspaces,
  workspaceMembers,
  projects,
  projectMembers,
  invitations,
  users,
  issues,
  reviewRequests,
  reviewReviewers,
  issueAssignees,
  eq,
  ne,
  and,
  or,
  sql,
  isNull,
  inArray,
} from "@reported/database";
import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
  CreateProjectSchema,
  UpdateProjectSchema,
  InviteMemberSchema,
  UpdateMemberRoleSchema,
  WorkspaceRole,
  ReviewerDecision,
} from "@reported/contracts";
import { requireAuth } from "../../middleware/auth.js";
import { AppError } from "../../middleware/error.js";
import { authorization } from "../../services/authorization.service.js";
import crypto from "crypto";

export const workspacesRouter = Router();

workspacesRouter.use(requireAuth);

workspacesRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const memberships = await db.query.workspaceMembers.findMany({
        where: eq(workspaceMembers.userId, user.id),
      });

      if (memberships.length === 0) {
        const defaultSlug = `${user.username}-personal`;
        const [newWs] = await db
          .insert(workspaces)
          .values({
            name: `${user.displayName}'s Workspace`,
            slug: defaultSlug,
            ownerId: user.id,
          })
          .returning();

        await db.insert(workspaceMembers).values({
          workspaceId: newWs.id,
          userId: user.id,
          role: WorkspaceRole.OWNER,
        });

        return res.json([
          {
            ...newWs,
            role: WorkspaceRole.OWNER,
            membersCount: 1,
            projectsCount: 0,
          },
        ]);
      }

      const wsList = await Promise.all(
        memberships.map(async (m) => {
          const ws = await db.query.workspaces.findFirst({
            where: eq(workspaces.id, m.workspaceId),
          });
          if (!ws) return null;

          const [mCount] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(workspaceMembers)
            .where(eq(workspaceMembers.workspaceId, ws.id));

          const [pCount] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(projects)
            .where(eq(projects.workspaceId, ws.id));

          return {
            ...ws,
            role: m.role as WorkspaceRole,
            membersCount: mCount?.count || 1,
            projectsCount: pCount?.count || 0,
          };
        }),
      );

      return res.json(wsList.filter(Boolean));
    } catch (error) {
      next(error);
    }
  },
);

workspacesRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const input = CreateWorkspaceSchema.parse(req.body);
      const cleanSlug = input.slug.toLowerCase().trim();

      const existing = await db.query.workspaces.findFirst({
        where: eq(sql`lower(${workspaces.slug})`, cleanSlug),
      });
      if (existing) {
        throw new AppError(
          409,
          "SLUG_TAKEN",
          "Workspace with this identifier already exists",
        );
      }

      const [ws] = await db
        .insert(workspaces)
        .values({
          name: input.name,
          slug: input.slug,
          description: input.description,
          ownerId: user.id,
        })
        .returning();

      await db.insert(workspaceMembers).values({
        workspaceId: ws.id,
        userId: user.id,
        role: WorkspaceRole.OWNER,
      });

      const [defaultProject] = await db
        .insert(projects)
        .values({
          workspaceId: ws.id,
          name: "General",
          slug: "general",
          key: "GEN",
          description: "Default project for general discussions and tracking",
        })
        .returning();

      await db.insert(projectMembers).values({
        projectId: defaultProject.id,
        userId: user.id,
        role: "MAINTAINER",
      });

      return res.status(201).json({
        ...ws,
        role: WorkspaceRole.OWNER,
        membersCount: 1,
        projectsCount: 1,
      });
    } catch (error) {
      next(error);
    }
  },
);

workspacesRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { id } = req.params;

      const member = await authorization.getWorkspaceMember(user.id, id);
      if (!member) {
        throw new AppError(
          403,
          "FORBIDDEN",
          "You are not a member of this workspace",
        );
      }

      const ws = await db.query.workspaces.findFirst({
        where: eq(workspaces.id, id),
      });
      if (!ws) {
        throw new AppError(404, "NOT_FOUND", "Workspace not found");
      }

      return res.json({
        ...ws,
        role: member.role as WorkspaceRole,
      });
    } catch (error) {
      next(error);
    }
  },
);

workspacesRouter.patch(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      await authorization.assertCan(user.id, id, "workspace.settings.update");

      const input = UpdateWorkspaceSchema.parse(req.body);
      const [updated] = await db
        .update(workspaces)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(workspaces.id, id))
        .returning();

      return res.json(updated);
    } catch (error) {
      next(error);
    }
  },
);

workspacesRouter.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      await authorization.assertCan(user.id, id, "workspace.delete");

      await db.delete(workspaces).where(eq(workspaces.id, id));
      return res.json({ success: true, message: "Workspace deleted" });
    } catch (error) {
      next(error);
    }
  },
);

workspacesRouter.get(
  "/:id/members",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { id } = req.params;

      const membership = await authorization.getWorkspaceMember(user.id, id);
      if (!membership) {
        throw new AppError(
          403,
          "FORBIDDEN",
          "Access denied to workspace members",
        );
      }

      const members = await db
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

      return res.json(members);
    } catch (error) {
      next(error);
    }
  },
);

workspacesRouter.post(
  "/:id/members/invite",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      await authorization.assertCan(user.id, id, "workspace.member.invite");

      const input = InviteMemberSchema.parse(req.body);

      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, input.email.toLowerCase()),
      });

      if (existingUser) {
        const alreadyMember = await db.query.workspaceMembers.findFirst({
          where: and(
            eq(workspaceMembers.workspaceId, id),
            eq(workspaceMembers.userId, existingUser.id),
          ),
        });
        if (alreadyMember) {
          throw new AppError(
            409,
            "ALREADY_MEMBER",
            "User is already a member of this workspace",
          );
        }

        await db.insert(workspaceMembers).values({
          workspaceId: id,
          userId: existingUser.id,
          role: input.role,
          invitedBy: user.id,
        });

        return res.status(201).json({
          success: true,
          message: `${existingUser.displayName} (@${existingUser.username}) added to workspace as ${input.role}`,
          user: existingUser,
        });
      }

      const token = crypto.randomBytes(24).toString("hex");
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const existingInvite = await db.query.invitations.findFirst({
        where: and(
          eq(invitations.workspaceId, id),
          eq(invitations.email, input.email.toLowerCase()),
          isNull(invitations.acceptedAt),
        ),
      });

      if (existingInvite) {
        const [updatedInvite] = await db
          .update(invitations)
          .set({
            role: input.role,
            token,
            expiresAt,
            invitedBy: user.id,
          })
          .where(eq(invitations.id, existingInvite.id))
          .returning();

        return res.status(200).json({
          success: true,
          message: `Updated invitation for ${input.email}`,
          invitation: updatedInvite,
        });
      }

      const [invitation] = await db
        .insert(invitations)
        .values({
          workspaceId: id,
          email: input.email.toLowerCase(),
          role: input.role,
          token,
          expiresAt,
          invitedBy: user.id,
        })
        .returning();

      return res.status(201).json({
        success: true,
        message: `Invitation sent to ${input.email}`,
        invitation,
      });
    } catch (error) {
      next(error);
    }
  },
);

workspacesRouter.patch(
  "/:id/members/:userId/role",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.user!;
      const { id, userId } = req.params;
      await authorization.assertCan(
        currentUser.id,
        id,
        "workspace.member.role",
      );

      const input = UpdateMemberRoleSchema.parse(req.body);

      if (input.role !== WorkspaceRole.OWNER) {
        const target = await db.query.workspaceMembers.findFirst({
          where: and(
            eq(workspaceMembers.workspaceId, id),
            or(
              eq(workspaceMembers.userId, userId),
              eq(workspaceMembers.id, userId),
            ),
          ),
        });
        if (target?.role === WorkspaceRole.OWNER) {
          const [ownerCount] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(workspaceMembers)
            .where(
              and(
                eq(workspaceMembers.workspaceId, id),
                eq(workspaceMembers.role, WorkspaceRole.OWNER),
              ),
            );

          if ((ownerCount?.count || 0) <= 1) {
            throw new AppError(
              400,
              "CANNOT_DEMOTE_LAST_OWNER",
              "Workspace must have at least one Owner",
            );
          }
        }
      }

      const [updated] = await db
        .update(workspaceMembers)
        .set({ role: input.role })
        .where(
          and(
            eq(workspaceMembers.workspaceId, id),
            or(
              eq(workspaceMembers.userId, userId),
              eq(workspaceMembers.id, userId),
            ),
          ),
        )
        .returning();

      return res.json(updated);
    } catch (error) {
      next(error);
    }
  },
);

workspacesRouter.delete(
  "/:id/members/:userId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const currentUser = req.user!;
      const { id, userId } = req.params;

      if (currentUser.id !== userId) {
        await authorization.assertCan(
          currentUser.id,
          id,
          "workspace.member.remove",
        );
      }

      const target = await db.query.workspaceMembers.findFirst({
        where: and(
          eq(workspaceMembers.workspaceId, id),
          eq(workspaceMembers.userId, userId),
        ),
      });
      if (!target) {
        throw new AppError(404, "NOT_FOUND", "Member not found");
      }

      if (target.role === WorkspaceRole.OWNER) {
        const [ownerCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(workspaceMembers)
          .where(
            and(
              eq(workspaceMembers.workspaceId, id),
              eq(workspaceMembers.role, WorkspaceRole.OWNER),
            ),
          );

        if ((ownerCount?.count || 0) <= 1) {
          throw new AppError(
            400,
            "CANNOT_REMOVE_LAST_OWNER",
            "Cannot remove the last Owner of the workspace",
          );
        }
      }

      await db
        .delete(workspaceMembers)
        .where(
          and(
            eq(workspaceMembers.workspaceId, id),
            eq(workspaceMembers.userId, userId),
          ),
        );

      const wsReviews = await db
        .select({ id: reviewRequests.id })
        .from(reviewRequests)
        .where(eq(reviewRequests.workspaceId, id));

      if (wsReviews.length > 0) {
        const reviewIds = wsReviews.map((r) => r.id);
        await db
          .delete(reviewReviewers)
          .where(
            and(
              inArray(reviewReviewers.reviewId, reviewIds),
              eq(reviewReviewers.userId, userId),
              eq(reviewReviewers.status, ReviewerDecision.PENDING),
            ),
          );
      }

      const wsIssues = await db
        .select({ id: issues.id })
        .from(issues)
        .where(eq(issues.workspaceId, id));

      if (wsIssues.length > 0) {
        const issueIds = wsIssues.map((i) => i.id);
        await db
          .delete(issueAssignees)
          .where(
            and(
              inArray(issueAssignees.issueId, issueIds),
              eq(issueAssignees.userId, userId),
            ),
          );
      }

      const wsProjects = await db
        .select({ id: projects.id })
        .from(projects)
        .where(eq(projects.workspaceId, id));

      if (wsProjects.length > 0) {
        const projectIds = wsProjects.map((p) => p.id);
        await db
          .delete(projectMembers)
          .where(
            and(
              inArray(projectMembers.projectId, projectIds),
              eq(projectMembers.userId, userId),
            ),
          );
      }

      return res.json({
        success: true,
        message: "Member removed from workspace",
      });
    } catch (error) {
      next(error);
    }
  },
);

workspacesRouter.get(
  "/:id/projects",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { id } = req.params;

      const membership = await authorization.getWorkspaceMember(user.id, id);
      if (!membership) {
        throw new AppError(
          403,
          "FORBIDDEN",
          "Access denied to workspace projects",
        );
      }

      const projectList = await db.query.projects.findMany({
        where: eq(projects.workspaceId, id),
        orderBy: (p, { asc }) => [asc(p.name)],
      });

      return res.json(projectList);
    } catch (error) {
      next(error);
    }
  },
);

workspacesRouter.post(
  "/:id/projects",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      await authorization.assertCan(user.id, id, "project.create");

      const input = CreateProjectSchema.parse(req.body);

      const existingSlug = await db.query.projects.findFirst({
        where: and(eq(projects.workspaceId, id), eq(projects.slug, input.slug)),
      });
      if (existingSlug) {
        throw new AppError(
          409,
          "PROJECT_SLUG_TAKEN",
          "Project identifier already exists in this workspace",
        );
      }

      const existingKey = await db.query.projects.findFirst({
        where: and(
          eq(projects.workspaceId, id),
          eq(projects.key, input.key.toUpperCase()),
        ),
      });
      if (existingKey) {
        throw new AppError(
          409,
          "PROJECT_KEY_TAKEN",
          "Project key already exists in this workspace",
        );
      }

      const [project] = await db
        .insert(projects)
        .values({
          workspaceId: id,
          name: input.name,
          slug: input.slug,
          key: input.key.toUpperCase(),
          description: input.description,
        })
        .returning();

      await db.insert(projectMembers).values({
        projectId: project.id,
        userId: user.id,
        role: "MAINTAINER",
      });

      return res.status(201).json(project);
    } catch (error) {
      next(error);
    }
  },
);

workspacesRouter.patch(
  "/:id/projects/:projectId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { id, projectId } = req.params;
      await authorization.assertCan(user.id, id, "project.update");

      const input = UpdateProjectSchema.parse(req.body);

      const project = await db.query.projects.findFirst({
        where: and(eq(projects.workspaceId, id), eq(projects.id, projectId)),
      });

      if (!project) {
        throw new AppError(404, "NOT_FOUND", "Project not found");
      }

      if (input.key && input.key.toUpperCase() !== project.key) {
        const existingKey = await db.query.projects.findFirst({
          where: and(
            eq(projects.workspaceId, id),
            eq(projects.key, input.key.toUpperCase()),
            ne(projects.id, projectId),
          ),
        });
        if (existingKey) {
          throw new AppError(
            409,
            "PROJECT_KEY_TAKEN",
            "Project key already exists in this workspace",
          );
        }
      }

      const updates: Partial<typeof projects.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (input.name) updates.name = input.name;
      if (input.slug) updates.slug = input.slug.toLowerCase();
      if (input.key) updates.key = input.key.toUpperCase();
      if (input.description !== undefined)
        updates.description = input.description;

      const [updated] = await db
        .update(projects)
        .set(updates)
        .where(eq(projects.id, projectId))
        .returning();

      return res.json(updated);
    } catch (error) {
      next(error);
    }
  },
);

workspacesRouter.delete(
  "/:id/projects/:projectId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const { id, projectId } = req.params;
      await authorization.assertCan(user.id, id, "project.delete");

      const project = await db.query.projects.findFirst({
        where: and(eq(projects.workspaceId, id), eq(projects.id, projectId)),
      });

      if (!project) {
        throw new AppError(404, "NOT_FOUND", "Project not found");
      }

      await db
        .update(issues)
        .set({ projectId: null })
        .where(eq(issues.projectId, projectId));
      await db
        .update(reviewRequests)
        .set({ projectId: null })
        .where(eq(reviewRequests.projectId, projectId));

      await db.delete(projects).where(eq(projects.id, projectId));

      return res.json({
        success: true,
        message: "Project deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  },
);
