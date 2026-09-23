import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { ReactionType, TargetType } from "@reported/contracts";

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetType: text("target_type").notNull().default(TargetType.ISSUE),
    targetId: uuid("target_id").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    parentId: uuid("parent_id"),
    content: text("content").notNull(),
    isDeleted: boolean("is_deleted").notNull().default(false),
    isHidden: boolean("is_hidden").notNull().default(false),
    hiddenReason: text("hidden_reason"),
    hiddenBy: uuid("hidden_by").references(() => users.id, { onDelete: "set null" }),
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_comments_target").on(table.targetType, table.targetId),
    index("idx_comments_parent").on(table.parentId),
  ],
);

export const commentEdits = pgTable(
  "comment_edits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    editorId: uuid("editor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    previousContent: text("previous_content").notNull(),
    newContent: text("new_content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_comment_edits_comment").on(table.commentId)],
);

export const commentReactions = pgTable(
  "comment_reactions",
  {
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reaction: text("reaction").notNull().default(ReactionType.LIKE),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.commentId, table.userId, table.reaction] }),
  ],
);

export const mentions = pgTable(
  "mentions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    commentId: uuid("comment_id").references(() => comments.id, {
      onDelete: "cascade",
    }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mentionedBy: uuid("mentioned_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_mentions_user").on(table.userId)],
);
