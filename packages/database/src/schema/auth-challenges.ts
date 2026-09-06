import { pgTable, text, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';

export const authChallenges = pgTable('auth_challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  target: text('target').notNull(),
  challengeType: text('challenge_type').notNull(),
  code: text('code').notNull(),
  metadata: jsonb('metadata'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});
