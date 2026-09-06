import { z } from 'zod';
import { NotificationChannel, NotificationType } from './enums.js';
import { UserSummaryDto } from './auth.dto.js';

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  actor?: UserSummaryDto | null;
  createdAt: string;
}

export const UpdateNotificationPreferencesSchema = z.object({
  preferences: z.record(
    z.nativeEnum(NotificationType),
    z.nativeEnum(NotificationChannel)
  )
});

export type UpdateNotificationPreferencesDto = z.infer<typeof UpdateNotificationPreferencesSchema>;

export interface NotificationPreferenceDto {
  eventType: NotificationType;
  channel: NotificationChannel;
}

