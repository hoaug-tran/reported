import { z } from 'zod';
import { ReactionType, TargetType } from './enums.js';
import { UserSummaryDto } from './auth.dto.js';

export const CreateCommentSchema = z.object({
  targetType: z.nativeEnum(TargetType),
  targetId: z.string().uuid(),
  parentId: z.string().uuid().optional().nullable(),
  content: z.string().min(1, 'Comment content cannot be empty')
});

export type CreateCommentDto = z.infer<typeof CreateCommentSchema>;

export const UpdateCommentSchema = z.object({
  content: z.string().min(1, 'Comment content cannot be empty')
});

export type UpdateCommentDto = z.infer<typeof UpdateCommentSchema>;

export const ToggleReactionSchema = z.object({
  reaction: z.nativeEnum(ReactionType)
});

export type ToggleReactionDto = z.infer<typeof ToggleReactionSchema>;

export interface ReactionSummaryDto {
  reaction: ReactionType;
  count: number;
  users: Array<{ id: string; username: string; displayName: string }>;
  hasReacted: boolean;
}

export interface CommentDto {
  id: string;
  targetType: TargetType;
  targetId: string;
  parentId?: string | null;
  content: string;
  isDeleted?: boolean;
  author: UserSummaryDto;
  reactions: ReactionSummaryDto[];
  replies?: CommentDto[];
  createdAt: string;
  updatedAt: string;
}

