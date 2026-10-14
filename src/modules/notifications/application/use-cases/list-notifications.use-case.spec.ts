import { describe, expect, it, vi } from 'vitest';
import { ListNotificationsUseCase } from '@/modules/notifications/application/use-cases/list-notifications.use-case.js';
import { Notification } from '@/modules/notifications/domain/entities/notification.entity.js';
import type { NotificationRepository } from '@/modules/notifications/domain/repositories/notification.repository.js';

const NOTIFICATION = Notification.create({
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
});

function setup() {
  const list = vi.fn(() =>
    Promise.resolve({ items: [NOTIFICATION], total: 1 }),
  );
  const notifications: NotificationRepository = {
    create: vi.fn(),
    findById: vi.fn(() => Promise.resolve(null)),
    list,
    markAsRead: vi.fn(() => Promise.reject(new Error('no usado'))),
    countUnread: vi.fn(() => Promise.reject(new Error('no usado'))),
    markAllAsRead: vi.fn(() => Promise.reject(new Error('no usado'))),
  };
  return { useCase: new ListNotificationsUseCase(notifications), list };
}

describe('ListNotificationsUseCase', () => {
  it('pagina las notificaciones de la sesión', async () => {
    const { useCase, list } = setup();

    const page = await useCase.execute({
      recipientUserId: 'user-1',
      page: 1,
      pageSize: 20,
      unreadOnly: true,
    });

    expect(list).toHaveBeenCalledExactlyOnceWith({
      recipientUserId: 'user-1',
      page: 1,
      pageSize: 20,
      unreadOnly: true,
    });
    expect(page).toEqual({ items: [NOTIFICATION], total: 1 });
  });
});
