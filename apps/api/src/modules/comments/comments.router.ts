import { Router, Request, Response, NextFunction } from 'express';
import {
  db, comments, commentReactions, mentions, users, issues, reviewRequests, activities,
  eq, and, asc, inArray
} from '@reported/database';
import {
  CreateCommentSchema, UpdateCommentSchema, ToggleReactionSchema,
  TargetType, ReactionType, CommentDto, ReactionSummaryDto, UserRole
} from '@reported/contracts';
import { requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error.js';
import { recordOutboxEvent } from '../../events/outbox.js';

export const commentsRouter = Router();

commentsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const targetType = req.query.targetType as TargetType || TargetType.ISSUE;
    const targetId = req.query.targetId as string;

    if (!targetId) {
      throw new AppError(400, 'BAD_REQUEST', 'targetId query parameter is required');
    }

    const commentList = await db.select()
      .from(comments)
      .where(and(
        eq(comments.targetType, targetType),
        eq(comments.targetId, targetId)
      ))
      .orderBy(asc(comments.createdAt));

    const enriched = await Promise.all(commentList.map(async (c) => {
      const author = await db.query.users.findFirst({
        where: eq(users.id, c.authorId)
      });

      const reactionList = await db.select({
        reaction: commentReactions.reaction,
        userId: commentReactions.userId,
        username: users.username,
        displayName: users.displayName
      })
      .from(commentReactions)
      .leftJoin(users, eq(commentReactions.userId, users.id))
      .where(eq(commentReactions.commentId, c.id));

      const reactionsGrouped: Record<string, { count: number; users: Array<{ id: string; username: string; displayName: string }> }> = {};
      for (const r of reactionList) {
        if (!reactionsGrouped[r.reaction]) {
          reactionsGrouped[r.reaction] = { count: 0, users: [] };
        }
        reactionsGrouped[r.reaction].count++;
        if (r.userId && r.username && r.displayName) {
          reactionsGrouped[r.reaction].users.push({
            id: r.userId,
            username: r.username,
            displayName: r.displayName
          });
        }
      }

      const currentUserId = req.user?.id;
      const reactionsFormatted: ReactionSummaryDto[] = Object.entries(reactionsGrouped).map(([reaction, data]) => ({
        reaction: reaction as ReactionType,
        count: data.count,
        users: data.users,
        hasReacted: Boolean(currentUserId && data.users.some(u => u.id === currentUserId))
      }));

      return {
        id: c.id,
        targetType: c.targetType as TargetType,
        targetId: c.targetId,
        parentId: c.parentId,
        content: c.isDeleted ? '[Bình luận đã bị xóa]' : c.content,
        isDeleted: c.isDeleted,
        isEdited: c.updatedAt.getTime() > c.createdAt.getTime(),
        author: author ? {
          id: author.id,
          username: author.username,
          displayName: author.displayName,
          email: author.email,
          avatarUrl: author.avatarUrl,
          role: author.role as UserRole
        } : {
          id: c.authorId,
          username: 'ghost',
          displayName: 'Former Member',
          email: 'ghost@reported.dev',
          avatarUrl: null,
          role: UserRole.USER
        },
        reactions: reactionsFormatted,
        replies: [],
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString()
      };
    }));

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
});

commentsRouter.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = CreateCommentSchema.parse(req.body);
    const user = req.user!;

    const [comment] = await db.insert(comments).values({
      targetType: input.targetType,
      targetId: input.targetId,
      parentId: input.parentId,
      content: input.content,
      authorId: user.id
    }).returning();

    let targetTitle = '';
    let targetAuthorId = '';
    let targetLink = '';

    if (input.targetType === TargetType.ISSUE) {
      const issue = await db.query.issues.findFirst({
        where: eq(issues.id, input.targetId)
      });
      if (issue) {
        targetTitle = issue.title;
        targetAuthorId = issue.authorId;
        targetLink = `/issues/${issue.number}`;
      }
    } else {
      const review = await db.query.reviewRequests.findFirst({
        where: eq(reviewRequests.id, input.targetId)
      });
      if (review) {
        targetTitle = review.title;
        targetAuthorId = review.authorId;
        targetLink = `/reviews/${review.number}`;
      }
    }

    const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
    const matches = Array.from(input.content.matchAll(mentionRegex));
    const usernames = Array.from(new Set(matches.map(m => m[1])));

    if (usernames.length > 0) {
      const mentionedUsers = await db.select({ id: users.id, username: users.username })
        .from(users)
        .where(inArray(users.username, usernames));

      for (const mUser of mentionedUsers) {
        await db.insert(mentions).values({
          targetType: input.targetType,
          targetId: input.targetId,
          commentId: comment.id,
          userId: mUser.id,
          mentionedBy: user.id
        });
      }

      if (mentionedUsers.length > 0) {
        await recordOutboxEvent('USER_MENTIONED', {
          targetUserIds: mentionedUsers.map(u => u.id),
          actorId: user.id,
          title: `Mentioned in ${targetTitle}`,
          message: input.content.slice(0, 140),
          link: targetLink,
          targetType: input.targetType,
          targetId: input.targetId
        });
      }
    }

    await recordOutboxEvent('COMMENT_CREATED', {
      targetAuthorId,
      actorId: user.id,
      title: targetTitle,
      snippet: input.content.slice(0, 140),
      link: targetLink
    });

    await db.insert(activities).values({
      targetType: input.targetType,
      targetId: input.targetId,
      actorId: user.id,
      actionType: 'COMMENT_ADDED',
      metadata: { commentId: comment.id, snippet: input.content.slice(0, 80) }
    });

    return res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
});

commentsRouter.post('/:id/reactions', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = ToggleReactionSchema.parse(req.body);
    const user = req.user!;
    const commentId = req.params.id;

    const existing = await db.query.commentReactions.findFirst({
      where: and(
        eq(commentReactions.commentId, commentId),
        eq(commentReactions.userId, user.id),
        eq(commentReactions.reaction, input.reaction)
      )
    });

    if (existing) {
      await db.delete(commentReactions).where(and(
        eq(commentReactions.commentId, commentId),
        eq(commentReactions.userId, user.id),
        eq(commentReactions.reaction, input.reaction)
      ));
      return res.json({ reacted: false });
    } else {
      await db.insert(commentReactions).values({
        commentId,
        userId: user.id,
        reaction: input.reaction
      });
      return res.json({ reacted: true });
    }
  } catch (error) {
    next(error);
  }
});

commentsRouter.patch('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = UpdateCommentSchema.parse(req.body);
    const user = req.user!;
    const commentId = req.params.id;

    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId)
    });

    if (!comment) {
      throw new AppError(404, 'NOT_FOUND', 'Comment not found');
    }

    if (comment.authorId !== user.id && user.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'You cannot edit this comment');
    }

    const [updated] = await db.update(comments)
      .set({ content: input.content, updatedAt: new Date() })
      .where(eq(comments.id, commentId))
      .returning();

    return res.json(updated);
  } catch (error) {
    next(error);
  }
});

commentsRouter.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const commentId = req.params.id;

    const comment = await db.query.comments.findFirst({
      where: eq(comments.id, commentId)
    });

    if (!comment) {
      throw new AppError(404, 'NOT_FOUND', 'Comment not found');
    }

    if (comment.authorId !== user.id && user.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'You cannot delete this comment');
    }

    await db.update(comments)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(comments.id, commentId));

    await db.insert(activities).values({
      targetType: comment.targetType,
      targetId: comment.targetId,
      actorId: user.id,
      actionType: 'COMMENT_DELETED',
      metadata: { commentId: comment.id }
    });

    return res.json({ message: 'Comment deleted' });
  } catch (error) {
    next(error);
  }
});

