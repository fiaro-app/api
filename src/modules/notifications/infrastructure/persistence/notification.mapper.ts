import { Notification } from '@/modules/notifications/domain/entities/notification.entity.js';
import type { NotificationModel } from '@/shared/infrastructure/persistence/generated/models.js';

/** @param row - Fila de `notifications`. */
export function toNotification(row: NotificationModel): Notification {
  return Notification.create({
    id: row.id,
    recipientUserId: row.recipientUserId,
    lenderId: row.lenderId,
    severity: row.severity,
    title: row.title,
    body: row.body,
    relatedEntityType: row.relatedEntityType,
    relatedEntityId: row.relatedEntityId,
    readAt: row.readAt,
    createdAt: row.createdAt,
  });
}
