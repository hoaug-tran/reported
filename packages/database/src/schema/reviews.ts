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
import { labels } from "./issues.js";
import {
  ReviewerDecision,
  ReviewStatus,
  ReviewType,
} from "@reported/contracts";

export const reviewRequests = pgTable(
  "review_requests",
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
    reviewType: text("review_type").notNull().default(ReviewType.CODE),
    status: text("status").notNull().default(ReviewStatus.PENDING_REVIEW),
    deadline: timestamp("deadline", { withTimezone: true }),
    repositoryId: uuid("repository_id").references(() => repositories.id),
    pullRequestId: uuid("pull_request_id").references(() => pullRequests.id),
    branch: text("branch"),
    commitHash: text("commit_hash"),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    reviewResult: text("review_result"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_reviews_workspace").on(table.workspaceId),
    index("idx_reviews_project").on(table.projectId),
    index("idx_reviews_status").on(table.status),
    index("idx_reviews_type").on(table.reviewType),
    index("idx_reviews_author").on(table.authorId),
    index("idx_reviews_created").on(table.createdAt),
  ],
);

export const reviewReviewers = pgTable(
  "review_reviewers",
  {
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviewRequests.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default(ReviewerDecision.PENDING),
    decisionNote: text("decision_note"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    acknowledgementStatus: text("acknowledgement_status"),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  },
  (table) => [primaryKey({ columns: [table.reviewId, table.userId] })],
);

export const reviewLabels = pgTable(
  "review_labels",
  {
    reviewId: uuid("review_id")
      .notNull()
      .references(() => reviewRequests.id, { onDelete: "cascade" }),
    labelId: uuid("label_id")
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.reviewId, table.labelId] })],
);
