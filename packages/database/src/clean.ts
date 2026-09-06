import { db, pool } from './db.js';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export async function cleanDatabase(): Promise<void> {
  try {
    await db.execute(sql`
      TRUNCATE TABLE 
        users, 
        workspaces, 
        workspace_members, 
        projects, 
        project_members, 
        repositories, 
        pull_requests, 
        labels, 
        issues, 
        issue_assignees, 
        issue_labels, 
        review_requests, 
        review_reviewers, 
        review_labels, 
        comments, 
        comment_reactions, 
        mentions, 
        activities, 
        notifications, 
        notification_preferences, 
        watchers, 
        outbox_events, 
        email_jobs, 
        saved_views, 
        external_accounts, 
        sessions, 
        audit_logs,
        passkeys,
        auth_challenges
      CASCADE;
    `);
    console.log('Clean database: All mock and test data successfully wiped.');
  } catch (err) {
    console.error('Failed to clean database:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cleanDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
