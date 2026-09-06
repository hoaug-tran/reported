import { z } from 'zod';
import { ReviewerDecision, ReviewStatus, ReviewType } from './enums.js';
import { UserSummaryDto } from './auth.dto.js';
import { PullRequestSummaryDto, RepositorySummaryDto } from './github.dto.js';
import { IssueLabelDto } from './issues.dto.js';

export const CreateReviewSchema = z.object({
  workspaceId: z.string().uuid().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  title: z.string().min(3).max(200),
  description: z.string().min(1, 'Review objectives and scope are required'),
  reviewType: z.nativeEnum(ReviewType).default(ReviewType.CODE),
  deadline: z.string().datetime().optional().nullable(),
  repositoryId: z.string().uuid().optional().nullable(),
  prUrl: z.string().url().optional().nullable(),
  branch: z.string().optional().nullable(),
  commitHash: z.string().optional().nullable(),
  reviewerIds: z.array(z.string()).min(1, 'Please select at least one reviewer'),
  labels: z.array(z.string()).default([])
});

export type CreateReviewDto = z.infer<typeof CreateReviewSchema>;

export const UpdateReviewSchema = z.object({
  projectId: z.string().uuid().optional().nullable(),
  title: z.string().min(3).max(200).optional(),
  description: z.string().optional(),
  reviewType: z.nativeEnum(ReviewType).optional(),
  status: z.nativeEnum(ReviewStatus).optional(),
  deadline: z.string().datetime().optional().nullable(),
  repositoryId: z.string().uuid().optional().nullable(),
  prUrl: z.string().url().optional().nullable(),
  branch: z.string().optional().nullable(),
  commitHash: z.string().optional().nullable(),
  reviewerIds: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional()
});

export type UpdateReviewDto = z.infer<typeof UpdateReviewSchema>;

export const UpdateReviewDecisionSchema = z.object({
  decision: z.enum([
    ReviewerDecision.APPROVED,
    ReviewerDecision.CHANGES_REQUESTED,
    ReviewerDecision.COMMENTED
  ]),
  decisionNote: z.string().optional()
});

export type UpdateReviewDecisionDto = z.infer<typeof UpdateReviewDecisionSchema>;

export const UpdateAcknowledgementSchema = z.object({
  status: z.enum(['SEEN', 'CHECKING', 'REVIEWING', 'DONE'])
});

export type UpdateAcknowledgementDto = z.infer<typeof UpdateAcknowledgementSchema>;

export const ReviewFilterSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  search: z.string().optional(),
  reviewType: z.nativeEnum(ReviewType).optional(),
  status: z.nativeEnum(ReviewStatus).or(z.array(z.nativeEnum(ReviewStatus))).optional(),
  authorId: z.string().optional(),
  reviewerId: z.string().optional(),
  repositoryId: z.string().optional(),
  sortBy: z.enum(['newest', 'oldest', 'deadline', 'updated']).default('newest'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25)
});

export type ReviewFilterDto = z.infer<typeof ReviewFilterSchema>;

export interface ReviewerAssignmentDto {
  user: UserSummaryDto;
  status: ReviewerDecision;
  decisionNote?: string | null;
  reviewedAt?: string | null;
  acknowledgementStatus?: string | null;
  acknowledgedAt?: string | null;
}

export interface ReviewDetailDto {
  id: string;
  workspaceId?: string | null;
  projectId?: string | null;
  number: number;
  title: string;
  description: string;
  reviewType: ReviewType;
  status: ReviewStatus;
  deadline?: string | null;
  isDeleted?: boolean;
  author: UserSummaryDto;
  reviewers: ReviewerAssignmentDto[];
  labels: IssueLabelDto[];
  repository?: RepositorySummaryDto | null;
  pullRequest?: PullRequestSummaryDto | null;
  branch?: string | null;
  commitHash?: string | null;
  reviewResult?: string | null;
  commentsCount: number;
  isWatching?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ReviewDto = ReviewDetailDto;
