import { z } from "zod";
import { PullRequestChecksStatus, PullRequestState } from "./enums.js";

export interface RepositorySummaryDto {
  id: string;
  fullName: string;
  name: string;
  owner: string;
  provider: string;
  webUrl?: string | null;
  isPrivate: boolean;
  defaultBranch: string;
}

export interface RepositoryDto extends RepositorySummaryDto {
  workspaceId?: string;
  pullRequestsCount?: number;
  openIssuesCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PullRequestSummaryDto {
  id: string;
  prNumber: number;
  title: string;
  state: PullRequestState;
  isMerged: boolean;
  headBranch: string;
  baseBranch: string;
  authorGithub: string;
  authorAvatar?: string | null;
  checksStatus: PullRequestChecksStatus;
  reviewStatus: string;
  url: string;
  updatedAt: string;
  repository?: RepositorySummaryDto;
  additions?: number | null;
  deletions?: number | null;
  changedFiles?: number | null;
  rawMetadata?: Record<string, unknown> | null;
}

export const LinkGitHubResourceSchema = z.object({
  repositoryId: z.string().uuid().optional(),
  prUrl: z.string().url().optional(),
  branch: z.string().optional(),
  commitHash: z.string().optional(),
});

export type LinkGitHubResourceDto = z.infer<typeof LinkGitHubResourceSchema>;
