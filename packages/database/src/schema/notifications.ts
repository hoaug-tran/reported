import { pgTable, text, timestamp, uuid, boolean, primaryKey, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { NotificationChannel, NotificationType } from '@reported/contracts';

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  link: text('link').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  index('idx_notifications_user_read').on(table.userId, table.isRead),
  index('idx_notifications_user_created').on(table.userId, table.createdAt)
]);

export const notificationPreferences = pgTable('notification_preferences', {
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  eventType: text('event_type').notNull(),
  channel: text('channel').notNull().default(NotificationChannel.BOTH),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => [
  primaryKey({ columns: [table.userId, table.eventType] })
]);

