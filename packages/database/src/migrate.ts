import { pool } from "./db.js";

export async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        display_name TEXT NOT NULL,
        avatar_url TEXT,
        bio TEXT,
        github_username TEXT,
        role TEXT NOT NULL DEFAULT 'USER',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT;

      CREATE TABLE IF NOT EXISTS passkeys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        credential_id TEXT NOT NULL UNIQUE,
        public_key TEXT NOT NULL,
        counter INTEGER NOT NULL DEFAULT 0,
        device_type TEXT,
        transports JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_used_at TIMESTAMPTZ
      );

      CREATE INDEX IF NOT EXISTS idx_passkeys_user ON passkeys (user_id);

      CREATE TABLE IF NOT EXISTS auth_challenges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        target TEXT NOT NULL,
        challenge_type TEXT NOT NULL,
        code TEXT NOT NULL,
        metadata JSONB,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_auth_challenges_target ON auth_challenges (target, challenge_type);

      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS external_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        provider_account_id TEXT NOT NULL,
        username TEXT,
        email TEXT,
        display_name TEXT,
        avatar_url TEXT,
        access_token_encrypted TEXT,
        refresh_token_encrypted TEXT,
        token_expires_at TIMESTAMPTZ,
        scopes JSONB DEFAULT '[]'::jsonb,
        connection_type TEXT NOT NULL DEFAULT 'BOTH',
        health_status TEXT NOT NULL DEFAULT 'HEALTHY',
        last_synced_at TIMESTAMPTZ,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_external_provider_account UNIQUE (provider, provider_account_id)
      );

      CREATE INDEX IF NOT EXISTS idx_external_accounts_user ON external_accounts (user_id);

      CREATE TABLE IF NOT EXISTS workspaces (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        description TEXT,
        avatar_url TEXT,
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS workspace_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'MEMBER',
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
        CONSTRAINT uq_workspace_user UNIQUE (workspace_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members (user_id);

      CREATE TABLE IF NOT EXISTS invitations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'MEMBER',
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        accepted_at TIMESTAMPTZ,
        createdAt TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        key TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_workspace_project_slug UNIQUE (workspace_id, slug),
        CONSTRAINT uq_workspace_project_key UNIQUE (workspace_id, key)
      );

      CREATE TABLE IF NOT EXISTS project_members (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'CONTRIBUTOR',
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT uq_project_user UNIQUE (project_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS repositories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
        project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
        owner TEXT NOT NULL,
        name TEXT NOT NULL,
        full_name TEXT NOT NULL UNIQUE,
        provider TEXT NOT NULL DEFAULT 'github',
        web_url TEXT,
        is_private BOOLEAN NOT NULL DEFAULT false,
        default_branch TEXT NOT NULL DEFAULT 'main',
        github_id INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE repositories ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
      ALTER TABLE repositories ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
      ALTER TABLE repositories ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'github';
      ALTER TABLE repositories ADD COLUMN IF NOT EXISTS web_url TEXT;

      CREATE TABLE IF NOT EXISTS pull_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        repository_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
        pr_number INTEGER NOT NULL,
        title TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'OPEN',
        is_merged BOOLEAN NOT NULL DEFAULT false,
        head_branch TEXT NOT NULL,
        base_branch TEXT NOT NULL,
        author_github TEXT NOT NULL,
        checks_status TEXT NOT NULL DEFAULT 'PASSING',
        review_status TEXT NOT NULL DEFAULT 'CHANGES_REQUESTED',
        raw_metadata JSONB,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS labels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL DEFAULT '#58a6ff',
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS issues (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
        project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
        number INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'BUG',
        status TEXT NOT NULL DEFAULT 'OPEN',
        priority TEXT NOT NULL DEFAULT 'P2',
        severity TEXT NOT NULL DEFAULT 'MAJOR',
        environment TEXT,
        precondition TEXT,
        steps_to_reproduce TEXT,
        actual_result TEXT,
        expected_result TEXT,
        frequency TEXT,
        evidence_json_or_logs TEXT,
        author_id UUID NOT NULL REFERENCES users(id),
        repository_id UUID REFERENCES repositories(id),
        pull_request_id UUID REFERENCES pull_requests(id),
        branch TEXT,
        commit_hash TEXT,
        is_deleted BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE issues ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
      ALTER TABLE issues ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

      CREATE TABLE IF NOT EXISTS issue_assignees (
        issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (issue_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS issue_labels (
        issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
        label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (issue_id, label_id)
      );

      CREATE TABLE IF NOT EXISTS review_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
        project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
        number INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        review_type TEXT NOT NULL DEFAULT 'CODE',
        status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
        deadline TIMESTAMPTZ,
        repository_id UUID REFERENCES repositories(id),
        pull_request_id UUID REFERENCES pull_requests(id),
        branch TEXT,
        commit_hash TEXT,
        author_id UUID NOT NULL REFERENCES users(id),
        review_result TEXT,
        is_deleted BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
      ALTER TABLE review_requests ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE SET NULL;

      CREATE TABLE IF NOT EXISTS review_reviewers (
        review_id UUID NOT NULL REFERENCES review_requests(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status TEXT NOT NULL DEFAULT 'PENDING',
        decision_note TEXT,
        reviewed_at TIMESTAMPTZ,
        PRIMARY KEY (review_id, user_id)
      );

      ALTER TABLE review_reviewers ADD COLUMN IF NOT EXISTS acknowledgement_status TEXT;
      ALTER TABLE review_reviewers ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;

      CREATE TABLE IF NOT EXISTS review_labels (
        review_id UUID NOT NULL REFERENCES review_requests(id) ON DELETE CASCADE,
        label_id UUID NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (review_id, label_id)
      );

      CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        target_type TEXT NOT NULL DEFAULT 'ISSUE',
        target_id UUID NOT NULL,
        author_id UUID NOT NULL REFERENCES users(id),
        parent_id UUID,
        content TEXT NOT NULL,
        is_deleted BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS comment_reactions (
        comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reaction TEXT NOT NULL DEFAULT 'LIKE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (comment_id, user_id, reaction)
      );

      CREATE TABLE IF NOT EXISTS mentions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        target_type TEXT NOT NULL,
        target_id UUID NOT NULL,
        comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        mentioned_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS watchers (
        target_type TEXT NOT NULL,
        target_id UUID NOT NULL,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (target_type, target_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        link TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT false,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notification_preferences (
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_type TEXT NOT NULL,
        channel TEXT NOT NULL DEFAULT 'BOTH',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, event_type)
      );

      CREATE TABLE IF NOT EXISTS activities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
        target_type TEXT NOT NULL,
        target_id UUID NOT NULL,
        actor_id UUID NOT NULL REFERENCES users(id),
        action_type TEXT NOT NULL,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE activities ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

      CREATE TABLE IF NOT EXISTS saved_views (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        target_type TEXT NOT NULL,
        filter_state JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
        actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action TEXT NOT NULL,
        target_resource TEXT NOT NULL,
        details JSONB,
        ip_address TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

      CREATE TABLE IF NOT EXISTS outbox_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type TEXT NOT NULL,
        payload JSONB NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        attempts INTEGER NOT NULL DEFAULT 0,
        error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        processed_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS email_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        outbox_event_id UUID REFERENCES outbox_events(id) ON DELETE SET NULL,
        recipient_email TEXT NOT NULL,
        recipient_name TEXT NOT NULL,
        subject TEXT NOT NULL,
        template TEXT NOT NULL,
        html_body TEXT NOT NULL,
        text_body TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'QUEUED',
        error TEXT,
        sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS attachments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        file_path TEXT NOT NULL,
        uploaded_by UUID NOT NULL REFERENCES users(id),
        target_type TEXT,
        target_id UUID,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_issues_workspace ON issues (workspace_id);
      CREATE INDEX IF NOT EXISTS idx_issues_project ON issues (project_id);
      CREATE INDEX IF NOT EXISTS idx_issues_status ON issues (status);
      CREATE INDEX IF NOT EXISTS idx_issues_priority ON issues (priority);
      CREATE INDEX IF NOT EXISTS idx_issues_severity ON issues (severity);
      CREATE INDEX IF NOT EXISTS idx_issues_author ON issues (author_id);
      CREATE INDEX IF NOT EXISTS idx_issues_created ON issues (created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_reviews_workspace ON review_requests (workspace_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_status ON review_requests (status);
      CREATE INDEX IF NOT EXISTS idx_comments_target ON comments (target_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_id, is_read);
      CREATE INDEX IF NOT EXISTS idx_outbox_status_created ON outbox_events (status, created_at);
      CREATE INDEX IF NOT EXISTS idx_email_jobs_status ON email_jobs (status, created_at);

      UPDATE review_requests SET status = 'PENDING_REVIEW' WHERE status = 'PENDING';
    `);
  } finally {
    client.release();
  }
}

if (
  process.argv[1]?.endsWith("migrate.ts") ||
  process.argv[1]?.endsWith("migrate.js")
) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
