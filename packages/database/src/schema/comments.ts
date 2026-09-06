import { pgTable, text, timestamp, uuid, boolean, index, primaryKey } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { ReactionType, TargetType } from '@reported/contracts';

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetType: text('target_type').notNull().default(TargetType.ISSUE),
  targetId: uuid('target_id').notNull(),
  authorId: uuid('author_id').notNull().references(() => users.id),
  parentId: uuid('parent_id'),
  content: text('content').notNull(),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index('idx_comments_target').on(table.targetType, table.targetId),
  index('idx_comments_parent').on(table.parentId)
]);

export const commentReactions = pgTable('comment_reactions', {
  commentId: uuid('comment_id').notNull().references(() => comments.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  reaction: text('reaction').notNull().default(ReactionType.LIKE),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  primaryKey({ columns: [table.commentId, table.userId, table.reaction] })
]);

export const mentions = pgTable('mentions', {
  id: uuid('id').primaryKey().defaultRandom(),
  targetType: text('target_type').notNull(),
  targetId: uuid('target_id').notNull(),
  commentId: uuid('comment_id').references(() => comments.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  mentionedBy: uuid('mentioned_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index('idx_mentions_user').on(table.userId)
]);

