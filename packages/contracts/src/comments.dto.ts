import { z } from "zod";
import { CommentHideReason, ReactionType, TargetType } from "./enums.js";
import { UserSummaryDto } from "./auth.dto.js";

export const CreateCommentSchema = z.object({
  targetType: z.nativeEnum(TargetType),
  targetId: z.string().uuid(),
  parentId: z.string().uuid().optional().nullable(),
  content: z.string().min(1, "Comment content cannot be empty"),
});

export type CreateCommentDto = z.infer<typeof CreateCommentSchema>;

export const UpdateCommentSchema = z.object({
  content: z.string().min(1, "Comment content cannot be empty"),
});

export type UpdateCommentDto = z.infer<typeof UpdateCommentSchema>;

export const UpdateCommentVisibilitySchema = z
  .object({
    hidden: z.boolean(),
    reason: z.nativeEnum(CommentHideReason).optional(),
  })
  .refine((value) => !value.hidden || Boolean(value.reason), {
    message: "A reason is required when hiding a comment",
    path: ["reason"],
  });

export type UpdateCommentVisibilityDto = z.infer<typeof UpdateCommentVisibilitySchema>;

export const ToggleReactionSchema = z.object({
  reaction: z.union([z.nativeEnum(ReactionType), z.string().min(1).max(32)]),
});

export type ToggleReactionDto = z.infer<typeof ToggleReactionSchema>;

export interface ReactionSummaryDto {
  reaction: ReactionType | string;
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
  isHidden?: boolean;
  hiddenReason?: CommentHideReason | null;
  author: UserSummaryDto;
  reactions: ReactionSummaryDto[];
  replies?: CommentDto[];
  createdAt: string;
  updatedAt: string;
  editedAt?: string | null;
  isEdited?: boolean;
}

export interface CommentEditHistoryDto {
  id: string;
  commentId: string;
  editor: UserSummaryDto;
  previousContent: string;
  newContent: string;
  createdAt: string;
}
