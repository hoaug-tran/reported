export interface RepositoryItem {
  id?: string;
  owner: string;
  name: string;
  fullName: string;
  provider: "github" | "gitlab" | "bitbucket";
  webUrl?: string;
  defaultBranch: string;
  isPrivate: boolean;
  description?: string;
}

export interface PullRequestItem {
  id?: string;
  prNumber: number;
  title: string;
  state: "OPEN" | "CLOSED" | "MERGED";
  isMerged: boolean;
  headBranch: string;
  baseBranch: string;
  author: string;
  url: string;
  resourceType: "PR" | "MR";
  checksStatus?: string;
  reviewStatus?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ICodeHostProvider {
  readonly providerId: "github" | "gitlab";
  readonly name: string;
  listRepositories(
    accessToken?: string,
    query?: string,
  ): Promise<RepositoryItem[]>;
  getRepository(
    owner: string,
    repo: string,
    accessToken?: string,
  ): Promise<RepositoryItem | null>;
  listPullRequests(
    owner: string,
    repo: string,
    accessToken?: string,
  ): Promise<PullRequestItem[]>;
  getPullRequest(
    owner: string,
    repo: string,
    number: number,
    accessToken?: string,
  ): Promise<PullRequestItem | null>;
  listBranches(
    owner: string,
    repo: string,
    accessToken?: string,
  ): Promise<string[]>;
}
