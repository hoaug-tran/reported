import {
  db,
  outboxEvents,
  emailJobs,
  notifications,
  notificationPreferences,
  users,
  activities,
  comments,
  issueAssignees,
  reviewReviewers,
  watchers,
  eq,
  and,
  sql,
} from "@reported/database";
import {
  NotificationChannel,
  NotificationType,
  TargetType,
} from "@reported/contracts";
import { config } from "../config/index.js";
import { sendEmail } from "../services/email.service.js";

interface OutboxPayload {
  targetUserIds?: string[];
  assigneeIds?: string[];
  reviewerIds?: string[];
  actorId?: string;
  title?: string;
  message?: string;
  link?: string;
  targetType?: string;
  targetId?: string;
  issueNumber?: number;
  issueTitle?: string;
  reviewNumber?: number;
  reviewTitle?: string;
  targetAuthorId?: string;
  fromStatus?: string;
  toStatus?: string;
  authorId?: string;
  snippet?: string;
  parentId?: string | null;
  excludedUserIds?: string[];
  [key: string]: unknown;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function recordOutboxEvent(
  eventType: string,
  payload: Record<string, unknown>,
) {
  try {
    const [inserted] = await db
      .insert(outboxEvents)
      .values({
        eventType,
        payload,
        status: "PENDING",
      })
      .returning();
    return inserted;
  } catch (err) {
    console.error("Failed to record outbox event:", err);
  }
}

async function shouldSendEmail(
  userId: string,
  eventType: NotificationType,
): Promise<boolean> {
  const pref = await db.query.notificationPreferences.findFirst({
    where: and(
      eq(notificationPreferences.userId, userId),
      eq(notificationPreferences.eventType, eventType),
    ),
  });

  if (!pref) {
    return true;
  }

  return (
    pref.channel === NotificationChannel.EMAIL ||
    pref.channel === NotificationChannel.BOTH
  );
}

async function dispatchEmailJob({
  outboxEventId,
  recipientEmail,
  recipientName,
  subject,
  template,
  htmlBody,
  textBody,
}: {
  outboxEventId: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  template: string;
  htmlBody: string;
  textBody: string;
}) {
  const result = await sendEmail({
    to: recipientEmail,
    toName: recipientName,
    subject,
    html: htmlBody,
    text: textBody,
  });

  await db.insert(emailJobs).values({
    outboxEventId,
    recipientEmail,
    recipientName,
    subject,
    template,
    htmlBody,
    textBody,
    status: result.success
      ? result.mode === "smtp"
        ? "SENT"
        : "SIMULATED"
      : "FAILED",
    sentAt: result.success ? new Date() : null,
  });
}

export async function processOutboxEvents() {
  try {
    const pendingEvents = await db
      .select()
      .from(outboxEvents)
      .where(eq(outboxEvents.status, "PENDING"))
      .limit(20);

    for (const evt of pendingEvents) {
      try {
        const payload = (evt.payload || {}) as OutboxPayload;

        switch (evt.eventType) {
          case "USER_MENTIONED": {
            const {
              targetUserIds = [],
              actorId,
              title,
              message,
              link,
            } = payload;
            const actor = actorId
              ? await db.query.users.findFirst({ where: eq(users.id, actorId) })
              : null;

            for (const userId of targetUserIds) {
              if (userId === actorId) continue;
              const targetUser = await db.query.users.findFirst({
                where: eq(users.id, userId),
              });
              if (!targetUser) continue;

              await db.insert(notifications).values({
                userId,
                actorId,
                type: NotificationType.MENTIONED,
                title:
                  title || `${actor?.displayName || "Someone"} mentioned you`,
                message: message || "",
                link: link || "/",
              });

              if (await shouldSendEmail(userId, NotificationType.MENTIONED)) {
                await dispatchEmailJob({
                  outboxEventId: evt.id,
                  recipientEmail: targetUser.email,
                  recipientName: targetUser.displayName,
                  subject: `[Reported] ${actor?.displayName} mentioned you: ${title}`,
                  template: "user-mention",
                  htmlBody: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2328; line-height: 1.6;">
                      <h3 style="margin-bottom: 8px;">${actor?.displayName} mentioned you</h3>
                      <p style="margin-top: 0; color: #57606a;">${message}</p>
                      <p style="margin-top: 16px;">
                        <a href="${config.clientUrl}${link}" style="display: inline-block; background-color: #0969da; color: #ffffff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 500;">
                          View Discussion
                        </a>
                      </p>
                    </div>
                  `,
                  textBody: `${actor?.displayName} mentioned you: ${message}\n\nLink: ${config.clientUrl}${link}`,
                });
              }
            }
            break;
          }

          case "ISSUE_ASSIGNED": {
            const {
              assigneeIds = [],
              actorId,
              issueNumber,
              issueTitle,
              link,
            } = payload;
            const actor = actorId
              ? await db.query.users.findFirst({ where: eq(users.id, actorId) })
              : null;

            for (const userId of assigneeIds) {
              if (userId === actorId) continue;
              const targetUser = await db.query.users.findFirst({
                where: eq(users.id, userId),
              });
              if (!targetUser) continue;

              await db.insert(notifications).values({
                userId,
                actorId,
                type: NotificationType.ASSIGNED,
                title: `Assigned to Issue #${issueNumber}`,
                message: `${actor?.displayName || "Someone"} assigned you to "${issueTitle}"`,
                link: link || `/issues/${issueNumber}`,
              });

              if (await shouldSendEmail(userId, NotificationType.ASSIGNED)) {
                await dispatchEmailJob({
                  outboxEventId: evt.id,
                  recipientEmail: targetUser.email,
                  recipientName: targetUser.displayName,
                  subject: `[Reported] Assigned to #${issueNumber}: ${issueTitle}`,
                  template: "issue-assigned",
                  htmlBody: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2328; line-height: 1.6;">
                      <p><strong>${actor?.displayName}</strong> assigned you to <strong>#${issueNumber}: ${issueTitle}</strong>.</p>
                      <p><a href="${config.clientUrl}${link}" style="display: inline-block; background-color: #0969da; color: #ffffff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 500;">Open Issue</a></p>
                    </div>
                  `,
                  textBody: `You have been assigned to #${issueNumber}: ${issueTitle}\n\nLink: ${config.clientUrl}${link}`,
                });
              }
            }
            break;
          }

          case "REVIEW_REQUESTED": {
            const {
              reviewerIds = [],
              actorId,
              reviewNumber,
              reviewTitle,
              link,
            } = payload;
            const actor = actorId
              ? await db.query.users.findFirst({ where: eq(users.id, actorId) })
              : null;

            for (const userId of reviewerIds) {
              if (userId === actorId) continue;
              const targetUser = await db.query.users.findFirst({
                where: eq(users.id, userId),
              });
              if (!targetUser) continue;

              await db.insert(notifications).values({
                userId,
                actorId,
                type: NotificationType.REVIEW_REQUESTED,
                title: `Review Requested on #${reviewNumber}`,
                message: `${actor?.displayName || "Someone"} requested your review on "${reviewTitle}"`,
                link: link || `/reviews/${reviewNumber}`,
              });

              if (
                await shouldSendEmail(userId, NotificationType.REVIEW_REQUESTED)
              ) {
                await dispatchEmailJob({
                  outboxEventId: evt.id,
                  recipientEmail: targetUser.email,
                  recipientName: targetUser.displayName,
                  subject: `[Reported] Review requested on #${reviewNumber}: ${reviewTitle}`,
                  template: "review-requested",
                  htmlBody: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2328; line-height: 1.6;">
                      <p><strong>${actor?.displayName}</strong> requested your review on <strong>#${reviewNumber}: ${reviewTitle}</strong>.</p>
                      <p><a href="${config.clientUrl}${link}" style="display: inline-block; background-color: #0969da; color: #ffffff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 500;">Start Review</a></p>
                    </div>
                  `,
                  textBody: `Review requested on #${reviewNumber}: ${reviewTitle}\n\nLink: ${config.clientUrl}${link}`,
                });
              }
            }
            break;
          }

          case "COMMENT_CREATED": {
            const {
              targetAuthorId,
              actorId,
              title,
              snippet,
              link,
              targetType,
              targetId,
              parentId,
              excludedUserIds = [],
            } = payload;

            const recipientSet = new Set<string>();
            if (targetAuthorId) {
              recipientSet.add(targetAuthorId);
            }

            if (parentId) {
              const parentComment = await db.query.comments.findFirst({
                where: eq(comments.id, parentId),
              });
              if (parentComment?.authorId) {
                recipientSet.add(parentComment.authorId);
              }
            }

            if (targetType === TargetType.ISSUE && targetId) {
              const assignees = await db
                .select({ userId: issueAssignees.userId })
                .from(issueAssignees)
                .where(eq(issueAssignees.issueId, targetId));
              assignees.forEach((a) => recipientSet.add(a.userId));
            } else if (targetType === TargetType.REVIEW && targetId) {
              const reviewers = await db
                .select({ userId: reviewReviewers.userId })
                .from(reviewReviewers)
                .where(eq(reviewReviewers.reviewId, targetId));
              reviewers.forEach((r) => recipientSet.add(r.userId));
            }

            if (targetType && targetId) {
              const postWatchers = await db
                .select({ userId: watchers.userId })
                .from(watchers)
                .where(
                  and(
                    eq(watchers.targetType, targetType),
                    eq(watchers.targetId, targetId),
                  ),
                );
              postWatchers.forEach((w) => recipientSet.add(w.userId));
            }

            if (actorId) {
              recipientSet.delete(actorId);
            }
            for (const excludedUserId of excludedUserIds as string[]) {
              recipientSet.delete(excludedUserId);
            }

            const actor = actorId
              ? await db.query.users.findFirst({
                  where: eq(users.id, actorId),
                })
              : null;

            for (const userId of recipientSet) {
              const targetUser = await db.query.users.findFirst({
                where: eq(users.id, userId),
              });

              if (!targetUser) continue;

              await db.insert(notifications).values({
                userId,
                actorId,
                type: NotificationType.COMMENTED,
                title: `New comment on "${title}"`,
                message: `${actor?.displayName || "Someone"}: ${snippet}`,
                link: link || "/",
              });

              if (await shouldSendEmail(userId, NotificationType.COMMENTED)) {
                const safeActorName = escapeHtml(actor?.displayName || "Someone");
                const safeTitle = escapeHtml(String(title || "this discussion"));
                const safeSnippet = escapeHtml(String(snippet || "")).replace(/\n/g, "<br />");
                const commentUrl = `${config.clientUrl}${link || "/"}`;
                await dispatchEmailJob({
                  outboxEventId: evt.id,
                  recipientEmail: targetUser.email,
                  recipientName: targetUser.displayName,
                  subject: `[Reported] Bình luận mới: ${title || "Thảo luận"}`,
                  template: "new-comment",
                  htmlBody: `
                    <div style="max-width: 640px; margin: 0 auto; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #24292f; line-height: 1.6;">
                      <div style="padding: 14px 20px; background: #24292f; color: #ffffff; font-weight: 700;">Reported</div>
                      <div style="padding: 24px 20px; border: 1px solid #d0d7de; border-top: 0;">
                        <div style="font-size: 12px; color: #57606a; font-weight: 700; text-transform: uppercase; letter-spacing: .04em;">Bình luận mới</div>
                        <h2 style="margin: 6px 0 14px; font-size: 18px; line-height: 1.35;">${safeTitle}</h2>
                        <p style="margin: 0 0 12px;"><strong>${safeActorName}</strong> đã để lại bình luận:</p>
                        <blockquote style="margin: 0 0 20px; padding: 12px 14px; border-left: 4px solid #0969da; background: #f6f8fa; color: #57606a;">${safeSnippet}</blockquote>
                        <a href="${commentUrl}" style="display: inline-block; background-color: #0969da; color: #ffffff; padding: 9px 16px; border-radius: 6px; text-decoration: none; font-weight: 600;">Xem bình luận</a>
                      </div>
                    </div>
                  `,
                  textBody: `${actor?.displayName || "Ai đó"} đã bình luận trong ${title || "thảo luận"}:\n\n${snippet || ""}\n\nXem bình luận: ${commentUrl}`,
                });
              }
            }
            break;
          }

          case "ISSUE_STATUS_CHANGED": {
            const {
              issueNumber,
              issueTitle,
              fromStatus,
              toStatus,
              authorId,
              actorId,
              link,
            } = payload;
            if (authorId && authorId !== actorId) {
              const actor = actorId
                ? await db.query.users.findFirst({
                    where: eq(users.id, actorId),
                  })
                : null;
              const author = await db.query.users.findFirst({
                where: eq(users.id, authorId),
              });

              if (author) {
                await db.insert(notifications).values({
                  userId: authorId,
                  actorId,
                  type: NotificationType.ISSUE_STATUS_CHANGED,
                  title: `Issue #${issueNumber} status changed: ${fromStatus} → ${toStatus}`,
                  message: `${actor?.displayName} changed status to ${toStatus}`,
                  link: link || `/issues/${issueNumber}`,
                });

                if (
                  await shouldSendEmail(
                    authorId,
                    NotificationType.ISSUE_STATUS_CHANGED,
                  )
                ) {
                  await dispatchEmailJob({
                    outboxEventId: evt.id,
                    recipientEmail: author.email,
                    recipientName: author.displayName,
                    subject: `[Reported] #${issueNumber} status changed to ${toStatus}`,
                    template: "status-changed",
                    htmlBody: `
                      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2328; line-height: 1.6;">
                        <p><strong>${actor?.displayName}</strong> updated the status of <strong>#${issueNumber}: ${issueTitle}</strong> from <code>${fromStatus}</code> to <code>${toStatus}</code>.</p>
                        <p><a href="${config.clientUrl}${link}" style="display: inline-block; background-color: #0969da; color: #ffffff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 500;">View Issue</a></p>
                      </div>
                    `,
                    textBody: `Status updated on #${issueNumber}: ${issueTitle} -> ${toStatus}\n\nLink: ${config.clientUrl}${link}`,
                  });
                }
              }
            }
            break;
          }

          case "REVIEW_STATUS_CHANGED": {
            const {
              targetUserIds = [],
              reviewNumber,
              reviewTitle,
              fromStatus,
              toStatus,
              authorId,
              actorId,
              link,
            } = payload;
            const recipientIds = (
              (targetUserIds as string[]).length > 0
                ? (targetUserIds as string[])
                : authorId
                  ? [authorId as string]
                  : []
            ).filter((uid: string) => uid !== actorId);
            const actor = actorId
              ? await db.query.users.findFirst({
                  where: eq(users.id, actorId as string),
                })
              : null;

            for (const userId of recipientIds) {
              const targetUser = await db.query.users.findFirst({
                where: eq(users.id, userId),
              });
              if (!targetUser) continue;

              await db.insert(notifications).values({
                userId,
                actorId: actorId as string | undefined,
                type: NotificationType.REVIEW_STATUS_CHANGED,
                title: `Review #${reviewNumber} status: ${fromStatus} → ${toStatus}`,
                message: `${actor?.displayName || "Someone"} changed review status to ${toStatus}`,
                link: (link as string) || `/reviews/${reviewNumber}`,
              });

              if (
                await shouldSendEmail(
                  userId,
                  NotificationType.REVIEW_STATUS_CHANGED,
                )
              ) {
                await dispatchEmailJob({
                  outboxEventId: evt.id,
                  recipientEmail: targetUser.email,
                  recipientName: targetUser.displayName,
                  subject: `[Reported] Review #${reviewNumber} status changed to ${toStatus}`,
                  template: "status-changed",
                  htmlBody: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2328; line-height: 1.6;">
                      <p><strong>${actor?.displayName || "Someone"}</strong> updated the status of <strong>#${reviewNumber}: ${reviewTitle || ""}</strong> from <code>${fromStatus}</code> to <code>${toStatus}</code>.</p>
                      <p><a href="${config.clientUrl}${link}" style="display: inline-block; background-color: #0969da; color: #ffffff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 500;">View Review</a></p>
                    </div>
                  `,
                  textBody: `Review #${reviewNumber} status changed: ${fromStatus} -> ${toStatus}\n\nLink: ${config.clientUrl}${link}`,
                });
              }
            }
            break;
          }

          case "PR_UPDATED": {
            const {
              targetUserIds = [],
              actorId,
              prNumber,
              reviewNumber,
              reviewTitle,
              link,
            } = payload;
            const recipientIds = (targetUserIds as string[]).filter(
              (uid: string) => uid !== actorId,
            );
            const actor = actorId
              ? await db.query.users.findFirst({
                  where: eq(users.id, actorId as string),
                })
              : null;

            for (const userId of recipientIds) {
              const targetUser = await db.query.users.findFirst({
                where: eq(users.id, userId),
              });
              if (!targetUser) continue;

              await db.insert(notifications).values({
                userId,
                actorId: actorId as string | undefined,
                type: NotificationType.PR_UPDATED,
                title: `PR #${prNumber} updated on Review #${reviewNumber}`,
                message: `Pull Request #${prNumber} has new changes. Review status set to Pending Review.`,
                link: (link as string) || `/reviews/${reviewNumber}`,
              });

              if (await shouldSendEmail(userId, NotificationType.PR_UPDATED)) {
                await dispatchEmailJob({
                  outboxEventId: evt.id,
                  recipientEmail: targetUser.email,
                  recipientName: targetUser.displayName,
                  subject: `[Reported] PR #${prNumber} updated for Review #${reviewNumber}`,
                  template: "pr-updated",
                  htmlBody: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2328; line-height: 1.6;">
                      <p>Pull Request <strong>#${prNumber}</strong> linked to review <strong>#${reviewNumber}: ${reviewTitle || ""}</strong> has new commits.</p>
                      <p>Review status has been updated to <strong>Pending Review</strong>.</p>
                      <p><a href="${config.clientUrl}${link}" style="display: inline-block; background-color: #0969da; color: #ffffff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 500;">Open Review</a></p>
                    </div>
                  `,
                  textBody: `PR #${prNumber} linked to Review #${reviewNumber} has new changes. Status reset to Pending Review.\n\nLink: ${config.clientUrl}${link}`,
                });
              }
            }
            break;
          }
        }

        await db
          .update(outboxEvents)
          .set({ status: "PROCESSED", processedAt: new Date() })
          .where(eq(outboxEvents.id, evt.id));
      } catch (err: unknown) {
        console.error(`Error processing outbox event ${evt.id}:`, err);
        await db
          .update(outboxEvents)
          .set({
            status: evt.attempts >= 3 ? "FAILED" : "PENDING",
            attempts: evt.attempts + 1,
            error: err instanceof Error ? err.message : "Processing error",
          })
          .where(eq(outboxEvents.id, evt.id));
      }
    }
  } catch (error) {
    console.error("Outbox processor error:", error);
  }
}

let workerInterval: NodeJS.Timeout | null = null;

export function startOutboxWorker(intervalMs = 3000) {
  if (workerInterval) return;
  console.log(
    `🚀 Transactional Outbox worker started (polling every ${intervalMs}ms)`,
  );
  workerInterval = setInterval(() => {
    processOutboxEvents().catch(console.error);
  }, intervalMs);
}

export function stopOutboxWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }
}
