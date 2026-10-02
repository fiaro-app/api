import { describe, expect, it } from 'vitest';
import { Notification } from '@/modules/notifications/domain/entities/notification.entity.js';
import { toNotification } from '@/modules/notifications/infrastructure/persistence/notification.mapper.js';

const CREATED_AT = new Date('2026-10-02T00:00:00Z');

describe('toNotification', () => {
  it('convierte la fila en la entidad de dominio', () => {
    const row = {
      id: 'notification-1',
      recipientUserId: 'user-1',
      lenderId: 'lender-1',
      severity: 'INFO' as const,
      title: 'Préstamo asignado',
      body: 'Te asignaron un préstamo para cobrar.',
      relatedEntityType: 'LOAN' as const,
      relatedEntityId: 'loan-1',
      readAt: null,
      createdAt: CREATED_AT,
    };

    expect(toNotification(row)).toEqual(
      Notification.create({
        id: 'notification-1',
        recipientUserId: 'user-1',
        lenderId: 'lender-1',
        severity: 'INFO',
        title: 'Préstamo asignado',
        body: 'Te asignaron un préstamo para cobrar.',
        relatedEntityType: 'LOAN',
        relatedEntityId: 'loan-1',
        readAt: null,
        createdAt: CREATED_AT,
      }),
    );
  });

  it('sin entidad relacionada, ambos campos quedan en null', () => {
    const row = {
      id: 'notification-1',
      recipientUserId: 'user-1',
      lenderId: 'lender-1',
      severity: 'ALERT' as const,
      title: 'Aviso',
      body: 'Texto.',
      relatedEntityType: null,
      relatedEntityId: null,
      readAt: null,
      createdAt: CREATED_AT,
    };

    const notification = toNotification(row);
    expect(notification.relatedEntityType).toBeNull();
    expect(notification.relatedEntityId).toBeNull();
  });
});
