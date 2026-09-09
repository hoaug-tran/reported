import { Router, Request, Response, NextFunction } from 'express';
import {
  db, repositories, pullRequests, issues, reviewRequests, activities, externalAccounts,
  eq, and, ilike, or, desc
} from '@reported/database';
import { PullRequestChecksStatus, PullRequestState, TargetType } from '@reported/contracts';
import { requireAuth } from '../../middleware/auth.js';
import { decryptToken } from '../auth/services/token-cipher.service.js';
import { AppError } from '../../middleware/error.js';
import { config } from '../../config/index.js';
import crypto from 'crypto';
import { cacheService } from '../../services/cache.service.js';

export const githubRouter = Router();

githubRouter.get('/user-repos', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
    }

    const cacheKey = `gh:user-repos:${userId}`;
    const cached = cacheService.get<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const [account] = await db.select().from(externalAccounts).where(
      and(
        eq(externalAccounts.userId, userId),
        eq(externalAccounts.provider, 'github')
      )
    ).limit(1);

    if (!account || !account.accessTokenEncrypted) {
      return res.status(200).json({ linked: false, repos: [] });
    }

    const token = decryptToken(account.accessTokenEncrypted);
    const ghRes = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated&type=all', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Reported-App'
      }
    });

    if (!ghRes.ok) {
      if (ghRes.status === 401) {
        return res.status(200).json({ linked: false, repos: [], error: 'GitHub token expired or revoked' });
      }
      throw new AppError(502, 'GITHUB_API_ERROR', 'Failed to fetch repositories from GitHub');
    }

    const data = (await ghRes.json()) as any[];
    const repos = data.map(r => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      owner: r.owner?.login,
      ownerAvatar: r.owner?.avatar_url,
      isPrivate: r.private,
      defaultBranch: r.default_branch || 'main',
      htmlUrl: r.html_url,
      description: r.description,
      updatedAt: r.updated_at
    }));

    const result = { linked: true, repos };
    cacheService.set(cacheKey, result, 60);
    return res.json(result);
  } catch (error) {
    next(error);
  }
});

githubRouter.get('/repositories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q as string;
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string);

    const conditions = [];
    if (workspaceId) {
      conditions.push(eq(repositories.workspaceId, workspaceId));
    }
    if (q) {
      conditions.push(or(
        ilike(repositories.name, `%${q}%`),
        ilike(repositories.fullName, `%${q}%`)
      )!);
    }

    const repoList = await db.select().from(repositories)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(repositories.name)
      .limit(50);

    const reposWithStats = await Promise.all(
      repoList.map(async (repo) => {
        const prList = await db.select().from(pullRequests).where(eq(pullRequests.repositoryId, repo.id));
        const openPrs = prList.filter(p => p.state === 'OPEN').length;
        return {
          ...repo,
          stats: {
            totalPrs: prList.length,
            openPrs
          }
        };
      })
    );

    return res.json(reposWithStats);
  } catch (error) {
    next(error);
  }
});

githubRouter.post('/repositories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { owner, name, defaultBranch = 'main', isPrivate = false, provider = 'github', webUrl, projectId } = req.body;
    const workspaceId = (req.headers['x-workspace-id'] as string) || req.body.workspaceId || null;

    if (!owner || !name) {
      throw new AppError(400, 'BAD_REQUEST', 'Owner and Repository Name are required');
    }

    const fullName = `${owner.trim()}/${name.trim()}`;
    const existing = await db.query.repositories.findFirst({
      where: eq(repositories.fullName, fullName)
    });

    if (existing) {
      throw new AppError(409, 'ALREADY_EXISTS', `Repository ${fullName} is already connected`);
    }

    const [newRepo] = await db.insert(repositories).values({
      workspaceId,
      projectId: projectId || null,
      owner: owner.trim(),
      name: name.trim(),
      fullName,
      provider: provider || 'github',
      webUrl: webUrl || (provider === 'gitlab' ? `https://gitlab.com/${fullName}` : `https://github.com/${fullName}`),
      defaultBranch: defaultBranch.trim() || 'main',
      isPrivate: Boolean(isPrivate)
    }).returning();

    return res.status(201).json(newRepo);
  } catch (error) {
    next(error);
  }
});

githubRouter.put('/repositories/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { defaultBranch, isPrivate, projectId } = req.body;

    const [updated] = await db.update(repositories)
      .set({
        defaultBranch,
        isPrivate: isPrivate !== undefined ? Boolean(isPrivate) : undefined,
        projectId: projectId !== undefined ? projectId : undefined
      })
      .where(eq(repositories.id, id))
      .returning();

    if (!updated) {
      throw new AppError(404, 'NOT_FOUND', 'Repository not found');
    }

    return res.json(updated);
  } catch (error) {
    next(error);
  }
});

githubRouter.delete('/repositories/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const [deleted] = await db.delete(repositories)
      .where(eq(repositories.id, id))
      .returning();

    if (!deleted) {
      throw new AppError(404, 'NOT_FOUND', 'Repository not found');
    }

    return res.json({ success: true, message: `Repository ${deleted.fullName} unlinked` });
  } catch (error) {
    next(error);
  }
});

githubRouter.get('/repositories/:id/pull-requests', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const prs = await db.select().from(pullRequests)
      .where(eq(pullRequests.repositoryId, id))
      .orderBy(pullRequests.prNumber);

    return res.json(prs);
  } catch (error) {
    next(error);
  }
});

githubRouter.get('/repositories/:id/github-pulls', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const repo = await db.query.repositories.findFirst({
      where: eq(repositories.id, id)
    });

    if (!repo) {
      throw new AppError(404, 'NOT_FOUND', 'Repository not found');
    }

    const cacheKey = `gh:repo-pulls:${id}`;
    const cached = cacheService.get<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const [account] = await db.select().from(externalAccounts).where(
      and(
        eq(externalAccounts.userId, userId),
        eq(externalAccounts.provider, 'github')
      )
    ).limit(1);

    let ghRes: any = null;
    let token: string | null = null;
    if (account?.accessTokenEncrypted) {
      try {
        token = decryptToken(account.accessTokenEncrypted);
        ghRes = await fetch(
          `https://api.github.com/repos/${repo.fullName}/pulls?state=open&per_page=50&sort=updated`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'Reported-App'
            }
          }
        );
        if (ghRes.status === 401) {
          await db.update(externalAccounts).set({ healthStatus: 'EXPIRED', updatedAt: new Date() }).where(eq(externalAccounts.id, account.id));
          ghRes = null;
        }
      } catch {}
    }

    if (!ghRes || !ghRes.ok) {
      const publicRes = await fetch(
        `https://api.github.com/repos/${repo.fullName}/pulls?state=open&per_page=50&sort=updated`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Reported-App'
          }
        }
      );
      if (publicRes.ok) {
        ghRes = publicRes;
      }
    }

    if (!ghRes || !ghRes.ok) {
      const localPrs = await db.select().from(pullRequests)
        .where(eq(pullRequests.repositoryId, id))
        .orderBy(desc(pullRequests.prNumber));

      if (localPrs.length > 0) {
        const fallbackPulls = localPrs.map(p => ({
          number: p.prNumber,
          title: p.title,
          state: p.state,
          headBranch: p.headBranch,
          baseBranch: p.baseBranch,
          headSha: '',
          authorLogin: p.authorGithub,
          authorAvatar: (p.rawMetadata as any)?.authorAvatar || null,
          htmlUrl: `https://github.com/${repo.fullName}/pull/${p.prNumber}`,
          isDraft: false,
          createdAt: p.updatedAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
          additions: (p.rawMetadata as any)?.additions ?? null,
          deletions: (p.rawMetadata as any)?.deletions ?? null,
          changedFiles: (p.rawMetadata as any)?.changedFiles ?? null,
          body: ''
        }));

        return res.json({
          pulls: fallbackPulls,
          warning: 'GitHub token expired or lacks repo access. Hiển thị PR đã lưu trong hệ thống.',
          isFallback: true
        });
      }

      if (!account || !account.accessTokenEncrypted) {
        return res.status(200).json({ pulls: [], error: 'GitHub account not connected', code: 'NOT_CONNECTED' });
      }
      if (ghRes?.status === 404 || (!ghRes && repo.isPrivate)) {
        return res.status(200).json({ pulls: [], error: 'Repository not found on GitHub or private repository requires re-connecting GitHub', code: 'ACCESS_DENIED' });
      }
      return res.status(200).json({ pulls: [], error: 'GitHub token expired or lacks repo access', code: 'TOKEN_EXPIRED' });
    }

    const data = (await ghRes.json()) as any[];
    const pulls = data.map(pr => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      headBranch: pr.head?.ref,
      baseBranch: pr.base?.ref,
      headSha: pr.head?.sha,
      authorLogin: pr.user?.login,
      authorAvatar: pr.user?.avatar_url,
      htmlUrl: pr.html_url,
      isDraft: pr.draft || false,
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      additions: pr.additions,
      deletions: pr.deletions,
      changedFiles: pr.changed_files,
      body: pr.body
    }));

    const result = { pulls };
    cacheService.set(cacheKey, result, 30);
    return res.json(result);
  } catch (error) {
    next(error);
  }
});



githubRouter.post('/webhook/simulate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { event = 'pull_request', action = 'opened', prNumber, repoFullName } = req.body;

    const repo = await db.query.repositories.findFirst({
      where: eq(repositories.fullName, repoFullName)
    });

    if (!repo) {
      throw new AppError(404, 'NOT_FOUND', `Repository ${repoFullName} not found`);
    }

    let pr = await db.query.pullRequests.findFirst({
      where: eq(pullRequests.prNumber, prNumber)
    });

    if (action === 'opened' && !pr) {
      const [created] = await db.insert(pullRequests).values({
        repositoryId: repo.id,
        prNumber,
        title: `Simulated PR #${prNumber} from GitHub webhook`,
        state: PullRequestState.OPEN,
        isMerged: false,
        headBranch: `feat/webhook-sim-${prNumber}`,
        baseBranch: repo.defaultBranch,
        authorGithub: 'github-webhook-bot',
        checksStatus: PullRequestChecksStatus.PASSING,
        reviewStatus: 'PENDING',
        rawMetadata: { commitsCount: 1, additions: 25, deletions: 5 }
      }).returning();
      pr = created;
    } else if (pr) {
      const isMerged = action === 'merged';
      const state = isMerged ? PullRequestState.MERGED : (action === 'closed' ? PullRequestState.CLOSED : PullRequestState.OPEN);
      const [updated] = await db.update(pullRequests).set({
        state,
        isMerged,
        updatedAt: new Date()
      }).where(eq(pullRequests.id, pr.id)).returning();
      pr = updated;
    }

    return res.json({
      success: true,
      message: `Simulated GitHub Webhook [event=${event}, action=${action}] executed successfully`,
      pr
    });
  } catch (error) {
    next(error);
  }
});

githubRouter.get('/preview-pr', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const prUrl = req.query.url as string;
    const workspaceId = (req.headers['x-workspace-id'] as string) || (req.query.workspaceId as string) || null;
    const userId = (req as any).user?.id;

    if (!prUrl) {
      throw new AppError(400, 'BAD_REQUEST', 'PR url query parameter is required');
    }

    const githubMatch = prUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
    const gitlabMatch = prUrl.match(/gitlab\.com\/([^/]+)\/([^/]+)\/-\/merge_requests\/(\d+)/);

    if (!githubMatch && !gitlabMatch) {
      throw new AppError(400, 'INVALID_URL', 'URL is not a valid GitHub pull request or GitLab merge request link');
    }

    const isGitLab = Boolean(gitlabMatch);
    const [_, owner, repoName, prNumStr] = (githubMatch || gitlabMatch)!;
    const prNumber = parseInt(prNumStr, 10);
    const fullName = `${owner}/${repoName}`;
    const provider = isGitLab ? 'gitlab' : 'github';
    const resourceType = isGitLab ? 'MR' : 'PR';

    let liveData: {
      title?: string;
      state?: string;
      isMerged?: boolean;
      headBranch?: string;
      baseBranch?: string;
      authorGithub?: string;
      authorAvatar?: string;
      checksStatus?: string;
      reviewStatus?: string;
      additions?: number;
      deletions?: number;
      changedFiles?: number;
      commitsCount?: number;
    } = {};

    if (!isGitLab && userId) {
      const [account] = await db.select().from(externalAccounts).where(
        and(
          eq(externalAccounts.userId, userId),
          eq(externalAccounts.provider, 'github')
        )
      ).limit(1);

      let ghRes: any = null;
      let token: string | null = null;
      if (account?.accessTokenEncrypted) {
        try {
          token = decryptToken(account.accessTokenEncrypted);
          ghRes = await fetch(
            `https://api.github.com/repos/${fullName}/pulls/${prNumber}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Reported-App'
              }
            }
          );
          if (ghRes.status === 401) {
            await db.update(externalAccounts).set({ healthStatus: 'EXPIRED', updatedAt: new Date() }).where(eq(externalAccounts.id, account.id));
            ghRes = null;
          }
        } catch {}
      }

      if (!ghRes || !ghRes.ok) {
        const publicRes = await fetch(
          `https://api.github.com/repos/${fullName}/pulls/${prNumber}`,
          {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'Reported-App'
            }
          }
        );
        if (publicRes.ok) {
          ghRes = publicRes;
        }
      }

      if (ghRes && ghRes.ok) {
        const prData = await ghRes.json() as any;
        const isMerged = !!prData.merged;
        const state = isMerged ? 'MERGED' : (prData.state === 'closed' ? 'CLOSED' : 'OPEN');

        let checksStatus = PullRequestChecksStatus.PENDING;
        const checkHeaders: Record<string, string> = {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Reported-App'
        };
        if (token) checkHeaders['Authorization'] = `Bearer ${token}`;

        const checksRes = await fetch(
          `https://api.github.com/repos/${fullName}/commits/${prData.head?.sha}/check-runs`,
          { headers: checkHeaders }
        );
        let checkRunsData: any[] = [];
        if (checksRes.ok) {
          const checksJson = await checksRes.json() as any;
          checkRunsData = checksJson.check_runs || [];
          const hasFailure = checkRunsData.some((r: any) => r.conclusion === 'failure' || r.conclusion === 'timed_out');
          const hasPending = checkRunsData.some((r: any) => r.status !== 'completed');
          const allPass = checkRunsData.length > 0 && !hasFailure && !hasPending;
          checksStatus = hasFailure
            ? PullRequestChecksStatus.FAILING
            : hasPending
              ? PullRequestChecksStatus.PENDING
              : allPass
                ? PullRequestChecksStatus.PASSING
                : PullRequestChecksStatus.PENDING;
        }

        liveData = {
          title: prData.title,
          state,
          isMerged,
          headBranch: prData.head?.ref,
          baseBranch: prData.base?.ref,
          authorGithub: prData.user?.login,
          authorAvatar: prData.user?.avatar_url,
          checksStatus,
          reviewStatus: prData.draft ? 'DRAFT' : 'PENDING',
          additions: prData.additions,
          deletions: prData.deletions,
          changedFiles: prData.changed_files,
          commitsCount: prData.commits,
        };

        (liveData as any).rawMetadata = {
          check_runs: checkRunsData.map((r: any) => ({
            name: r.name,
            status: r.status,
            conclusion: r.conclusion,
            html_url: r.html_url,
            started_at: r.started_at,
            completed_at: r.completed_at
          })),
          additions: prData.additions,
          deletions: prData.deletions,
          changedFiles: prData.changed_files,
          commitsCount: prData.commits,
          authorAvatar: prData.user?.avatar_url,
          authorLogin: prData.user?.login
        };
      }
    }

    const repo = await db.query.repositories.findFirst({
      where: eq(repositories.fullName, fullName)
    });

    let pr = await db.query.pullRequests.findFirst({
      where: eq(pullRequests.prNumber, prNumber)
    });

    if (!pr) {
      let repoId = repo?.id;
      if (!repoId) {
        const [newRepo] = await db.insert(repositories).values({
          workspaceId,
          owner,
          name: repoName,
          fullName,
          provider,
          webUrl: isGitLab ? `https://gitlab.com/${fullName}` : `https://github.com/${fullName}`,
          defaultBranch: 'main'
        }).returning();
        repoId = newRepo.id;
      }

      const [newPr] = await db.insert(pullRequests).values({
        repositoryId: repoId,
        prNumber,
        title: liveData.title || `${resourceType} #${prNumber} on ${fullName}`,
        state: (liveData.state as any) || PullRequestState.OPEN,
        isMerged: liveData.isMerged || false,
        headBranch: liveData.headBranch || `${isGitLab ? 'mr' : 'patch'}-${prNumber}`,
        baseBranch: liveData.baseBranch || 'main',
        authorGithub: liveData.authorGithub || owner,
        checksStatus: (liveData.checksStatus as any) || PullRequestChecksStatus.PASSING,
        reviewStatus: liveData.reviewStatus || 'PENDING',
        rawMetadata: (liveData as any).rawMetadata || {
          additions: liveData.additions || 0,
          deletions: liveData.deletions || 0,
          authorAvatar: liveData.authorAvatar || null,
          resourceType
        }
      }).returning();
      pr = newPr;
    } else if (Object.keys(liveData).length > 0) {
      const updatePayload: any = { updatedAt: new Date() };
      if (liveData.title) updatePayload.title = liveData.title;
      if (liveData.state) updatePayload.state = liveData.state;
      if (liveData.isMerged !== undefined) updatePayload.isMerged = liveData.isMerged;
      if (liveData.headBranch) updatePayload.headBranch = liveData.headBranch;
      if (liveData.baseBranch) updatePayload.baseBranch = liveData.baseBranch;
      if (liveData.authorGithub) updatePayload.authorGithub = liveData.authorGithub;
      if (liveData.checksStatus) updatePayload.checksStatus = liveData.checksStatus;
      if (liveData.reviewStatus) updatePayload.reviewStatus = liveData.reviewStatus;
      if ((liveData as any).rawMetadata) updatePayload.rawMetadata = (liveData as any).rawMetadata;

      const [updated] = await db.update(pullRequests)
        .set(updatePayload)
        .where(eq(pullRequests.id, pr.id))
        .returning();
      pr = updated;
    }

    return res.json({
      id: pr.id,
      prNumber: pr.prNumber,
      title: pr.title,
      state: pr.state,
      isMerged: pr.isMerged,
      headBranch: pr.headBranch,
      baseBranch: pr.baseBranch,
      authorGithub: pr.authorGithub,
      authorAvatar: liveData.authorAvatar || (pr.rawMetadata as any)?.authorAvatar || null,
      checksStatus: pr.checksStatus,
      reviewStatus: pr.reviewStatus,
      rawMetadata: pr.rawMetadata,
      additions: liveData.additions ?? (pr.rawMetadata as any)?.additions ?? null,
      deletions: liveData.deletions ?? (pr.rawMetadata as any)?.deletions ?? null,
      changedFiles: liveData.changedFiles ?? (pr.rawMetadata as any)?.changedFiles ?? null,
      url: prUrl,
      updatedAt: pr.updatedAt.toISOString(),
      repository: {
        owner,
        name: repoName,
        fullName
      }
    });
  } catch (error) {
    next(error);
  }
});

githubRouter.post('/pull-requests/:id/sync', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const pr = await db.query.pullRequests.findFirst({
      where: eq(pullRequests.id, id)
    });
    if (!pr) {
      throw new AppError(404, 'NOT_FOUND', 'Pull request not found');
    }

    const repo = await db.query.repositories.findFirst({
      where: eq(repositories.id, pr.repositoryId)
    });
    if (!repo) {
      throw new AppError(404, 'NOT_FOUND', 'Repository not found');
    }

    const [account] = await db.select().from(externalAccounts).where(
      and(
        eq(externalAccounts.userId, userId),
        eq(externalAccounts.provider, repo.provider || 'github')
      )
    ).limit(1);

    let ghRes: any = null;
    let token: string | null = null;
    if (account?.accessTokenEncrypted) {
      try {
        token = decryptToken(account.accessTokenEncrypted);
        ghRes = await fetch(
          `https://api.github.com/repos/${repo.fullName}/pulls/${pr.prNumber}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'Reported-App'
            }
          }
        );
        if (ghRes.status === 401) {
          await db.update(externalAccounts).set({ healthStatus: 'EXPIRED', updatedAt: new Date() }).where(eq(externalAccounts.id, account.id));
          ghRes = null;
        }
      } catch {}
    }

    if (!ghRes || !ghRes.ok) {
      const publicRes = await fetch(
        `https://api.github.com/repos/${repo.fullName}/pulls/${pr.prNumber}`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Reported-App'
          }
        }
      );
      if (publicRes.ok) {
        ghRes = publicRes;
      }
    }

    if (ghRes && ghRes.ok) {
      const prData = await ghRes.json() as any;
      const isMerged = !!prData.merged;
      const state = isMerged ? 'MERGED' : (prData.state === 'closed' ? 'CLOSED' : 'OPEN');

      const checkHeaders: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Reported-App'
      };
      if (token) checkHeaders['Authorization'] = `Bearer ${token}`;

      let checkRunsData: any[] = [];
      let checksStatus = PullRequestChecksStatus.PASSING;
      try {
        const checksRes = await fetch(
          `https://api.github.com/repos/${repo.fullName}/commits/${prData.head?.sha}/check-runs`,
          { headers: checkHeaders }
        );
        if (checksRes.ok) {
          const cJson = await checksRes.json() as any;
          checkRunsData = cJson.check_runs || [];
          const hasFailure = checkRunsData.some((r: any) => r.conclusion === 'failure' || r.conclusion === 'timed_out');
          const hasPending = checkRunsData.some((r: any) => r.status !== 'completed');
          const allPass = checkRunsData.length > 0 && !hasFailure && !hasPending;
          checksStatus = hasFailure ? PullRequestChecksStatus.FAILING : hasPending ? PullRequestChecksStatus.PENDING : allPass ? PullRequestChecksStatus.PASSING : PullRequestChecksStatus.PASSING;
        }
      } catch {}

      const updatedMeta = {
        ...((pr.rawMetadata as any) || {}),
        additions: prData.additions,
        deletions: prData.deletions,
        changedFiles: prData.changed_files,
        commitsCount: prData.commits,
        authorAvatar: prData.user?.avatar_url,
        authorLogin: prData.user?.login,
        check_runs: checkRunsData.map((r: any) => ({
          name: r.name,
          status: r.status,
          conclusion: r.conclusion,
          html_url: r.html_url,
          started_at: r.started_at,
          completed_at: r.completed_at
        }))
      };

      const [updatedPr] = await db.update(pullRequests).set({
        title: prData.title || pr.title,
        state,
        isMerged,
        headBranch: prData.head?.ref || pr.headBranch,
        baseBranch: prData.base?.ref || pr.baseBranch,
        authorGithub: prData.user?.login || pr.authorGithub,
        checksStatus,
        reviewStatus: prData.draft ? 'DRAFT' : 'PENDING',
        rawMetadata: updatedMeta,
        updatedAt: new Date()
      }).where(eq(pullRequests.id, pr.id)).returning();

      const hasChanges = Boolean(
        pr.state !== state ||
        pr.isMerged !== isMerged ||
        pr.checksStatus !== checksStatus ||
        (pr.rawMetadata as any)?.commitsCount !== prData.commits ||
        (pr.rawMetadata as any)?.changedFiles !== prData.changed_files ||
        (pr.rawMetadata as any)?.additions !== prData.additions ||
        (pr.rawMetadata as any)?.deletions !== prData.deletions
      );

      if (hasChanges) {
        const linkedReviews = await db.query.reviewRequests.findMany({
          where: eq(reviewRequests.pullRequestId, pr.id)
        });
        for (const lr of linkedReviews) {
          await db.update(reviewRequests)
            .set({ status: 'PENDING', updatedAt: new Date() })
            .where(eq(reviewRequests.id, lr.id));

          await db.insert(activities).values({
            targetType: TargetType.REVIEW,
            targetId: lr.id,
            actorId: userId,
            actionType: 'PR_UPDATED',
            metadata: {
              prNumber: pr.prNumber,
              title: updatedPr.title,
              fromStatus: lr.status,
              toStatus: 'PENDING'
            }
          });
        }

        const linkedIssues = await db.query.issues.findMany({
          where: eq(issues.pullRequestId, pr.id)
        });
        for (const li of linkedIssues) {
          await db.insert(activities).values({
            targetType: TargetType.ISSUE,
            targetId: li.id,
            actorId: userId,
            actionType: 'PR_UPDATED',
            metadata: {
              prNumber: pr.prNumber,
              title: updatedPr.title,
              commitsCount: prData.commits
            }
          });
        }
      }

      return res.json({
        success: true,
        hasChanges,
        message: 'Pull Request synced successfully from GitHub',
        pullRequest: formatPullRequestSummary(updatedPr, repo.fullName)
      });
    } else {
      return res.status(200).json({
        success: false,
        error: 'GitHub token expired or lacks access to this private repository',
        code: 'TOKEN_EXPIRED',
        pullRequest: formatPullRequestSummary(pr, repo.fullName)
      });
    }
  } catch (error) {
    next(error);
  }
});

githubRouter.patch('/pull-requests/:id', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, authorGithub, headBranch, baseBranch, state, checksStatus, additions, deletions, changedFiles } = req.body;

    const pr = await db.query.pullRequests.findFirst({
      where: eq(pullRequests.id, id)
    });
    if (!pr) {
      throw new AppError(404, 'NOT_FOUND', 'Pull request not found');
    }

    const currentMeta = (pr.rawMetadata as any) || {};
    const updatedMeta = {
      ...currentMeta,
      ...(additions !== undefined ? { additions: Number(additions) } : {}),
      ...(deletions !== undefined ? { deletions: Number(deletions) } : {}),
      ...(changedFiles !== undefined ? { changedFiles: Number(changedFiles) } : {})
    };

    const [updated] = await db.update(pullRequests).set({
      ...(title ? { title: String(title).trim() } : {}),
      ...(authorGithub ? { authorGithub: String(authorGithub).trim().replace(/^@/, '') } : {}),
      ...(headBranch ? { headBranch: String(headBranch).trim() } : {}),
      ...(baseBranch ? { baseBranch: String(baseBranch).trim() } : {}),
      ...(state ? { state } : {}),
      ...(checksStatus ? { checksStatus } : {}),
      rawMetadata: updatedMeta,
      updatedAt: new Date()
    }).where(eq(pullRequests.id, id)).returning();

    const repo = await db.query.repositories.findFirst({
      where: eq(repositories.id, pr.repositoryId)
    });

    return res.json({
      success: true,
      message: 'Pull request updated',
      pullRequest: formatPullRequestSummary(updated, repo?.fullName)
    });
  } catch (error) {
    next(error);
  }
});

export function formatPullRequestSummary(pr: any, repoFullName?: string) {
  if (!pr) return null;
  const meta = (pr.rawMetadata as any) || {};
  return {
    id: pr.id,
    prNumber: pr.prNumber,
    title: pr.title,
    state: pr.state,
    isMerged: pr.isMerged,
    headBranch: pr.headBranch,
    baseBranch: pr.baseBranch,
    authorGithub: pr.authorGithub,
    authorAvatar: meta.authorAvatar || null,
    checksStatus: pr.checksStatus,
    reviewStatus: pr.reviewStatus,
    url: `https://github.com/${repoFullName || 'org/repo'}/pull/${pr.prNumber}`,
    updatedAt: pr.updatedAt instanceof Date ? pr.updatedAt.toISOString() : (pr.updatedAt || new Date().toISOString()),
    additions: meta.additions ?? null,
    deletions: meta.deletions ?? null,
    changedFiles: meta.changedFiles ?? null,
    commitsCount: meta.commitsCount ?? null,
    rawMetadata: pr.rawMetadata || null
  };
}



githubRouter.post('/webhook', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-hub-signature-256'] as string;
    const rawPayload = JSON.stringify(req.body);

    if (signature && config.githubWebhookSecret) {
      const hmac = crypto.createHmac('sha256', config.githubWebhookSecret);
      const digest = 'sha256=' + hmac.update(rawPayload).digest('hex');

      const sigBuf = Buffer.from(signature);
      const digBuf = Buffer.from(digest);

      if (sigBuf.length !== digBuf.length || !crypto.timingSafeEqual(sigBuf, digBuf)) {
        throw new AppError(401, 'INVALID_SIGNATURE', 'HMAC signature verification failed');
      }
    }

    const event = req.headers['x-github-event'] as string;
    const payload = req.body;

    console.log(`GitHub Webhook received: event=${event}, action=${payload?.action}`);

    if (event === 'pull_request') {
      const { action, pull_request: prData, repository: repoData } = payload;
      const prNumber = prData?.number;

      if (prNumber) {
        const pr = await db.query.pullRequests.findFirst({
          where: eq(pullRequests.prNumber, prNumber)
        });

        if (pr) {
          const isMerged = !!prData.merged;
          const state = isMerged ? PullRequestState.MERGED : (prData.state === 'closed' ? PullRequestState.CLOSED : PullRequestState.OPEN);

          await db.update(pullRequests).set({
            state,
            isMerged,
            updatedAt: new Date()
          }).where(eq(pullRequests.id, pr.id));

          if (isMerged) {
            const linkedIssues = await db.query.issues.findMany({
              where: eq(issues.pullRequestId, pr.id)
            });

            for (const issue of linkedIssues) {
              await db.insert(activities).values({
                targetType: TargetType.ISSUE,
                targetId: issue.id,
                actorId: issue.authorId,
                actionType: 'PR_MERGED',
                metadata: { prNumber, title: prData.title }
              });
            }
          }
        }
      }
    }

    return res.json({ received: true });
  } catch (error) {
    next(error);
  }
});

