import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  boolean,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { repositories, pullRequests } from "./github.js";
import { workspaces } from "./workspaces.js";
import { projects } from "./projects.js";
import {
  IssuePriority,
  IssueSeverity,
  IssueStatus,
  IssueType,
} from "@reported/contracts";

export const labels = pgTable("labels", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#58a6ff"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const issues = pgTable(
  "issues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    type: text("type").notNull().default(IssueType.BUG),
    status: text("status").notNull().default(IssueStatus.OPEN),
    priority: text("priority").notNull().default(IssuePriority.P2),
    severity: text("severity").notNull().default(IssueSeverity.MAJOR),
    environment: text("environment"),
    precondition: text("precondition"),
    stepsToReproduce: text("steps_to_reproduce"),
    actualResult: text("actual_result"),
    expectedResult: text("expected_result"),
    frequency: text("frequency"),
    evidenceJsonOrLogs: text("evidence_json_or_logs"),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    repositoryId: uuid("repository_id").references(() => repositories.id),
    pullRequestId: uuid("pull_request_id").references(() => pullRequests.id),
    branch: text("branch"),
    commitHash: text("commit_hash"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_issues_workspace").on(table.workspaceId),
    index("idx_issues_project").on(table.projectId),
    index("idx_issues_status").on(table.status),
    index("idx_issues_priority").on(table.priority),
    index("idx_issues_severity").on(table.severity),
    index("idx_issues_author").on(table.authorId),
    index("idx_issues_created").on(table.createdAt),
  ],
);

export const issueAssignees = pgTable(
  "issue_assignees",
  {
    issueId: uuid("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.issueId, table.userId] })],
);

export const issueLabels = pgTable(
  "issue_labels",
  {
    issueId: uuid("issue_id")
      .notNull()
      .references(() => issues.id, { onDelete: "cascade" }),
    labelId: uuid("label_id")
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.issueId, table.labelId] })],
);
