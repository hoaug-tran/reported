import { z } from 'zod';
import { BugFrequency, IssuePriority, IssueSeverity, IssueStatus, IssueType } from './enums.js';
import { UserSummaryDto } from './auth.dto.js';
import { PullRequestSummaryDto, RepositorySummaryDto } from './github.dto.js';

export const BugTemplateDataSchema = z.object({
  environment: z.string().min(1, 'Environment is required (e.g. Chrome 128, Node 22, macOS 14.5)'),
  precondition: z.string().optional(),
  stepsToReproduce: z.string().min(1, 'Steps to reproduce are required'),
  actualResult: z.string().min(1, 'Actual result is required'),
  expectedResult: z.string().min(1, 'Expected result is required'),
  frequency: z.nativeEnum(BugFrequency).default(BugFrequency.ALWAYS),
  evidenceJsonOrLogs: z.string().optional()
});

export type BugTemplateData = z.infer<typeof BugTemplateDataSchema>;

export const CreateIssueSchema = z.object({
  workspaceId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  title: z.string().min(3).max(200),
  description: z.string().min(1, 'Description or template content is required'),
  type: z.nativeEnum(IssueType).default(IssueType.BUG),
  status: z.nativeEnum(IssueStatus).default(IssueStatus.OPEN),
  priority: z.nativeEnum(IssuePriority).default(IssuePriority.P2),
  severity: z.nativeEnum(IssueSeverity).default(IssueSeverity.MAJOR),
  labels: z.array(z.string()).default([]),
  assigneeIds: z.array(z.string()).default([]),
  repositoryId: z.string().uuid().optional().nullable(),
  prUrl: z.string().url().optional().nullable(),
  branch: z.string().optional().nullable(),
  commitHash: z.string().optional().nullable(),
  bugDetails: BugTemplateDataSchema.optional().nullable()
});

export type CreateIssueDto = z.infer<typeof CreateIssueSchema>;

export const UpdateIssueSchema = z.object({
  projectId: z.string().uuid().optional().nullable(),
  title: z.string().min(3).max(200).optional(),
  description: z.string().optional(),
  type: z.nativeEnum(IssueType).optional(),
  status: z.nativeEnum(IssueStatus).optional(),
  priority: z.nativeEnum(IssuePriority).optional(),
  severity: z.nativeEnum(IssueSeverity).optional(),
  labels: z.array(z.string()).optional(),
  assigneeIds: z.array(z.string()).optional(),
  repositoryId: z.string().uuid().optional().nullable(),
  prUrl: z.string().url().optional().nullable(),
  branch: z.string().optional().nullable(),
  commitHash: z.string().optional().nullable(),
  bugDetails: BugTemplateDataSchema.optional().nullable()
});

export type UpdateIssueDto = z.infer<typeof UpdateIssueSchema>;

export const IssueFilterSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  search: z.string().optional(),
  type: z.nativeEnum(IssueType).optional(),
  status: z.nativeEnum(IssueStatus).or(z.array(z.nativeEnum(IssueStatus))).optional(),
  priority: z.nativeEnum(IssuePriority).or(z.array(z.nativeEnum(IssuePriority))).optional(),
  severity: z.nativeEnum(IssueSeverity).or(z.array(z.nativeEnum(IssueSeverity))).optional(),
  authorId: z.string().optional(),
  assigneeId: z.string().optional(),
  repositoryId: z.string().optional(),
  label: z.string().optional(),
  sortBy: z.enum(['newest', 'oldest', 'updated', 'priority', 'severity', 'comments']).default('newest'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25)
});

export type IssueFilterDto = z.infer<typeof IssueFilterSchema>;

export interface IssueLabelDto {
  id: string;
  name: string;
  color: string;
  description?: string | null;
}

export interface IssueDetailDto {
  id: string;
  workspaceId?: string | null;
  projectId?: string | null;
  number: number;
  title: string;
  description: string;
  type: IssueType;
  status: IssueStatus;
  priority: IssuePriority;
  severity: IssueSeverity;
  isDeleted?: boolean;
  author: UserSummaryDto;
  assignees: UserSummaryDto[];
  labels: IssueLabelDto[];
  repository?: RepositorySummaryDto | null;
  pullRequest?: PullRequestSummaryDto | null;
  branch?: string | null;
  commitHash?: string | null;
  bugDetails?: BugTemplateData | null;
  commentsCount: number;
  isWatching?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type IssueDto = IssueDetailDto;

