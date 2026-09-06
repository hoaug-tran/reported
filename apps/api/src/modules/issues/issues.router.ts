import { Router, Request, Response, NextFunction } from 'express';
import {
  db, issues, issueAssignees, issueLabels, labels, users, repositories,
  pullRequests, comments, watchers, activities, workspaceMembers,
  eq, and, or, ilike, inArray, desc, asc, sql
} from '@reported/database';
import {
  CreateIssueSchema, UpdateIssueSchema, IssueFilterSchema,
  TargetType, IssueStatus, BugFrequency
} from '@reported/contracts';
import { requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error.js';
import { recordOutboxEvent } from '../../events/outbox.js';
import { formatPullRequestSummary } from '../github/github.router.js';

export const issuesRouter = Router();

issuesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filter = IssueFilterSchema.parse(req.query);
    const offset = (filter.page - 1) * filter.limit;

    const conditions = [eq(issues.isDeleted, false)];

    const workspaceId = (req.headers['x-workspace-id'] as string) || filter.workspaceId;
    if (workspaceId) {
      conditions.push(eq(issues.workspaceId, workspaceId));
    }

    if (filter.projectId) {
      conditions.push(eq(issues.projectId, filter.projectId));
    }

    if (filter.search) {
      conditions.push(or(
        ilike(issues.title, `%${filter.search}%`),
        ilike(issues.description, `%${filter.search}%`)
      )!);
    }

    if (filter.type) {
      conditions.push(eq(issues.type, filter.type));
    }

    if (filter.status) {
      const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
      conditions.push(inArray(issues.status, statuses));
    }

    if (filter.priority) {
      const priorities = Array.isArray(filter.priority) ? filter.priority : [filter.priority];
      conditions.push(inArray(issues.priority, priorities));
    }

    if (filter.severity) {
      const severities = Array.isArray(filter.severity) ? filter.severity : [filter.severity];
      conditions.push(inArray(issues.severity, severities));
    }

    if (filter.authorId) {
      conditions.push(eq(issues.authorId, filter.authorId));
    }

    if (filter.repositoryId) {
      conditions.push(eq(issues.repositoryId, filter.repositoryId));
    }

    let orderClause = desc(issues.createdAt);
    if (filter.sortBy === 'oldest') orderClause = asc(issues.createdAt);
    if (filter.sortBy === 'updated') orderClause = desc(issues.updatedAt);
    if (filter.sortBy === 'priority') orderClause = asc(issues.priority);
    if (filter.sortBy === 'severity') orderClause = asc(issues.severity);

    const issueList = await db.select()
      .from(issues)
      .where(and(...conditions))
      .orderBy(orderClause)
      .limit(filter.limit)
      .offset(offset);

    const [totalCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(issues)
      .where(and(...conditions));

    const enriched = await Promise.all(issueList.map(async (item) => {
      const author = await db.query.users.findFirst({
        where: eq(users.id, item.authorId)
      });

      const assignees = await db
        .select({
          id: users.id,
          username: users.username,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
          role: users.role,
          email: users.email
        })
        .from(issueAssignees)
        .innerJoin(users, eq(users.id, issueAssignees.userId))
        .where(eq(issueAssignees.issueId, item.id));

      const issueLabelsList = await db
        .select({
          id: labels.id,
          name: labels.name,
          color: labels.color,
          description: labels.description
        })
        .from(issueLabels)
        .innerJoin(labels, eq(labels.id, issueLabels.labelId))
        .where(eq(issueLabels.issueId, item.id));

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
          eq(comments.targetType, TargetType.ISSUE),
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
        type: item.type,
        status: item.status,
        priority: item.priority,
        severity: item.severity,
        author: {
          id: author!.id,
          username: author!.username,
          displayName: author!.displayName,
          avatarUrl: author!.avatarUrl,
          role: author!.role,
          email: author!.email
        },
        assignees,
        labels: issueLabelsList,
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

issuesRouter.get('/:identifier', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const param = req.params.identifier;
    const isNum = /^\d+$/.test(param);

    const issue = await db.query.issues.findFirst({
      where: isNum ? eq(issues.number, parseInt(param, 10)) : eq(issues.id, param)
    });

    if (!issue) {
      throw new AppError(404, 'ISSUE_NOT_FOUND', 'Issue not found');
    }

    if (issue.isDeleted) {
      const requestingUser = req.user;
      if (!requestingUser) {
        throw new AppError(403, 'ACCESS_DENIED', 'This content has been deleted');
      }

      const isAuthor = requestingUser.id === issue.authorId;
      let isAdmin = false;

      if (issue.workspaceId && !isAuthor) {
        const membership = await db.query.workspaceMembers.findFirst({
          where: and(
            eq(workspaceMembers.workspaceId, issue.workspaceId),
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
      where: eq(users.id, issue.authorId)
    });

    const assignees = await db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        role: users.role,
        email: users.email
      })
      .from(issueAssignees)
      .innerJoin(users, eq(users.id, issueAssignees.userId))
      .where(eq(issueAssignees.issueId, issue.id));

    const issueLabelsList = await db
      .select({
        id: labels.id,
        name: labels.name,
        color: labels.color,
        description: labels.description
      })
      .from(issueLabels)
      .innerJoin(labels, eq(labels.id, issueLabels.labelId))
      .where(eq(issueLabels.issueId, issue.id));

    const repo = issue.repositoryId ? await db.query.repositories.findFirst({
      where: eq(repositories.id, issue.repositoryId)
    }) : null;

    const pr = issue.pullRequestId ? await db.query.pullRequests.findFirst({
      where: eq(pullRequests.id, issue.pullRequestId)
    }) : null;

    const [commCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(comments)
      .where(and(
        eq(comments.targetType, TargetType.ISSUE),
        eq(comments.targetId, issue.id),
        eq(comments.isDeleted, false)
      ));

    let isWatching = false;
    if (req.user) {
      const watchRecord = await db.query.watchers.findFirst({
        where: and(
          eq(watchers.targetType, TargetType.ISSUE),
          eq(watchers.targetId, issue.id),
          eq(watchers.userId, req.user.id)
        )
      });
      isWatching = !!watchRecord;
    }

    const bugDetails = issue.environment || issue.stepsToReproduce ? {
      environment: issue.environment || '',
      precondition: issue.precondition || '',
      stepsToReproduce: issue.stepsToReproduce || '',
      actualResult: issue.actualResult || '',
      expectedResult: issue.expectedResult || '',
      frequency: (issue.frequency as BugFrequency) || BugFrequency.ALWAYS,
      evidenceJsonOrLogs: issue.evidenceJsonOrLogs || ''
    } : null;

    let deletedAt: string | null = null;
    let deletedBy: { id: string; username: string; displayName: string; avatarUrl: string | null } | null = null;
    if (issue.isDeleted) {
      const deleteActivity = await db.query.activities.findFirst({
        where: and(
          eq(activities.targetType, TargetType.ISSUE),
          eq(activities.targetId, issue.id),
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
      id: issue.id,
      workspaceId: issue.workspaceId,
      projectId: issue.projectId,
      number: issue.number,
      title: issue.title,
      description: issue.description,
      type: issue.type,
      status: issue.status,
      priority: issue.priority,
      severity: issue.severity,
      author: {
        id: author!.id,
        username: author!.username,
        displayName: author!.displayName,
        avatarUrl: author!.avatarUrl,
        role: author!.role,
        email: author!.email
      },
      assignees,
      labels: issueLabelsList,
      repository: repo ? {
        id: repo.id,
        fullName: repo.fullName,
        name: repo.name,
        owner: repo.owner,
        isPrivate: repo.isPrivate,
        defaultBranch: repo.defaultBranch
      } : null,
      pullRequest: formatPullRequestSummary(pr, repo?.fullName),
      branch: issue.branch,
      commitHash: issue.commitHash,
      bugDetails,
      commentsCount: commCount?.count || 0,
      isWatching,
      isDeleted: issue.isDeleted,
      deletedAt,
      deletedBy,
      createdAt: issue.createdAt.toISOString(),
      updatedAt: issue.updatedAt.toISOString()
    });
  } catch (error) {
    next(error);
  }
});

issuesRouter.post('/', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = CreateIssueSchema.parse(req.body);
    const user = req.user!;

    const workspaceId = (req.headers['x-workspace-id'] as string) || input.workspaceId || null;

    const [maxNum] = await db
      .select({ max: sql<number>`coalesce(max(${issues.number}), 100)::int` })
      .from(issues);
    const nextNumber = (maxNum?.max || 100) + 1;

    let pullRequestId: string | null = null;
    if (input.prUrl) {
      const match = input.prUrl.match(/pull\/(\d+)/);
      if (match) {
        const prNum = parseInt(match[1], 10);
        const existingPr = await db.query.pullRequests.findFirst({
          where: eq(pullRequests.prNumber, prNum)
        });
        if (existingPr) {
          pullRequestId = existingPr.id;
        }
      }
    }

    const [created] = await db.insert(issues).values({
      workspaceId,
      projectId: input.projectId || null,
      number: nextNumber,
      title: input.title,
      description: input.description,
      type: input.type,
      status: input.status,
      priority: input.priority,
      severity: input.severity,
      environment: input.bugDetails?.environment,
      precondition: input.bugDetails?.precondition,
      stepsToReproduce: input.bugDetails?.stepsToReproduce,
      actualResult: input.bugDetails?.actualResult,
      expectedResult: input.bugDetails?.expectedResult,
      frequency: input.bugDetails?.frequency,
      evidenceJsonOrLogs: input.bugDetails?.evidenceJsonOrLogs,
      authorId: user.id,
      repositoryId: input.repositoryId,
      pullRequestId,
      branch: input.branch,
      commitHash: input.commitHash
    }).returning();

    if (input.assigneeIds && input.assigneeIds.length > 0) {
      for (const uid of input.assigneeIds) {
        await db.insert(issueAssignees).values({
          issueId: created.id,
          userId: uid
        });
      }

      await recordOutboxEvent('ISSUE_ASSIGNED', {
        assigneeIds: input.assigneeIds,
        actorId: user.id,
        issueNumber: created.number,
        issueTitle: created.title,
        link: `/issues/${created.number}`
      });
    }

    if (input.labels && input.labels.length > 0) {
      for (const lblName of input.labels) {
        let labelRec = await db.query.labels.findFirst({
          where: eq(labels.name, lblName.toLowerCase())
        });
        if (!labelRec) {
          const [newL] = await db.insert(labels).values({
            name: lblName.toLowerCase(),
            color: '#58a6ff'
          }).returning();
          labelRec = newL;
        }
        await db.insert(issueLabels).values({
          issueId: created.id,
          labelId: labelRec.id
        });
      }
    }

    await db.insert(watchers).values({
      targetType: TargetType.ISSUE,
      targetId: created.id,
      userId: user.id
    });

    await db.insert(activities).values({
      targetType: TargetType.ISSUE,
      targetId: created.id,
      actorId: user.id,
      actionType: 'CREATED',
      metadata: { title: created.title, type: created.type }
    });

    return res.status(201).json({ id: created.id, number: created.number });
  } catch (error) {
    next(error);
  }
});

issuesRouter.patch('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = UpdateIssueSchema.parse(req.body);
    const user = req.user!;

    const issue = await db.query.issues.findFirst({
      where: eq(issues.id, req.params.id)
    });

    if (!issue) {
      throw new AppError(404, 'ISSUE_NOT_FOUND', 'Issue not found');
    }

    const updates: Partial<typeof issues.$inferInsert> = {
      updatedAt: new Date()
    };

    if (input.title) updates.title = input.title;
    if (input.description) updates.description = input.description;
    if (input.type) updates.type = input.type;
    if (input.priority) updates.priority = input.priority;
    if (input.severity) updates.severity = input.severity;
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

    if (input.bugDetails) {
      updates.environment = input.bugDetails.environment;
      updates.precondition = input.bugDetails.precondition;
      updates.stepsToReproduce = input.bugDetails.stepsToReproduce;
      updates.actualResult = input.bugDetails.actualResult;
      updates.expectedResult = input.bugDetails.expectedResult;
      updates.frequency = input.bugDetails.frequency;
      updates.evidenceJsonOrLogs = input.bugDetails.evidenceJsonOrLogs;
    }

    if (input.status && input.status !== issue.status) {
      updates.status = input.status;

      await db.insert(activities).values({
        targetType: TargetType.ISSUE,
        targetId: issue.id,
        actorId: user.id,
        actionType: 'STATUS_CHANGED',
        metadata: { from: issue.status, to: input.status }
      });

      await recordOutboxEvent('ISSUE_STATUS_CHANGED', {
        issueNumber: issue.number,
        issueTitle: issue.title,
        fromStatus: issue.status,
        toStatus: input.status,
        authorId: issue.authorId,
        actorId: user.id,
        link: `/issues/${issue.number}`
      });
    }

    await db.update(issues).set(updates).where(eq(issues.id, issue.id));

    if (input.assigneeIds !== undefined) {
      await db.delete(issueAssignees).where(eq(issueAssignees.issueId, issue.id));
      for (const uid of input.assigneeIds) {
        await db.insert(issueAssignees).values({
          issueId: issue.id,
          userId: uid
        });
      }
    }

    if (input.labels !== undefined) {
      await db.delete(issueLabels).where(eq(issueLabels.issueId, issue.id));
      for (const lblName of input.labels) {
        let labelRec = await db.query.labels.findFirst({
          where: eq(labels.name, lblName.toLowerCase())
        });
        if (!labelRec) {
          const [newL] = await db.insert(labels).values({
            name: lblName.toLowerCase(),
            color: '#58a6ff'
          }).returning();
          labelRec = newL;
        }
        await db.insert(issueLabels).values({
          issueId: issue.id,
          labelId: labelRec.id
        });
      }
    }

    return res.json({ message: 'Issue updated successfully' });
  } catch (error) {
    next(error);
  }
});

issuesRouter.post('/:id/watch', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user!;
    const issueId = req.params.id;

    const existing = await db.query.watchers.findFirst({
      where: and(
        eq(watchers.targetType, TargetType.ISSUE),
        eq(watchers.targetId, issueId),
        eq(watchers.userId, user.id)
      )
    });

    if (existing) {
      await db.delete(watchers).where(and(
        eq(watchers.targetType, TargetType.ISSUE),
        eq(watchers.targetId, issueId),
        eq(watchers.userId, user.id)
      ));
      return res.json({ watching: false });
    } else {
      await db.insert(watchers).values({
        targetType: TargetType.ISSUE,
        targetId: issueId,
        userId: user.id
      });
      return res.json({ watching: true });
    }
  } catch (error) {
    next(error);
  }
});

issuesRouter.delete('/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const issue = await db.query.issues.findFirst({
      where: eq(issues.id, req.params.id)
    });

    await db.update(issues)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(issues.id, req.params.id));

    if (issue) {
      await db.insert(activities).values({
        targetType: TargetType.ISSUE,
        targetId: issue.id,
        actorId: req.user!.id,
        actionType: 'DELETED',
        metadata: { title: issue.title }
      });
    }

    return res.json({ message: 'Issue deleted' });
  } catch (error) {
    next(error);
  }
});

