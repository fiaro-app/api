import { describe, expect, it, vi } from 'vitest';
import { DeleteNotificationsUseCase } from '@/modules/notifications/application/use-cases/delete-notifications.use-case.js';
import type { NotificationRepository } from '@/modules/notifications/domain/repositories/notification.repository.js';

describe('DeleteNotificationsUseCase', () => {
  it('pasa el criterio al repositorio y devuelve cuántas borró', async () => {
    const deleteMany = vi.fn(() => Promise.resolve(6));
    const useCase = new DeleteNotificationsUseCase({
      deleteMany,
    } as unknown as NotificationRepository);
    const input = {
      recipientUserId: 'user-1',
      lenderId: 'lender-1',
      onlyRead: true,
    };

    expect(await useCase.execute(input)).toBe(6);
    expect(deleteMany).toHaveBeenCalledExactlyOnceWith(input);
  });
});
