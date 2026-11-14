import { describe, expect, it, vi } from 'vitest';
import { MarkAllNotificationsReadUseCase } from '@/modules/notifications/application/use-cases/mark-all-notifications-read.use-case.js';
import type { NotificationRepository } from '@/modules/notifications/domain/repositories/notification.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';

const NOW = new Date('2026-10-09T12:00:00Z');

function setup(marked: number) {
  const markAllAsRead = vi.fn(() => Promise.resolve(marked));
  const notifications: NotificationRepository = {
    create: vi.fn(),
    findById: vi.fn(),
    list: vi.fn(),
    markAsRead: vi.fn(),
    countUnread: vi.fn(),
    markAllAsRead,
    delete: vi.fn(),
    deleteMany: vi.fn(),
    deleteOlderThan: vi.fn(),
  };
  const clock: Clock = { now: () => NOW };
  return {
    useCase: new MarkAllNotificationsReadUseCase(notifications, clock),
    markAllAsRead,
  };
}

describe('MarkAllNotificationsReadUseCase', () => {
  it('marca todas las de quien tiene la sesión con la hora actual y devuelve cuántas', async () => {
    const { useCase, markAllAsRead } = setup(5);

    const marked = await useCase.execute({ recipientUserId: 'user-1' });

    expect(marked).toBe(5);
    expect(markAllAsRead).toHaveBeenCalledExactlyOnceWith(
      { recipientUserId: 'user-1' },
      NOW,
    );
  });

  it('pasa el prestamista cuando llega', async () => {
    const { useCase, markAllAsRead } = setup(0);

    await useCase.execute({ recipientUserId: 'user-1', lenderId: 'lender-1' });

    expect(markAllAsRead).toHaveBeenCalledExactlyOnceWith(
      { recipientUserId: 'user-1', lenderId: 'lender-1' },
      NOW,
    );
  });
});
