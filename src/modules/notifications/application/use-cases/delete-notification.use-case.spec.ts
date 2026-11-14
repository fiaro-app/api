import { describe, expect, it, vi } from 'vitest';
import { DeleteNotificationUseCase } from '@/modules/notifications/application/use-cases/delete-notification.use-case.js';
import { NotificationNotFoundError } from '@/modules/notifications/domain/errors/notification-not-found.error.js';
import type { NotificationRepository } from '@/modules/notifications/domain/repositories/notification.repository.js';

function setup(found: boolean) {
  const remove = vi.fn(() => Promise.resolve());
  const notifications = {
    findById: vi.fn(() => Promise.resolve(found ? {} : null)),
    delete: remove,
  } as unknown as NotificationRepository;
  return { useCase: new DeleteNotificationUseCase(notifications), remove };
}

describe('DeleteNotificationUseCase', () => {
  it('borra una notificación propia', async () => {
    const { useCase, remove } = setup(true);

    await useCase.execute('notification-1', 'user-1');

    expect(remove).toHaveBeenCalledExactlyOnceWith('notification-1', 'user-1');
  });

  it('si no existe para esta persona, falla y no borra nada', async () => {
    const { useCase, remove } = setup(false);

    await expect(
      useCase.execute('notification-1', 'user-1'),
    ).rejects.toBeInstanceOf(NotificationNotFoundError);
    expect(remove).not.toHaveBeenCalled();
  });
});
