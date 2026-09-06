import {
  db, outboxEvents, emailJobs, notifications, notificationPreferences, users, activities,
  eq, and, sql
} from '@reported/database';
import { NotificationChannel, NotificationType, TargetType } from '@reported/contracts';
import { config } from '../config/index.js';
import { sendEmail } from '../services/email.service.js';

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
  [key: string]: unknown;
}

export async function recordOutboxEvent(eventType: string, payload: Record<string, unknown>) {
  try {
    const [inserted] = await db.insert(outboxEvents).values({
      eventType,
      payload,
      status: 'PENDING'
    }).returning();
    return inserted;
  } catch (err) {
    console.error('Failed to record outbox event:', err);
  }
}

async function shouldSendEmail(userId: string, eventType: NotificationType): Promise<boolean> {
  const pref = await db.query.notificationPreferences.findFirst({
    where: and(
      eq(notificationPreferences.userId, userId),
      eq(notificationPreferences.eventType, eventType)
    )
  });

  if (!pref) {
    return true;
  }

  return pref.channel === NotificationChannel.EMAIL || pref.channel === NotificationChannel.BOTH;
}

async function dispatchEmailJob({
  outboxEventId,
  recipientEmail,
  recipientName,
  subject,
  template,
  htmlBody,
  textBody
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
    text: textBody
  });

  await db.insert(emailJobs).values({
    outboxEventId,
    recipientEmail,
    recipientName,
    subject,
    template,
    htmlBody,
    textBody,
    status: result.success ? (result.mode === 'smtp' ? 'SENT' : 'SIMULATED') : 'FAILED',
    sentAt: result.success ? new Date() : null
  });
}

export async function processOutboxEvents() {
  try {

    const pendingEvents = await db.select().from(outboxEvents)
      .where(eq(outboxEvents.status, 'PENDING'))
      .limit(20);

    for (const evt of pendingEvents) {
      try {
        const payload = (evt.payload || {}) as OutboxPayload;

        switch (evt.eventType) {
          case 'USER_MENTIONED': {
            const { targetUserIds = [], actorId, title, message, link } = payload;
            const actor = actorId ? await db.query.users.findFirst({ where: eq(users.id, actorId) }) : null;

            for (const userId of targetUserIds) {
              if (userId === actorId) continue;
              const targetUser = await db.query.users.findFirst({ where: eq(users.id, userId) });
              if (!targetUser) continue;

              await db.insert(notifications).values({
                userId,
                actorId,
                type: NotificationType.MENTIONED,
                title: title || `${actor?.displayName || 'Someone'} mentioned you`,
                message: message || '',
                link: link || '/'
              });

              if (await shouldSendEmail(userId, NotificationType.MENTIONED)) {
                await dispatchEmailJob({
                  outboxEventId: evt.id,
                  recipientEmail: targetUser.email,
                  recipientName: targetUser.displayName,
                  subject: `[Reported] ${actor?.displayName} mentioned you: ${title}`,
                  template: 'user-mention',
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
                  textBody: `${actor?.displayName} mentioned you: ${message}\n\nLink: ${config.clientUrl}${link}`
                });
              }
            }
            break;
          }

          case 'ISSUE_ASSIGNED': {
            const { assigneeIds = [], actorId, issueNumber, issueTitle, link } = payload;
            const actor = actorId ? await db.query.users.findFirst({ where: eq(users.id, actorId) }) : null;

            for (const userId of assigneeIds) {
              if (userId === actorId) continue;
              const targetUser = await db.query.users.findFirst({ where: eq(users.id, userId) });
              if (!targetUser) continue;

              await db.insert(notifications).values({
                userId,
                actorId,
                type: NotificationType.ASSIGNED,
                title: `Assigned to Issue #${issueNumber}`,
                message: `${actor?.displayName || 'Someone'} assigned you to "${issueTitle}"`,
                link: link || `/issues/${issueNumber}`
              });

              if (await shouldSendEmail(userId, NotificationType.ASSIGNED)) {
                await dispatchEmailJob({
                  outboxEventId: evt.id,
                  recipientEmail: targetUser.email,
                  recipientName: targetUser.displayName,
                  subject: `[Reported] Assigned to #${issueNumber}: ${issueTitle}`,
                  template: 'issue-assigned',
                  htmlBody: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2328; line-height: 1.6;">
                      <p><strong>${actor?.displayName}</strong> assigned you to <strong>#${issueNumber}: ${issueTitle}</strong>.</p>
                      <p><a href="${config.clientUrl}${link}" style="display: inline-block; background-color: #0969da; color: #ffffff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 500;">Open Issue</a></p>
                    </div>
                  `,
                  textBody: `You have been assigned to #${issueNumber}: ${issueTitle}\n\nLink: ${config.clientUrl}${link}`
                });
              }
            }
            break;
          }

          case 'REVIEW_REQUESTED': {
            const { reviewerIds = [], actorId, reviewNumber, reviewTitle, link } = payload;
            const actor = actorId ? await db.query.users.findFirst({ where: eq(users.id, actorId) }) : null;

            for (const userId of reviewerIds) {
              if (userId === actorId) continue;
              const targetUser = await db.query.users.findFirst({ where: eq(users.id, userId) });
              if (!targetUser) continue;

              await db.insert(notifications).values({
                userId,
                actorId,
                type: NotificationType.REVIEW_REQUESTED,
                title: `Review Requested on #${reviewNumber}`,
                message: `${actor?.displayName || 'Someone'} requested your review on "${reviewTitle}"`,
                link: link || `/reviews/${reviewNumber}`
              });

              if (await shouldSendEmail(userId, NotificationType.REVIEW_REQUESTED)) {
                await dispatchEmailJob({
                  outboxEventId: evt.id,
                  recipientEmail: targetUser.email,
                  recipientName: targetUser.displayName,
                  subject: `[Reported] Review requested on #${reviewNumber}: ${reviewTitle}`,
                  template: 'review-requested',
                  htmlBody: `
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2328; line-height: 1.6;">
                      <p><strong>${actor?.displayName}</strong> requested your review on <strong>#${reviewNumber}: ${reviewTitle}</strong>.</p>
                      <p><a href="${config.clientUrl}${link}" style="display: inline-block; background-color: #0969da; color: #ffffff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 500;">Start Review</a></p>
                    </div>
                  `,
                  textBody: `Review requested on #${reviewNumber}: ${reviewTitle}\n\nLink: ${config.clientUrl}${link}`
                });
              }
            }
            break;
          }

          case 'COMMENT_CREATED': {
            const { targetAuthorId, actorId, title, snippet, link } = payload;
            if (targetAuthorId && targetAuthorId !== actorId) {
              const actor = actorId ? await db.query.users.findFirst({ where: eq(users.id, actorId) }) : null;
              const targetUser = await db.query.users.findFirst({ where: eq(users.id, targetAuthorId) });

              if (targetUser) {
                await db.insert(notifications).values({
                  userId: targetAuthorId,
                  actorId,
                  type: NotificationType.COMMENTED,
                  title: `New comment on "${title}"`,
                  message: `${actor?.displayName}: ${snippet}`,
                  link: link || '/'
                });

                if (await shouldSendEmail(targetAuthorId, NotificationType.COMMENTED)) {
                  await dispatchEmailJob({
                    outboxEventId: evt.id,
                    recipientEmail: targetUser.email,
                    recipientName: targetUser.displayName,
                    subject: `[Reported] New comment on ${title}`,
                    template: 'new-comment',
                    htmlBody: `
                      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2328; line-height: 1.6;">
                        <p><strong>${actor?.displayName}</strong> commented on <strong>${title}</strong>:</p>
                        <blockquote style="border-left: 3px solid #d0d7de; margin: 12px 0; padding-left: 12px; color: #57606a;">
                          ${snippet}
                        </blockquote>
                        <p><a href="${config.clientUrl}${link}" style="display: inline-block; background-color: #0969da; color: #ffffff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 500;">View Comment</a></p>
                      </div>
                    `,
                    textBody: `${actor?.displayName} commented on ${title}:\n\n${snippet}\n\nLink: ${config.clientUrl}${link}`
                  });
                }
              }
            }
            break;
          }

          case 'ISSUE_STATUS_CHANGED': {
            const { issueNumber, issueTitle, fromStatus, toStatus, authorId, actorId, link } = payload;
            if (authorId && authorId !== actorId) {
              const actor = actorId ? await db.query.users.findFirst({ where: eq(users.id, actorId) }) : null;
              const author = await db.query.users.findFirst({ where: eq(users.id, authorId) });

              if (author) {
                await db.insert(notifications).values({
                  userId: authorId,
                  actorId,
                  type: NotificationType.ISSUE_STATUS_CHANGED,
                  title: `Issue #${issueNumber} status changed: ${fromStatus} → ${toStatus}`,
                  message: `${actor?.displayName} changed status to ${toStatus}`,
                  link: link || `/issues/${issueNumber}`
                });

                if (await shouldSendEmail(authorId, NotificationType.ISSUE_STATUS_CHANGED)) {
                  await dispatchEmailJob({
                    outboxEventId: evt.id,
                    recipientEmail: author.email,
                    recipientName: author.displayName,
                    subject: `[Reported] #${issueNumber} status changed to ${toStatus}`,
                    template: 'status-changed',
                    htmlBody: `
                      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2328; line-height: 1.6;">
                        <p><strong>${actor?.displayName}</strong> updated the status of <strong>#${issueNumber}: ${issueTitle}</strong> from <code>${fromStatus}</code> to <code>${toStatus}</code>.</p>
                        <p><a href="${config.clientUrl}${link}" style="display: inline-block; background-color: #0969da; color: #ffffff; padding: 8px 16px; border-radius: 6px; text-decoration: none; font-weight: 500;">View Issue</a></p>
                      </div>
                    `,
                    textBody: `Status updated on #${issueNumber}: ${issueTitle} -> ${toStatus}\n\nLink: ${config.clientUrl}${link}`
                  });
                }
              }
            }
            break;
          }
        }

        await db.update(outboxEvents)
          .set({ status: 'PROCESSED', processedAt: new Date() })
          .where(eq(outboxEvents.id, evt.id));

      } catch (err: unknown) {
        console.error(`Error processing outbox event ${evt.id}:`, err);
        await db.update(outboxEvents)
          .set({
            status: evt.attempts >= 3 ? 'FAILED' : 'PENDING',
            attempts: evt.attempts + 1,
            error: err instanceof Error ? err.message : 'Processing error'
          })
          .where(eq(outboxEvents.id, evt.id));
      }
    }
  } catch (error) {
    console.error('Outbox processor error:', error);
  }
}

let workerInterval: NodeJS.Timeout | null = null;

export function startOutboxWorker(intervalMs = 3000) {
  if (workerInterval) return;
  console.log(`🚀 Transactional Outbox worker started (polling every ${intervalMs}ms)`);
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

