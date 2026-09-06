import { Router, Request, Response, NextFunction } from 'express';
import {
  db, reviewRequests, reviewReviewers, reviewLabels, labels, users,
  repositories, pullRequests, comments, watchers, activities, workspaceMembers,
  eq, and, or, ilike, inArray, desc, asc, sql
} from '@reported/database';
import {
  CreateReviewSchema, UpdateReviewSchema, UpdateReviewDecisionSchema, UpdateAcknowledgementSchema, ReviewFilterSchema,
  TargetType, ReviewStatus, ReviewerDecision
} from '@reported/contracts';
import { requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error.js';
import { recordOutboxEvent } from '../../events/outbox.js';
import { formatPullRequestSummary } from '../github/github.router.js';

export const reviewsRouter = Router();

reviewsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filter = ReviewFilterSchema.parse(req.query);
    const offset = (filter.page - 1) * filter.limit;

    const conditions = [eq(reviewRequests.isDeleted, false)];

    const workspaceId = (req.headers['x-workspace-id'] as string) || filter.workspaceId;
    if (workspaceId) {
      conditions.push(eq(reviewRequests.workspaceId, workspaceId));
    }

    if (filter.projectId) {
      conditions.push(eq(reviewRequests.projectId, filter.projectId));
    }

    if (filter.search) {
      conditions.push(or(
        ilike(reviewRequests.title, `%${filter.search}%`),
        ilike(reviewRequests.description, `%${filter.search}%`)
      )!);
    }

    if (filter.reviewType) {
      conditions.push(eq(reviewRequests.reviewType, filter.reviewType));
    }

    if (filter.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      conditions.push(inArray(reviewRequests.status, statuses));
    }

    if (filter.authorId) {
      conditions.push(eq(reviewRequests.authorId, filter.authorId));
    }

    if (filter.repositoryId) {
      conditions.push(eq(reviewRequests.repositoryId, filter.repositoryId));
    }

    let orderClause = desc(reviewRequests.createdAt);
    if (filter.sortBy === 'oldest') orderClause = asc(reviewRequests.createdAt);
    if (filter.sortBy === 'updated') orderClause = desc(reviewRequests.updatedAt);
    if (filter.sortBy === 'deadline') orderClause = asc(reviewRequests.deadline);

    const reviewList = await db.select()
      .from(reviewRequests)
      .where(and(...conditions))
      .orderBy(orderClause)
      .limit(filter.limit)
      .offset(offset);

    const [totalCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(reviewRequests)
      .where(and(...conditions));

    const enriched = await Promise.all(reviewList.map(async (item) => {
      const author = await db.query.users.findFirst({
        where: eq(users.id, item.authorId)
      });

      const reviewersList = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          role: users.role,
          email: users.email,
          status: reviewReviewers.status,
          decisionNote: reviewReviewers.decisionNote,
          reviewedAt: reviewReviewers.reviewedAt,
          acknowledgementStatus: reviewReviewers.acknowledgementStatus,
          acknowledgedAt: reviewReviewers.acknowledgedAt
        })
        .from(reviewReviewers)
        .innerJoin(users, eq(users.id, reviewReviewers.userId))
        .where(eq(reviewReviewers.reviewId, item.id));

      const reviewLabelsList = await db
        .select({
          id: labels.id,
          name: labels.name,
          color: labels.color,
          description: labels.description
        })
        .from(reviewLabels)
        .innerJoin(labels, eq(labels.id, reviewLabels.labelId))
        .where(eq(reviewLabels.reviewId, item.id));

      const repo = item.repositoryId ? await db.query.repositories.findFirst({
        where: eq(repositories.id, item.repositoryId)
      }) : null;

      const pr = item.pullRequestId ? await db.query.pullRequests.findFirst({
        where: eq(pullRequests.id, item.pullRequestId)
      }) : null;

      const [commCount] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(comments)
        .where(and(
          eq(comments.targetType, TargetType.REVIEW),
          eq(comments.targetId, item.id),
          eq(comments.isDeleted, false)
        ));

      return {
        id: item.id,
        workspaceId: item.workspaceId,
        projectId: item.projectId,
        number: item.number,
        title: item.title,
        description: item.description,
        reviewType: item.reviewType,
        status: item.status,
        deadline: item.deadline ? item.deadline.toISOString() : null,
        author: {
          id: author!.id,
          username: author!.username,
          displayName: author!.displayName,
          avatarUrl: author!.avatarUrl,
          role: author!.role,
          email: author!.email
        },
        reviewers: reviewersList.map(r => ({
          user: {
            id: r.id,
            username: r.username,
            displayName: r.displayName,
            avatarUrl: r.avatarUrl,
            role: r.role,
            email: r.email
          },
          status: r.status,
          decisionNote: r.decisionNote,
          reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
          acknowledgementStatus: r.acknowledgementStatus || null,
          acknowledgedAt: r.acknowledgedAt ? r.acknowledgedAt.toISOString() : null
        })),
        labels: reviewLabelsList,
        repository: repo ? {
          id: repo.id,
          fullName: repo.fullName,
          name: repo.name,
          owner: repo.owner,
          isPrivate: repo.isPrivate,
          defaultBranch: repo.defaultBranch
        } : null,
        pullRequest: formatPullRequestSummary(pr, repo?.fullName),
        branch: item.branch,
        commitHash: item.commitHash,
        reviewResult: item.reviewResult,
        commentsCount: commCount?.count || 0,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString()
      };
    }));

    return res.json({
      data: enriched,
      pagination: {
        page: filter.page,
        limit: filter.limit,
        total: totalCount?.count || 0,
        totalPages: Math.ceil((totalCount?.count || 0) / filter.limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

reviewsRouter.get('/:identifier', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const param = req.params.identifier;
    const isNum = /^\d+$/.test(param);

    const review = await db.query.reviewRequests.findFirst({
      where: isNum ? eq(reviewRequests.number, parseInt(param, 10)) : eq(reviewRequests.id, param)
    });

    if (!review) {
      throw new AppError(404, 'REVIEW_NOT_FOUND', 'Review request not found');
    }

    if (review.isDeleted) {
      const requestingUser = req.user;
      if (!requestingUser) {
        throw new AppError(403, 'ACCESS_DENIED', 'This content has been deleted');
      }

      const isAuthor = requestingUser.id === review.authorId;
      let isAdmin = false;

      if (review.workspaceId && !isAuthor) {
        const membership = await db.query.workspaceMembers.findFirst({
          where: and(
            eq(workspaceMembers.workspaceId, review.workspaceId),
            eq(workspaceMembers.userId, requestingUser.id)
          )
        });
        isAdmin = membership?.role === 'OWNER' || membership?.role === 'ADMIN';
      }

      if (!isAuthor && !isAdmin) {
        throw new AppError(403, 'ACCESS_DENIED', 'This content has been deleted');
      }
    }

    const author = await db.query.users.findFirst({
      where: eq(users.id, review.authorId)
    });

    const reviewersList = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        role: users.role,
        email: users.email,
        status: reviewReviewers.status,
        decisionNote: reviewReviewers.decisionNote,
        reviewedAt: reviewReviewers.reviewedAt,
        acknowledgementStatus: reviewReviewers.acknowledgementStatus,
        acknowledgedAt: reviewReviewers.acknowledgedAt
      })
      .from(reviewReviewers)
      .innerJoin(users, eq(users.id, reviewReviewers.userId))
      .where(eq(reviewReviewers.reviewId, review.id));

    const reviewLabelsList = await db
      .select({
        id: labels.id,
        name: labels.name,
        color: labels.color,
        description: labels.description
      })
      .from(reviewLabels)
      .innerJoin(labels, eq(labels.id, reviewLabels.labelId))
      .where(eq(reviewLabels.reviewId, review.id));

    const repo = review.repositoryId ? await db.query.repositories.findFirst({
      where: eq(repositories.id, review.repositoryId)
    }) : null;

    const pr = review.pullRequestId ? await db.query.pullRequests.findFirst({
      where: eq(pullRequests.id, review.pullRequestId)
    }) : null;

    const [commCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(comments)
      .where(and(
        eq(comments.targetType, TargetType.REVIEW),
        eq(comments.targetId, review.id),
        eq(comments.isDeleted, false)
      ));

    let isWatching = false;
    if (req.user) {
      const watchRecord = await db.query.watchers.findFirst({
        where: and(
          eq(watchers.targetType, TargetType.REVIEW),
          eq(watchers.targetId, review.id),
          eq(watchers.userId, req.user.id)
        )
      });
      isWatching = !!watchRecord;
    }

    let deletedAt: string | null = null;
    let deletedBy: { id: string; username: string; displayName: string; avatarUrl: string | null } | null = null;
    if (review.isDeleted) {
      const deleteActivity = await db.query.activities.findFirst({
        where: and(
          eq(activities.targetType, TargetType.REVIEW),
          eq(activities.targetId, review.id),
          eq(activities.actionType, 'DELETED')
        ),
        orderBy: [desc(activities.createdAt)]
      });
      if (deleteActivity) {
        deletedAt = deleteActivity.createdAt.toISOString();
        const actor = await db.query.users.findFirst({
          where: eq(users.id, deleteActivity.actorId)
        });
        if (actor) {
          deletedBy = {
            id: actor.id,
            username: actor.username,
            displayName: actor.displayName,
            avatarUrl: actor.avatarUrl
          };
        }
      }
    }

    return res.json({
      id: review.id,
      workspaceId: review.workspaceId,
      projectId: review.projectId,
      number: review.number,
      title: review.title,
      description: review.description,
      reviewType: review.reviewType,
      status: review.status,
      deadline: review.deadline ? review.deadline.toISOString() : null,
      author: {
        id: author!.id,
        username: author!.username,
        displayName: author!.displayName,
        avatarUrl: author!.avatarUrl,
        role: author!.role,
        email: author!.email
      },
      reviewers: reviewersList.map(r => ({
        user: {
          id: r.id,
          username: r.username,
          displayName: r.displayName,
          avatarUrl: r.avatarUrl,
          role: r.role,
          email: r.email
        },
        status: r.status,
        decisionNote: r.decisionNote,
        reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
        acknowledgementStatus: r.acknowledgementStatus || null,
        acknowledgedAt: r.acknowledgedAt ? r.acknowledgedAt.toISOString() : null
      })),
      labels: reviewLabelsList,
      repository: repo ? {
        id: repo.id,
        fullName: repo.fullName,
        name: repo.name,
        owner: repo.owner,
        isPrivate: repo.isPrivate,
        defaultBranch: repo.defaultBranch
      } : null,
      pullRequest: formatPullRequestSummary(pr, repo?.fullName),
      branch: review.branch,
      commitHash: review.commitHash,
      reviewResult: review.reviewResult,
      commentsCount: commCount?.count || 0,
      isWatching,
      isDeleted: review.isDeleted,
      deletedAt,
      deletedBy,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString()
    });
  } catch (error) {
    next(error);
  }
});

reviewsRouter.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = CreateReviewSchema.parse(req.body);
    const user = req.user!;

    const workspaceId = (req.headers['x-workspace-id'] as string) || input.workspaceId || null;

    if (workspaceId && input.reviewerIds && input.reviewerIds.length > 0) {
      const validMembers = await db.query.workspaceMembers.findMany({
        where: and(
          eq(workspaceMembers.workspaceId, workspaceId),
          inArray(workspaceMembers.userId, input.reviewerIds)
        )
      });
      if (validMembers.length !== input.reviewerIds.length) {
        throw new AppError(400, 'INVALID_REVIEWERS', 'Chỉ có thể yêu cầu review từ thành viên trong cùng workspace');
      }
    }

    const [maxNum] = await db
      .select({ max: sql<number>`coalesce(max(${reviewRequests.number}), 200)::int` })
      .from(reviewRequests);
    const nextNumber = (maxNum?.max || 200) + 1;

    let pullRequestId: string | null = null;
    if (input.prUrl) {
      const match = input.prUrl.match(/pull\/(\d+)/);
      if (match) {
        const prNum = parseInt(match[1], 10);
        const existingPr = await db.query.pullRequests.findFirst({
          where: eq(pullRequests.prNumber, prNum)
        });
        if (existingPr) pullRequestId = existingPr.id;
      }
    }

    const [created] = await db.insert(reviewRequests).values({
      workspaceId,
      projectId: input.projectId || null,
      number: nextNumber,
      title: input.title,
      description: input.description,
      reviewType: input.reviewType,
      status: ReviewStatus.PENDING_REVIEW,
      deadline: input.deadline ? new Date(input.deadline) : null,
      repositoryId: input.repositoryId,
      pullRequestId,
      branch: input.branch,
      commitHash: input.commitHash,
      authorId: user.id
    }).returning();

    for (const rid of input.reviewerIds) {
      await db.insert(reviewReviewers).values({
        reviewId: created.id,
        userId: rid,
        status: ReviewerDecision.PENDING
      });
    }

    await recordOutboxEvent('REVIEW_REQUESTED', {
      reviewerIds: input.reviewerIds,
      actorId: user.id,
      reviewNumber: created.number,
      reviewTitle: created.title,
      link: `/reviews/${created.number}`
    });

    if (input.labels && input.labels.length > 0) {
      for (const lblName of input.labels) {
        let labelRec = await db.query.labels.findFirst({
          where: eq(labels.name, lblName.toLowerCase())
        });
        if (!labelRec) {
          const [newL] = await db.insert(labels).values({
            name: lblName.toLowerCase(),
            color: '#8957e5'
          }).returning();
          labelRec = newL;
        }
        await db.insert(reviewLabels).values({
          reviewId: created.id,
          labelId: labelRec.id
        });
      }
    }

    await db.insert(watchers).values({
      targetType: TargetType.REVIEW,
      targetId: created.id,
      userId: user.id
    });

    await db.insert(activities).values({
      targetType: TargetType.REVIEW,
      targetId: created.id,
      actorId: user.id,
      actionType: 'CREATED',
      metadata: { title: created.title, reviewType: created.reviewType }
    });

    return res.status(201).json({ id: created.id, number: created.number });
  } catch (error) {
    next(error);
  }
});

reviewsRouter.patch('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const review = await db.query.reviewRequests.findFirst({
      where: eq(reviewRequests.id, req.params.id)
    });

    if (!review) {
      throw new AppError(404, 'REVIEW_NOT_FOUND', 'Review request not found');
    }

    if (review.authorId !== user.id && user.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Only author or admin can edit this review');
    }

    const input = UpdateReviewSchema.parse(req.body);
    const updates: Partial<typeof reviewRequests.$inferInsert> = {
      updatedAt: new Date()
    };
    if (input.title) updates.title = input.title.trim();
    if (input.description) updates.description = input.description.trim();
    if (input.reviewType) updates.reviewType = input.reviewType;
    if (input.status) updates.status = input.status;
    if (input.deadline !== undefined) updates.deadline = input.deadline ? new Date(input.deadline) : null;
    if (input.projectId !== undefined) updates.projectId = input.projectId;
    if (input.repositoryId !== undefined) updates.repositoryId = input.repositoryId;
    if (input.branch !== undefined) updates.branch = input.branch;
    if (input.commitHash !== undefined) updates.commitHash = input.commitHash;

    if (input.prUrl !== undefined) {
      if (!input.prUrl) {
        updates.pullRequestId = null;
      } else {
        const match = input.prUrl.match(/pull\/(\d+)/);
        if (match) {
          const prNum = parseInt(match[1], 10);
          const existingPr = await db.query.pullRequests.findFirst({
            where: eq(pullRequests.prNumber, prNum)
          });
          if (existingPr) {
            updates.pullRequestId = existingPr.id;
          }
        }
      }
    }

    await db.update(reviewRequests).set(updates).where(eq(reviewRequests.id, review.id));

    if (input.reviewerIds !== undefined) {
      await db.delete(reviewReviewers).where(eq(reviewReviewers.reviewId, review.id));
      for (const uid of input.reviewerIds) {
        await db.insert(reviewReviewers).values({
          reviewId: review.id,
          userId: uid,
          status: ReviewerDecision.PENDING
        });
      }
    }

    if (input.labels !== undefined) {
      await db.delete(reviewLabels).where(eq(reviewLabels.reviewId, review.id));
      for (const lblName of input.labels) {
        let labelRec = await db.query.labels.findFirst({
          where: eq(labels.name, lblName.toLowerCase())
        });
        if (!labelRec) {
          const [newL] = await db.insert(labels).values({
            name: lblName.toLowerCase(),
            color: '#a371f7'
          }).returning();
          labelRec = newL;
        }
        await db.insert(reviewLabels).values({
          reviewId: review.id,
          labelId: labelRec.id
        });
      }
    }

    return res.json({ message: 'Review updated successfully' });
  } catch (error) {
    next(error);
  }
});

reviewsRouter.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const review = await db.query.reviewRequests.findFirst({
      where: eq(reviewRequests.id, req.params.id)
    });

    if (!review) {
      throw new AppError(404, 'NOT_FOUND', 'Review request not found');
    }

    if (review.authorId !== user.id && user.role !== 'ADMIN') {
      throw new AppError(403, 'FORBIDDEN', 'Only author or admin can delete this review');
    }

    await db.update(reviewRequests)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(reviewRequests.id, review.id));

    await db.insert(activities).values({
      targetType: TargetType.REVIEW,
      targetId: review.id,
      actorId: user.id,
      actionType: 'DELETED',
      metadata: { title: review.title }
    });

    return res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    next(error);
  }
});

reviewsRouter.patch('/:id/decision', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = UpdateReviewDecisionSchema.parse(req.body);
    const user = req.user!;
    const reviewId = req.params.id;

    const reviewerEntry = await db.query.reviewReviewers.findFirst({
      where: and(
        eq(reviewReviewers.reviewId, reviewId),
        eq(reviewReviewers.userId, user.id)
      )
    });

    if (!reviewerEntry) {
      await db.insert(reviewReviewers).values({
        reviewId,
        userId: user.id,
        status: input.decision,
        decisionNote: input.decisionNote,
        reviewedAt: new Date()
      });
    } else {
      await db.update(reviewReviewers).set({
        status: input.decision,
        decisionNote: input.decisionNote,
        reviewedAt: new Date()
      }).where(and(
        eq(reviewReviewers.reviewId, reviewId),
        eq(reviewReviewers.userId, user.id)
      ));
    }

    let newReviewStatus: ReviewStatus | null = null;
    if (input.decision === ReviewerDecision.CHANGES_REQUESTED) {
      newReviewStatus = ReviewStatus.CHANGES_REQUESTED;
    } else if (input.decision === ReviewerDecision.APPROVED) {
      const allReviewers = await db.query.reviewReviewers.findMany({
        where: eq(reviewReviewers.reviewId, reviewId)
      });
      const allApproved = allReviewers.every(r => r.status === ReviewerDecision.APPROVED);
      newReviewStatus = allApproved ? ReviewStatus.APPROVED : ReviewStatus.IN_REVIEW;
    }

    if (newReviewStatus) {
      await db.update(reviewRequests).set({
        status: newReviewStatus,
        updatedAt: new Date()
      }).where(eq(reviewRequests.id, reviewId));
    }

    await db.insert(activities).values({
      targetType: TargetType.REVIEW,
      targetId: reviewId,
      actorId: user.id,
      actionType: 'REVIEW_SUBMITTED',
      metadata: { decision: input.decision, note: input.decisionNote }
    });

    return res.json({ message: 'Review decision recorded', decision: input.decision });
  } catch (error) {
    next(error);
  }
});

reviewsRouter.patch('/:id/acknowledgement', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = UpdateAcknowledgementSchema.parse(req.body);
    const user = req.user!;
    const reviewId = req.params.id;

    const reviewerEntry = await db.query.reviewReviewers.findFirst({
      where: and(
        eq(reviewReviewers.reviewId, reviewId),
        eq(reviewReviewers.userId, user.id)
      )
    });

    const now = new Date();

    if (!reviewerEntry) {
      await db.insert(reviewReviewers).values({
        reviewId,
        userId: user.id,
        status: ReviewerDecision.PENDING,
        acknowledgementStatus: input.status,
        acknowledgedAt: now
      });
    } else {
      await db.update(reviewReviewers).set({
        acknowledgementStatus: input.status,
        acknowledgedAt: now
      }).where(and(
        eq(reviewReviewers.reviewId, reviewId),
        eq(reviewReviewers.userId, user.id)
      ));
    }

    await db.insert(activities).values({
      targetType: TargetType.REVIEW,
      targetId: reviewId,
      actorId: user.id,
      actionType: 'ACKNOWLEDGEMENT_UPDATED',
      metadata: { status: input.status }
    });

    return res.json({ message: 'Acknowledgement recorded', status: input.status });
  } catch (error) {
    next(error);
  }
});

