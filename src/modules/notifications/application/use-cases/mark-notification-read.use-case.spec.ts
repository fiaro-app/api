import { describe, expect, it, vi } from 'vitest';
import { MarkNotificationReadUseCase } from '@/modules/notifications/application/use-cases/mark-notification-read.use-case.js';
import { Notification } from '@/modules/notifications/domain/entities/notification.entity.js';
import { NotificationNotFoundError } from '@/modules/notifications/domain/errors/notification-not-found.error.js';
import type { NotificationRepository } from '@/modules/notifications/domain/repositories/notification.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';

const CREATED_AT = new Date('2026-10-02T00:00:00Z');
const READ_AT = new Date('2026-10-02T01:00:00Z');

const UNREAD = Notification.create({
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
});

function setup(found: Notification | null) {
  const markAsRead = vi.fn(() =>
    Promise.resolve(
      Notification.create({
        id: 'notification-1',
        recipientUserId: 'user-1',
        lenderId: 'lender-1',
        severity: 'INFO',
        title: 'Préstamo asignado',
        body: 'Te asignaron un préstamo para cobrar.',
        relatedEntityType: 'LOAN',
        relatedEntityId: 'loan-1',
        readAt: READ_AT,
        createdAt: CREATED_AT,
      }),
    ),
  );
  const notifications: NotificationRepository = {
    create: vi.fn(),
    findById: vi.fn(() => Promise.resolve(found)),
    list: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
    markAsRead,
  };
  const clock: Clock = { now: () => READ_AT };
  return {
    useCase: new MarkNotificationReadUseCase(notifications, clock),
    markAsRead,
  };
}

describe('MarkNotificationReadUseCase', () => {
  it('marca como leída una notificación propia', async () => {
    const { useCase, markAsRead } = setup(UNREAD);

    const read = await useCase.execute('notification-1', 'user-1');

    expect(markAsRead).toHaveBeenCalledExactlyOnceWith(
      'notification-1',
      READ_AT,
    );
    expect(read.readAt).toEqual(READ_AT);
  });

  it('rechaza si no existe, o no es de quien la pide', async () => {
    const { useCase, markAsRead } = setup(null);

    await expect(
      useCase.execute('notification-1', 'user-1'),
    ).rejects.toBeInstanceOf(NotificationNotFoundError);
    expect(markAsRead).not.toHaveBeenCalled();
  });
});
