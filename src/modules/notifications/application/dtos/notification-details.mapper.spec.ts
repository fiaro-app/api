import { describe, expect, it } from 'vitest';
import { toNotificationDetails } from '@/modules/notifications/application/dtos/notification-details.mapper.js';
import { Notification } from '@/modules/notifications/domain/entities/notification.entity.js';

describe('toNotificationDetails', () => {
  it('convierte la entidad en los datos públicos de la notificación', () => {
    const createdAt = new Date('2026-10-02T00:00:00Z');
    const notification = Notification.create({
      id: 'notification-1',
      recipientUserId: 'user-1',
      lenderId: 'lender-1',
      severity: 'WARNING',
      title: 'Cuadre rechazado',
      body: 'Revisa tu cuadre del 2026-10-01.',
      relatedEntityType: 'DAILY_SETTLEMENT',
      relatedEntityId: 'settlement-1',
      readAt: null,
      createdAt,
    });

    expect(toNotificationDetails(notification)).toEqual({
      id: 'notification-1',
      recipientUserId: 'user-1',
      lenderId: 'lender-1',
      severity: 'WARNING',
      title: 'Cuadre rechazado',
      body: 'Revisa tu cuadre del 2026-10-01.',
      relatedEntityType: 'DAILY_SETTLEMENT',
      relatedEntityId: 'settlement-1',
      readAt: null,
      createdAt,
    });
  });
});
