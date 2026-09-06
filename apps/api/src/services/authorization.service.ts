import { db, workspaceMembers, projectMembers, eq, and } from '@reported/database';
import { WorkspaceRole, ProjectRole } from '@reported/contracts';
import { AppError } from '../middleware/error.js';

export type Permission =
  | 'workspace.manage'
  | 'workspace.delete'
  | 'workspace.transfer'
  | 'workspace.member.invite'
  | 'workspace.member.remove'
  | 'workspace.member.role'
  | 'workspace.settings.update'
  | 'project.create'
  | 'project.update'
  | 'project.delete'
  | 'project.archive'
  | 'issue.create'
  | 'issue.update'
  | 'issue.assign'
  | 'issue.close'
  | 'issue.delete'
  | 'review.create'
  | 'review.assign'
  | 'review.approve'
  | 'repository.link'
  | 'repository.unlink'
  | 'integration.manage';

const WORKSPACE_ROLE_PERMISSIONS: Record<WorkspaceRole, Permission[]> = {
  [WorkspaceRole.OWNER]: [
    'workspace.manage',
    'workspace.delete',
    'workspace.transfer',
    'workspace.member.invite',
    'workspace.member.remove',
    'workspace.member.role',
    'workspace.settings.update',
    'project.create',
    'project.update',
    'project.delete',
    'project.archive',
    'issue.create',
    'issue.update',
    'issue.assign',
    'issue.close',
    'issue.delete',
    'review.create',
    'review.assign',
    'review.approve',
    'repository.link',
    'repository.unlink',
    'integration.manage'
  ],
  [WorkspaceRole.ADMIN]: [
    'workspace.member.invite',
    'workspace.member.remove',
    'workspace.member.role',
    'workspace.settings.update',
    'project.create',
    'project.update',
    'project.delete',
    'project.archive',
    'issue.create',
    'issue.update',
    'issue.assign',
    'issue.close',
    'issue.delete',
    'review.create',
    'review.assign',
    'review.approve',
    'repository.link',
    'repository.unlink',
    'integration.manage'
  ],
  [WorkspaceRole.MEMBER]: [
    'project.create',
    'issue.create',
    'issue.update',
    'issue.assign',
    'issue.close',
    'review.create',
    'review.assign',
    'review.approve',
    'repository.link'
  ],
  [WorkspaceRole.GUEST]: [
    'issue.create',
    'review.create'
  ]
};

export class AuthorizationService {
  async getWorkspaceMember(userId: string, workspaceId: string) {
    return await db.query.workspaceMembers.findFirst({
      where: and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId)
      )
    });
  }

  async can(
    userId: string,
    workspaceId: string,
    permission: Permission,
    context?: { projectId?: string; authorId?: string }
  ): Promise<boolean> {
    const member = await this.getWorkspaceMember(userId, workspaceId);
    if (!member) {
      return false;
    }

    const wsRole = member.role as WorkspaceRole;
    const permissions = WORKSPACE_ROLE_PERMISSIONS[wsRole] || [];

    if (permissions.includes(permission)) {
      return true;
    }

    if (context?.authorId && context.authorId === userId) {
      if (permission === 'issue.update' || permission === 'issue.close') {
        return true;
      }
    }

    if (context?.projectId) {
      const pMember = await db.query.projectMembers.findFirst({
        where: and(
          eq(projectMembers.projectId, context.projectId),
          eq(projectMembers.userId, userId)
        )
      });
      if (pMember) {
        const pRole = pMember.role as ProjectRole;
        if (pRole === ProjectRole.MAINTAINER) {
          if (
            permission === 'issue.create' ||
            permission === 'issue.update' ||
            permission === 'issue.assign' ||
            permission === 'issue.close' ||
            permission === 'review.create' ||
            permission === 'review.assign' ||
            permission === 'review.approve' ||
            permission === 'repository.link'
          ) {
            return true;
          }
        } else if (pRole === ProjectRole.CONTRIBUTOR) {
          if (permission === 'issue.create' || permission === 'review.create') {
            return true;
          }
        }
      }
    }

    return false;
  }

  async assertCan(
    userId: string,
    workspaceId: string,
    permission: Permission,
    context?: { projectId?: string; authorId?: string }
  ): Promise<void> {
    const allowed = await this.can(userId, workspaceId, permission, context);
    if (!allowed) {
      throw new AppError(403, 'FORBIDDEN', `You do not have permission '${permission}' in this workspace.`);
    }
  }
}

export const authorization = new AuthorizationService();

