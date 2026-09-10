import {
  pgTable,
  text,
  timestamp,
  uuid,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    status: text("status").notNull().default("PENDING"),
    attempts: integer("attempts").notNull().default(0),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (table) => [
    index("idx_outbox_status_created").on(table.status, table.createdAt),
  ],
);

export const emailJobs = pgTable(
  "email_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    outboxEventId: uuid("outbox_event_id").references(() => outboxEvents.id, {
      onDelete: "set null",
    }),
    recipientEmail: text("recipient_email").notNull(),
    recipientName: text("recipient_name").notNull(),
    subject: text("subject").notNull(),
    template: text("template").notNull(),
    htmlBody: text("html_body").notNull(),
    textBody: text("text_body").notNull(),
    status: text("status").notNull().default("QUEUED"),
    error: text("error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("idx_email_jobs_status").on(table.status, table.createdAt)],
);

export const attachments = pgTable("attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  filePath: text("file_path").notNull(),
  uploadedBy: uuid("uploaded_by")
    .notNull()
    .references(() => users.id),
  targetType: text("target_type"),
  targetId: uuid("target_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
