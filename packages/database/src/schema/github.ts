import { pgTable, text, timestamp, uuid, boolean, integer, jsonb } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces.js';
import { projects } from './projects.js';

export const repositories = pgTable('repositories', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'set null' }),
  owner: text('owner').notNull(),
  name: text('name').notNull(),
  fullName: text('full_name').notNull().unique(),
  provider: text('provider').notNull().default('github'),
  webUrl: text('web_url'),
  isPrivate: boolean('is_private').notNull().default(false),
  defaultBranch: text('default_branch').notNull().default('main'),
  githubId: integer('github_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const pullRequests = pgTable('pull_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  repositoryId: uuid('repository_id').notNull().references(() => repositories.id, { onDelete: 'cascade' }),
  prNumber: integer('pr_number').notNull(),
  title: text('title').notNull(),
  state: text('state').notNull().default('OPEN'),
  isMerged: boolean('is_merged').notNull().default(false),
  headBranch: text('head_branch').notNull(),
  baseBranch: text('base_branch').notNull(),
  authorGithub: text('author_github').notNull(),
  checksStatus: text('checks_status').notNull().default('PASSING'),
  reviewStatus: text('review_status').notNull().default('CHANGES_REQUESTED'),
  rawMetadata: jsonb('raw_metadata'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});

