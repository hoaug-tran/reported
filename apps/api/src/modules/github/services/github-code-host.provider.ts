import { ICodeHostProvider, RepositoryItem, PullRequestItem } from './code-host-provider.interface.js';

interface GitHubRepoResponse {
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  default_branch: string;
  owner: { login: string };
}

interface GitHubPullResponse {
  number: number;
  title: string;
  state: string;
  merged_at: string | null;
  html_url: string;
  head: { ref: string };
  base: { ref: string };
  user: { login: string };
  created_at?: string;
  updated_at?: string;
}

interface GitHubBranchResponse {
  name: string;
}

function mapGitHubState(state: string, mergedAt: string | null): 'OPEN' | 'CLOSED' | 'MERGED' {
  if (mergedAt) return 'MERGED';
  if (state.toLowerCase() === 'closed') return 'CLOSED';
  return 'OPEN';
}

export class GitHubCodeHostProvider implements ICodeHostProvider {
  readonly providerId = 'github';
  readonly name = 'GitHub';

  async listRepositories(accessToken?: string, query?: string): Promise<RepositoryItem[]> {
    if (!accessToken) {
      return [];
    }

    try {
      const res = await fetch('https://api.github.com/user/repos?per_page=50&sort=updated', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'Reported-App'
        }
      });

      if (!res.ok) {
        return [];
      }

      const repos = (await res.json()) as GitHubRepoResponse[];
      let filtered = repos;
      if (query) {
        const q = query.toLowerCase();
        filtered = repos.filter((r) => r.full_name.toLowerCase().includes(q));
      }

      return filtered.map((r) => ({
        owner: r.owner.login,
        name: r.name,
        fullName: r.full_name,
        provider: 'github',
        webUrl: r.html_url,
        defaultBranch: r.default_branch || 'main',
        isPrivate: Boolean(r.private),
        description: r.description || undefined
      }));
    } catch {
      return [];
    }
  }

  async getRepository(owner: string, repo: string, accessToken?: string): Promise<RepositoryItem | null> {
    try {
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Reported-App'
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
      if (!res.ok) {
        return null;
      }

      const r = (await res.json()) as GitHubRepoResponse;
      return {
        owner: r.owner.login,
        name: r.name,
        fullName: r.full_name,
        provider: 'github',
        webUrl: r.html_url,
        defaultBranch: r.default_branch || 'main',
        isPrivate: Boolean(r.private),
        description: r.description || undefined
      };
    } catch {
      return null;
    }
  }

  async listPullRequests(owner: string, repo: string, accessToken?: string): Promise<PullRequestItem[]> {
    try {
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Reported-App'
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=30`, { headers });
      if (!res.ok) {
        return [];
      }

      const prs = (await res.json()) as GitHubPullResponse[];
      return prs.map((p) => ({
        prNumber: p.number,
        title: p.title,
        state: mapGitHubState(p.state, p.merged_at),
        isMerged: Boolean(p.merged_at),
        headBranch: p.head.ref,
        baseBranch: p.base.ref,
        author: p.user.login,
        url: p.html_url,
        resourceType: 'PR',
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }));
    } catch {
      return [];
    }
  }

  async getPullRequest(owner: string, repo: string, number: number, accessToken?: string): Promise<PullRequestItem | null> {
    try {
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Reported-App'
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${number}`, { headers });
      if (!res.ok) {
        return null;
      }

      const p = (await res.json()) as GitHubPullResponse;
      return {
        prNumber: p.number,
        title: p.title,
        state: mapGitHubState(p.state, p.merged_at),
        isMerged: Boolean(p.merged_at),
        headBranch: p.head.ref,
        baseBranch: p.base.ref,
        author: p.user.login,
        url: p.html_url,
        resourceType: 'PR',
        createdAt: p.created_at,
        updatedAt: p.updated_at
      };
    } catch {
      return null;
    }
  }

  async listBranches(owner: string, repo: string, accessToken?: string): Promise<string[]> {
    try {
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'Reported-App'
      };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=50`, { headers });
      if (!res.ok) {
        return ['main'];
      }

      const branches = (await res.json()) as GitHubBranchResponse[];
      return branches.map((b) => b.name);
    } catch {
      return ['main'];
    }
  }
}
