import { db, pool } from './db.js';
import {
  users, workspaces, workspaceMembers, projects, projectMembers, repositories, pullRequests,
  labels, issues, issueAssignees, issueLabels, reviewRequests, reviewReviewers, reviewLabels,
  comments, commentReactions, mentions, activities, notifications, notificationPreferences,
  watchers, outboxEvents, emailJobs, savedViews, externalAccounts, sessions, auditLogs
} from './schema/index.js';
import {
  UserRole, WorkspaceRole, ProjectRole
} from '@reported/contracts';
import crypto from 'crypto';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function hashPassword(password: string): string {
  const salt = 'reported_static_seed_salt_2026';
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export async function seed(): Promise<void> {
  try {
    await db.execute(sql`TRUNCATE TABLE users, workspaces, workspace_members, projects, project_members, repositories, pull_requests, labels, issues, issue_assignees, issue_labels, review_requests, review_reviewers, review_labels, comments, comment_reactions, mentions, activities, notifications, notification_preferences, watchers, outbox_events, email_jobs, saved_views, external_accounts, sessions, audit_logs CASCADE;`);

    const adminUsername = process.env.DEFAULT_ADMIN_USER || 'hoaug';
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'hoaug@reported.dev';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Password123!';
    const defaultPasswordHash = hashPassword(adminPassword);

    const [adminUser] = await db.insert(users).values({
      username: adminUsername,
      email: adminEmail,
      displayName: 'Hoang Nguyen',
      passwordHash: defaultPasswordHash,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${adminUsername}`,
      bio: 'Core Platform Lead & System Architect',
      githubUsername: adminUsername,
      role: UserRole.ADMIN
    }).returning();

    const [workspace] = await db.insert(workspaces).values({
      name: 'EngWithMe',
      slug: 'engwithme',
      description: 'Engineering collaboration workspace for core platform, web apps, and infrastructure.',
      ownerId: adminUser.id
    }).returning();

    await db.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId: adminUser.id,
      role: WorkspaceRole.OWNER
    });

    const [projBe, projFe, projInfra] = await db.insert(projects).values([
      {
        workspaceId: workspace.id,
        name: 'Backend Platform',
        key: 'BE',
        slug: 'backend',
        description: 'Core microservices, GraphQL gateways, and event bus.'
      },
      {
        workspaceId: workspace.id,
        name: 'Web Client',
        key: 'FE',
        slug: 'frontend',
        description: 'Single page application, design system, and client tooling.'
      },
      {
        workspaceId: workspace.id,
        name: 'Infrastructure',
        key: 'INFRA',
        slug: 'infra',
        description: 'Kubernetes operators, Terraform modules, and CI/CD pipelines.'
      }
    ]).returning();

    await db.insert(projectMembers).values([
      { projectId: projBe.id, userId: adminUser.id, role: ProjectRole.MAINTAINER },
      { projectId: projFe.id, userId: adminUser.id, role: ProjectRole.MAINTAINER },
      { projectId: projInfra.id, userId: adminUser.id, role: ProjectRole.MAINTAINER }
    ]);

    await db.insert(labels).values([
      { name: 'bug', color: '#d73a4a', description: 'Something isn\'t working' },
      { name: 'feature', color: '#a2eeef', description: 'New feature or enhancement' },
      { name: 'documentation', color: '#0075ca', description: 'Improvements or additions to documentation' },
      { name: 'enhancement', color: '#a2eeef', description: 'New feature or request' },
      { name: 'security', color: '#e11d48', description: 'Security advisory or vulnerability' },
      { name: 'frontend', color: '#3b82f6', description: 'UI, components, and client logic' },
      { name: 'backend', color: '#10b981', description: 'API, database, and background workers' },
      { name: 'infrastructure', color: '#8b5cf6', description: 'Docker, K8s, and cloud architecture' }
    ]);

    const eventTypes = [
      'ASSIGNED',
      'REVIEW_REQUESTED',
      'MENTIONED',
      'STATUS_CHANGED',
      'NEW_COMMENT'
    ];

    await db.insert(notificationPreferences).values(
      eventTypes.map((eventType) => ({
        userId: adminUser.id,
        eventType,
        channel: 'BOTH'
      }))
    );
  } catch (error: unknown) {
    throw error;
  }
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seed()
    .then(() => {
      pool.end();
      process.exit(0);
    })
    .catch(() => {
      pool.end();
      process.exit(1);
    });
}
