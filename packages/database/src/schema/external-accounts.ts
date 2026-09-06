import { pgTable, text, timestamp, uuid, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const externalAccounts = pgTable('external_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  username: text('username'),
  email: text('email'),
  displayName: text('display_name'),
  avatarUrl: text('avatar_url'),
  accessTokenEncrypted: text('access_token_encrypted'),
  refreshTokenEncrypted: text('refresh_token_encrypted'),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  scopes: jsonb('scopes').default([]),
  connectionType: text('connection_type').notNull().default('BOTH'),
  healthStatus: text('health_status').notNull().default('HEALTHY'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => {
  return {
    providerAccountIdx: uniqueIndex('provider_account_unique_idx').on(table.provider, table.providerAccountId)
  };
});

