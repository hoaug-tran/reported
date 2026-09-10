import { z } from "zod";
import { WorkspaceRole, ProjectRole } from "./enums.js";

export interface WorkspaceSummaryDto {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  avatarUrl?: string | null;
  ownerId: string;
  role: WorkspaceRole;
  membersCount?: number;
  projectsCount?: number;
  createdAt: string;
}

export interface WorkspaceMemberDto {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  email: string;
  avatarUrl?: string | null;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface ProjectDto {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  key: string;
  description?: string | null;
  createdAt: string;
  issuesCount?: number;
  reviewsCount?: number;
}

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(2).max(50),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().max(250).optional(),
});

export type CreateWorkspaceDto = z.infer<typeof CreateWorkspaceSchema>;

export const UpdateWorkspaceSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  description: z.string().max(250).optional(),
  avatarUrl: z.string().url().or(z.literal("")).optional(),
});

export type UpdateWorkspaceDto = z.infer<typeof UpdateWorkspaceSchema>;

export const CreateProjectSchema = z.object({
  name: z.string().min(2).max(50),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  key: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[A-Z0-9]+$/),
  description: z.string().max(250).optional(),
});

export type CreateProjectDto = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  key: z
    .string()
    .min(2)
    .max(10)
    .regex(/^[A-Z0-9]+$/)
    .optional(),
  description: z.string().max(250).optional(),
});

export type UpdateProjectDto = z.infer<typeof UpdateProjectSchema>;

export const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(WorkspaceRole).default(WorkspaceRole.MEMBER),
});

export type InviteMemberDto = z.infer<typeof InviteMemberSchema>;

export const UpdateMemberRoleSchema = z.object({
  role: z.nativeEnum(WorkspaceRole),
});

export type UpdateMemberRoleDto = z.infer<typeof UpdateMemberRoleSchema>;
