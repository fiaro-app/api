import type { NotificationDetails } from '@/modules/notifications/application/dtos/notification-details.dto.js';
import type { Notification } from '@/modules/notifications/domain/entities/notification.entity.js';

/** @param notification - La notificación. */
export function toNotificationDetails(
  notification: Notification,
): NotificationDetails {
  return {
    id: notification.id,
    recipientUserId: notification.recipientUserId,
    lenderId: notification.lenderId,
    severity: notification.severity,
    title: notification.title,
    body: notification.body,
    relatedEntityType: notification.relatedEntityType,
    relatedEntityId: notification.relatedEntityId,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
  };
}
