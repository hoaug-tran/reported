import { Router, Request, Response, NextFunction } from "express";
import {
  db,
  comments,
  commentEdits,
  commentReactions,
  mentions,
  users,
  issues,
  reviewRequests,
  activities,
  workspaceMembers,
  eq,
  and,
  asc,
  inArray,
} from "@reported/database";
import {
  CreateCommentSchema,
  UpdateCommentSchema,
  ToggleReactionSchema,
  UpdateCommentVisibilitySchema,
  TargetType,
  ReactionType,
  CommentDto,
  CommentEditHistoryDto,
  CommentHideReason,
  ReactionSummaryDto,
  UserRole,
} from "@reported/contracts";
import { requireAuth } from "../../middleware/auth.js";
import { AppError } from "../../middleware/error.js";
import { recordOutboxEvent } from "../../events/outbox.js";
import { assertActivePost } from "../shared/post-state.js";

export const commentsRouter = Router();

function createCommentSnippet(content: string, maxLength = 280) {
  const normalized = content.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  const boundary = normalized.lastIndexOf(" ", maxLength - 1);
  return `${normalized.slice(0, boundary > 0 ? boundary : maxLength).trim()}…`;
}

commentsRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const targetType =
        (req.query.targetType as TargetType) || TargetType.ISSUE;
      const targetId = req.query.targetId as string;

      if (!targetId) {
        throw new AppError(
          400,
          "BAD_REQUEST",
          "targetId query parameter is required",
        );
      }

      const commentList = await db
        .select()
        .from(comments)
        .where(
          and(
            eq(comments.targetType, targetType),
            eq(comments.targetId, targetId),
          ),
        )
        .orderBy(asc(comments.createdAt));

      const authorIds = [...new Set(commentList.map((comment) => comment.authorId))];
      const commentIds = commentList.map((comment) => comment.id);
      const [authorList, reactionList] = await Promise.all([
        authorIds.length
          ? db.select().from(users).where(inArray(users.id, authorIds))
          : Promise.resolve([]),
        commentIds.length
          ? db
              .select({
                commentId: commentReactions.commentId,
                reaction: commentReactions.reaction,
                userId: commentReactions.userId,
                username: users.username,
                displayName: users.displayName,
              })
              .from(commentReactions)
              .leftJoin(users, eq(commentReactions.userId, users.id))
              .where(inArray(commentReactions.commentId, commentIds))
          : Promise.resolve([]),
      ]);
      const authorsById = new Map(authorList.map((author) => [author.id, author]));
      const reactionsByComment = new Map<string, typeof reactionList>();
      for (const reaction of reactionList) {
        const current = reactionsByComment.get(reaction.commentId) || [];
        current.push(reaction);
        reactionsByComment.set(reaction.commentId, current);
      }

      const enriched = commentList.map((c) => {
          const author = authorsById.get(c.authorId);
          const reactionsGrouped: Record<string, { count: number; users: Array<{ id: string; username: string; displayName: string }> }> = {};
          for (const reaction of reactionsByComment.get(c.id) || []) {
            const group = reactionsGrouped[reaction.reaction] || (reactionsGrouped[reaction.reaction] = { count: 0, users: [] });
            group.count++;
            if (reaction.userId && reaction.username && reaction.displayName) {
              group.users.push({ id: reaction.userId, username: reaction.username, displayName: reaction.displayName });
            }
          }
          const reactionsFormatted: ReactionSummaryDto[] = Object.entries(reactionsGrouped).map(([reaction, data]) => ({
            reaction: reaction as ReactionType,
            count: data.count,
            users: data.users,
            hasReacted: Boolean(req.user?.id && data.users.some((member) => member.id === req.user!.id)),
          }));

          return {
            id: c.id,
            targetType: c.targetType as TargetType,
            targetId: c.targetId,
            parentId: c.parentId,
            content: c.isDeleted ? "[Bình luận đã bị xóa]" : c.content,
            isDeleted: c.isDeleted,
            isHidden: c.isHidden,
            hiddenReason: c.hiddenReason as CommentHideReason | null,
            editedAt: c.editedAt ? c.editedAt.toISOString() : null,
            isEdited: Boolean(c.editedAt),
            author: author
              ? {
                  id: author.id,
                  username: author.username,
                  displayName: author.displayName,
                  email: author.email,
                  avatarUrl: author.avatarUrl,
                  role: author.role as UserRole,
                }
              : {
                  id: c.authorId,
                  username: "ghost",
                  displayName: "Former Member",
                  email: "ghost@reported.dev",
                  avatarUrl: null,
                  role: UserRole.USER,
                },
            reactions: reactionsFormatted,
            replies: [],
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
          };
        });

      const topLevelComments: CommentDto[] = [];
      const replyMap = new Map<string, CommentDto[]>();

      for (const item of enriched) {
        if (!item.parentId) {
          topLevelComments.push(item);
        } else {
          if (!replyMap.has(item.parentId)) {
            replyMap.set(item.parentId, []);
          }
          replyMap.get(item.parentId)!.push(item);
        }
      }

      for (const top of topLevelComments) {
        top.replies = replyMap.get(top.id) || [];
      }

      return res.json(topLevelComments);
    } catch (error) {
      next(error);
    }
  },
);

commentsRouter.post(
  "/",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = CreateCommentSchema.parse(req.body);
      const user = req.user!;
      await assertActivePost(input.targetType, input.targetId);

      if (input.parentId) {
        const parent = await db.query.comments.findFirst({
          where: eq(comments.id, input.parentId),
        });
        if (!parent || parent.isDeleted) {
          throw new AppError(404, "COMMENT_NOT_FOUND", "Parent comment not found");
        }
        if (
          parent.targetType !== input.targetType ||
          parent.targetId !== input.targetId
        ) {
          throw new AppError(400, "INVALID_PARENT", "Parent comment belongs to another post");
        }
      }

      const [comment] = await db
        .insert(comments)
        .values({
          targetType: input.targetType,
          targetId: input.targetId,
          parentId: input.parentId,
          content: input.content,
          authorId: user.id,
        })
        .returning();

      let targetTitle = "";
      let targetAuthorId = "";
      let targetLink = "";

      if (input.targetType === TargetType.ISSUE) {
        const issue = await db.query.issues.findFirst({
          where: eq(issues.id, input.targetId),
        });
        if (issue) {
          targetTitle = issue.title;
          targetAuthorId = issue.authorId;
          targetLink = `/issues/${issue.number}`;
        }
      } else {
        const review = await db.query.reviewRequests.findFirst({
          where: eq(reviewRequests.id, input.targetId),
        });
        if (review) {
          targetTitle = review.title;
          targetAuthorId = review.authorId;
          targetLink = `/reviews/${review.number}`;
        }
      }

      const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
      const matches = Array.from(input.content.matchAll(mentionRegex));
      const usernames = Array.from(new Set(matches.map((m) => m[1])));
      let mentionedUserIds: string[] = [];

      if (usernames.length > 0) {
        const mentionedUsers = await db
          .select({ id: users.id, username: users.username })
          .from(users)
          .where(inArray(users.username, usernames));
        mentionedUserIds = mentionedUsers.map((mentionedUser) => mentionedUser.id);

        for (const mUser of mentionedUsers) {
          await db.insert(mentions).values({
            targetType: input.targetType,
            targetId: input.targetId,
            commentId: comment.id,
            userId: mUser.id,
            mentionedBy: user.id,
          });
        }

        if (mentionedUsers.length > 0) {
          await recordOutboxEvent("USER_MENTIONED", {
            targetUserIds: mentionedUsers.map((u) => u.id),
            actorId: user.id,
            title: `Mentioned in ${targetTitle}`,
            message: createCommentSnippet(input.content),
            link: targetLink,
            targetType: input.targetType,
            targetId: input.targetId,
          });
        }
      }

      await recordOutboxEvent("COMMENT_CREATED", {
        targetType: input.targetType,
        targetId: input.targetId,
        parentId: input.parentId || null,
        targetAuthorId,
        actorId: user.id,
        title: targetTitle,
        snippet: createCommentSnippet(input.content),
        link: targetLink,
        excludedUserIds: mentionedUserIds,
      });

      await db.insert(activities).values({
        targetType: input.targetType,
        targetId: input.targetId,
        actorId: user.id,
        actionType: "COMMENT_ADDED",
        metadata: {
          commentId: comment.id,
          snippet: createCommentSnippet(input.content, 120),
        },
      });

      return res.status(201).json(comment);
    } catch (error) {
      next(error);
    }
  },
);

commentsRouter.post(
  "/:id/reactions",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = ToggleReactionSchema.parse(req.body);
      const user = req.user!;
      const commentId = req.params.id;
      const comment = await db.query.comments.findFirst({
        where: eq(comments.id, commentId),
      });
      if (!comment || comment.isDeleted) {
        throw new AppError(404, "COMMENT_NOT_FOUND", "Comment not found");
      }
      await assertActivePost(comment.targetType as TargetType, comment.targetId);

      const existing = await db.query.commentReactions.findFirst({
        where: and(
          eq(commentReactions.commentId, commentId),
          eq(commentReactions.userId, user.id),
          eq(commentReactions.reaction, input.reaction),
        ),
      });

      if (existing) {
        await db
          .delete(commentReactions)
          .where(
            and(
              eq(commentReactions.commentId, commentId),
              eq(commentReactions.userId, user.id),
              eq(commentReactions.reaction, input.reaction),
            ),
          );
        return res.json({ reacted: false });
      } else {
        await db.insert(commentReactions).values({
          commentId,
          userId: user.id,
          reaction: input.reaction,
        });
        return res.json({ reacted: true });
      }
    } catch (error) {
      next(error);
    }
  },
);

commentsRouter.patch(
  "/:id/visibility",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = UpdateCommentVisibilitySchema.parse(req.body);
      const user = req.user!;
      const comment = await db.query.comments.findFirst({
        where: eq(comments.id, req.params.id),
      });

      if (!comment || comment.isDeleted) {
        throw new AppError(404, "NOT_FOUND", "Comment not found");
      }
      await assertActivePost(comment.targetType as TargetType, comment.targetId);

      let canModerate = user.role === "ADMIN";
      if (!canModerate) {
        const workspaceId = req.headers["x-workspace-id"] as string;
        if (workspaceId) {
          const membership = await db.query.workspaceMembers.findFirst({
            where: and(
              eq(workspaceMembers.workspaceId, workspaceId),
              eq(workspaceMembers.userId, user.id),
            ),
          });
          canModerate = membership?.role === "OWNER" || membership?.role === "ADMIN";
        }
      }
      if (!canModerate) {
        throw new AppError(403, "FORBIDDEN", "Only workspace moderators can hide comments");
      }

      const [updated] = await db
        .update(comments)
        .set({
          isHidden: input.hidden,
          hiddenReason: input.hidden ? input.reason! : null,
          hiddenBy: input.hidden ? user.id : null,
          hiddenAt: input.hidden ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(comments.id, comment.id))
        .returning();

      return res.json(updated);
    } catch (error) {
      next(error);
    }
  },
);

commentsRouter.patch(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = UpdateCommentSchema.parse(req.body);
      const user = req.user!;
      const commentId = req.params.id;

      const comment = await db.query.comments.findFirst({
        where: eq(comments.id, commentId),
      });

      if (!comment || comment.isDeleted) {
        throw new AppError(404, "NOT_FOUND", "Comment not found");
      }
      await assertActivePost(comment.targetType as TargetType, comment.targetId);

      let isLeader = user.role === "ADMIN";
      if (!isLeader) {
        const wsId = req.headers["x-workspace-id"] as string;
        if (wsId) {
          const mem = await db.query.workspaceMembers.findFirst({
            where: and(
              eq(workspaceMembers.workspaceId, wsId),
              eq(workspaceMembers.userId, user.id),
            ),
          });
          if (mem && (mem.role === "OWNER" || mem.role === "ADMIN")) {
            isLeader = true;
          }
        }
      }

      if (comment.authorId !== user.id && !isLeader) {
        throw new AppError(403, "FORBIDDEN", "You cannot edit this comment");
      }

      if (input.content !== comment.content) {
        await db.insert(commentEdits).values({
          commentId: comment.id,
          editorId: user.id,
          previousContent: comment.content,
          newContent: input.content,
        });

        const [updated] = await db
          .update(comments)
          .set({ content: input.content, editedAt: new Date(), updatedAt: new Date() })
          .where(eq(comments.id, commentId))
          .returning();

        return res.json(updated);
      }

      return res.json(comment);
    } catch (error) {
      next(error);
    }
  },
);

commentsRouter.get(
  "/:id/history",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const commentId = req.params.id;
      const comment = await db.query.comments.findFirst({
        where: eq(comments.id, commentId),
      });

      if (!comment || comment.isDeleted) {
        throw new AppError(404, "NOT_FOUND", "Comment not found");
      }

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
          editorRole: users.role,
        })
        .from(commentEdits)
        .leftJoin(users, eq(commentEdits.editorId, users.id))
        .where(eq(commentEdits.commentId, commentId))
        .orderBy(asc(commentEdits.createdAt));

      const history: CommentEditHistoryDto[] = edits.map((e) => ({
        id: e.id,
        commentId: e.commentId,
        previousContent: e.previousContent,
        newContent: e.newContent,
        createdAt: e.createdAt.toISOString(),
        editor: {
          id: e.editorId,
          username: e.editorUsername || "ghost",
          displayName: e.editorDisplayName || "Former Member",
          avatarUrl: e.editorAvatarUrl,
          email: "",
          role: (e.editorRole || "USER") as UserRole,
        },
      }));

      return res.json(history);
    } catch (error) {
      next(error);
    }
  },
);

commentsRouter.delete(
  "/:id",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      const commentId = req.params.id;

      const comment = await db.query.comments.findFirst({
        where: eq(comments.id, commentId),
      });

      if (!comment || comment.isDeleted) {
        throw new AppError(404, "NOT_FOUND", "Comment not found");
      }
      await assertActivePost(comment.targetType as TargetType, comment.targetId);

      let isLeader = user.role === "ADMIN";
      if (!isLeader) {
        const wsId = req.headers["x-workspace-id"] as string;
        if (wsId) {
          const mem = await db.query.workspaceMembers.findFirst({
            where: and(
              eq(workspaceMembers.workspaceId, wsId),
              eq(workspaceMembers.userId, user.id),
            ),
          });
          if (mem && (mem.role === "OWNER" || mem.role === "ADMIN")) {
            isLeader = true;
          }
        }
      }

      if (comment.authorId !== user.id && !isLeader) {
        throw new AppError(403, "FORBIDDEN", "You cannot delete this comment");
      }

      await db
        .update(comments)
        .set({ isDeleted: true, updatedAt: new Date() })
        .where(eq(comments.id, commentId));

      await db.insert(activities).values({
        targetType: comment.targetType,
        targetId: comment.targetId,
        actorId: user.id,
        actionType: "COMMENT_DELETED",
        metadata: { commentId: comment.id },
      });

      return res.json({ message: "Comment deleted" });
    } catch (error) {
      next(error);
    }
  },
);
