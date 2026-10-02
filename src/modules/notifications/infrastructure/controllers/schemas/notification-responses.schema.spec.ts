import { describe, expect, it } from 'vitest';
import type { NotificationDetails } from '@/modules/notifications/application/dtos/notification-details.dto.js';
import {
  toNotificationResponse,
  toNotificationsPageResponse,
} from '@/modules/notifications/infrastructure/controllers/schemas/notification-responses.schema.js';

const DETAILS: NotificationDetails = {
  id: 'notification-1',
  recipientUserId: 'user-1',
  lenderId: 'lender-1',
  severity: 'INFO',
  title: 'Préstamo asignado',
  body: 'Te asignaron un préstamo para cobrar.',
  relatedEntityType: 'LOAN',
  relatedEntityId: 'loan-1',
  readAt: null,
  createdAt: new Date('2026-10-02T00:00:00Z'),
};

describe('toNotificationResponse', () => {
  it('no incluye recipientUserId: siempre es quien pide la lista', () => {
    expect(toNotificationResponse(DETAILS)).toEqual({
      id: 'notification-1',
      lenderId: 'lender-1',
      severity: 'INFO',
      title: 'Préstamo asignado',
      body: 'Te asignaron un préstamo para cobrar.',
      relatedEntityType: 'LOAN',
      relatedEntityId: 'loan-1',
      readAt: null,
      createdAt: '2026-10-02T00:00:00.000Z',
    });
  });

  it('convierte readAt a texto ISO cuando ya se leyó', () => {
    const read: NotificationDetails = {
      ...DETAILS,
      readAt: new Date('2026-10-02T01:00:00Z'),
    };

    expect(toNotificationResponse(read).readAt).toBe(
      '2026-10-02T01:00:00.000Z',
    );
  });
});

describe('toNotificationsPageResponse', () => {
  it('envuelve las notificaciones con sus metadatos de paginación', () => {
    expect(
      toNotificationsPageResponse(
        { items: [DETAILS], total: 1 },
        { page: 1, pageSize: 20 },
      ),
    ).toEqual({
      data: [toNotificationResponse(DETAILS)],
      meta: { page: 1, pageSize: 20, total: 1 },
    });
  });
});
