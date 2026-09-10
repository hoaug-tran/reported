import {
  ICodeHostProvider,
  RepositoryItem,
  PullRequestItem,
} from "./code-host-provider.interface.js";

interface GitLabProjectResponse {
  name: string;
  path: string;
  path_with_namespace: string;
  visibility: string;
  web_url: string;
  default_branch?: string;
  description?: string | null;
  namespace: { path: string };
}

interface GitLabMergeRequestResponse {
  iid: number;
  title: string;
  state: string;
  web_url: string;
  source_branch: string;
  target_branch: string;
  author: { username: string };
  created_at?: string;
  updated_at?: string;
}

interface GitLabBranchResponse {
  name: string;
}

function mapGitLabState(state: string): "OPEN" | "CLOSED" | "MERGED" {
  const s = state.toLowerCase();
  if (s === "merged") return "MERGED";
  if (s === "closed") return "CLOSED";
  return "OPEN";
}

export class GitLabCodeHostProvider implements ICodeHostProvider {
  readonly providerId = "gitlab";
  readonly name = "GitLab";

  async listRepositories(
    accessToken?: string,
    query?: string,
  ): Promise<RepositoryItem[]> {
    if (!accessToken) {
      return [];
    }

    try {
      const res = await fetch(
        "https://gitlab.com/api/v4/projects?membership=true&order_by=updated_at&per_page=50",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        },
      );

      if (!res.ok) {
        return [];
      }

      const projects = (await res.json()) as GitLabProjectResponse[];
      let filtered = projects;
      if (query) {
        const q = query.toLowerCase();
        filtered = projects.filter((p) =>
          p.path_with_namespace.toLowerCase().includes(q),
        );
      }

      return filtered.map((p) => ({
        owner: p.namespace.path,
        name: p.path,
        fullName: p.path_with_namespace,
        provider: "gitlab",
        webUrl: p.web_url,
        defaultBranch: p.default_branch || "main",
        isPrivate: p.visibility === "private",
        description: p.description || undefined,
      }));
    } catch {
      return [];
    }
  }

  async getRepository(
    owner: string,
    repo: string,
    accessToken?: string,
  ): Promise<RepositoryItem | null> {
    try {
      const projectPath = encodeURIComponent(`${owner}/${repo}`);
      const headers: Record<string, string> = { Accept: "application/json" };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(
        `https://gitlab.com/api/v4/projects/${projectPath}`,
        { headers },
      );
      if (!res.ok) {
        return null;
      }

      const p = (await res.json()) as GitLabProjectResponse;
      return {
        owner: p.namespace.path,
        name: p.path,
        fullName: p.path_with_namespace,
        provider: "gitlab",
        webUrl: p.web_url,
        defaultBranch: p.default_branch || "main",
        isPrivate: p.visibility === "private",
        description: p.description || undefined,
      };
    } catch {
      return null;
    }
  }

  async listPullRequests(
    owner: string,
    repo: string,
    accessToken?: string,
  ): Promise<PullRequestItem[]> {
    try {
      const projectPath = encodeURIComponent(`${owner}/${repo}`);
      const headers: Record<string, string> = { Accept: "application/json" };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(
        `https://gitlab.com/api/v4/projects/${projectPath}/merge_requests?per_page=30`,
        { headers },
      );
      if (!res.ok) {
        return [];
      }

      const mrs = (await res.json()) as GitLabMergeRequestResponse[];
      return mrs.map((m) => ({
        prNumber: m.iid,
        title: m.title,
        state: mapGitLabState(m.state),
        isMerged: m.state === "merged",
        headBranch: m.source_branch,
        baseBranch: m.target_branch,
        author: m.author.username,
        url: m.web_url,
        resourceType: "MR",
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      }));
    } catch {
      return [];
    }
  }

  async getPullRequest(
    owner: string,
    repo: string,
    number: number,
    accessToken?: string,
  ): Promise<PullRequestItem | null> {
    try {
      const projectPath = encodeURIComponent(`${owner}/${repo}`);
      const headers: Record<string, string> = { Accept: "application/json" };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(
        `https://gitlab.com/api/v4/projects/${projectPath}/merge_requests/${number}`,
        { headers },
      );
      if (!res.ok) {
        return null;
      }

      const m = (await res.json()) as GitLabMergeRequestResponse;
      return {
        prNumber: m.iid,
        title: m.title,
        state: mapGitLabState(m.state),
        isMerged: m.state === "merged",
        headBranch: m.source_branch,
        baseBranch: m.target_branch,
        author: m.author.username,
        url: m.web_url,
        resourceType: "MR",
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      };
    } catch {
      return null;
    }
  }

  async listBranches(
    owner: string,
    repo: string,
    accessToken?: string,
  ): Promise<string[]> {
    try {
      const projectPath = encodeURIComponent(`${owner}/${repo}`);
      const headers: Record<string, string> = { Accept: "application/json" };
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(
        `https://gitlab.com/api/v4/projects/${projectPath}/repository/branches?per_page=50`,
        { headers },
      );
      if (!res.ok) {
        return ["main"];
      }

      const branches = (await res.json()) as GitLabBranchResponse[];
      return branches.map((b) => b.name);
    } catch {
      return ["main"];
    }
  }
}
