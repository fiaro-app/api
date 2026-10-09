import { describe, expect, it, vi } from 'vitest';
import { CountUnreadNotificationsUseCase } from '@/modules/notifications/application/use-cases/count-unread-notifications.use-case.js';
import type { NotificationRepository } from '@/modules/notifications/domain/repositories/notification.repository.js';

function setup(unread: number) {
  const countUnread = vi.fn(() => Promise.resolve(unread));
  const notifications: NotificationRepository = {
    create: vi.fn(),
    findById: vi.fn(),
    list: vi.fn(),
    markAsRead: vi.fn(),
    countUnread,
    markAllAsRead: vi.fn(),
  };
  return {
    useCase: new CountUnreadNotificationsUseCase(notifications),
    countUnread,
  };
}

describe('CountUnreadNotificationsUseCase', () => {
  it('devuelve cuántas siguen sin leer de quien tiene la sesión', async () => {
    const { useCase, countUnread } = setup(7);

    const count = await useCase.execute({ recipientUserId: 'user-1' });

    expect(count).toBe(7);
    expect(countUnread).toHaveBeenCalledExactlyOnceWith({
      recipientUserId: 'user-1',
    });
  });

  it('pasa el prestamista cuando llega', async () => {
    const { useCase, countUnread } = setup(0);

    await useCase.execute({ recipientUserId: 'user-1', lenderId: 'lender-1' });

    expect(countUnread).toHaveBeenCalledExactlyOnceWith({
      recipientUserId: 'user-1',
      lenderId: 'lender-1',
    });
  });
});
