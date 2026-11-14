import { describe, expect, it, vi } from 'vitest';
import { PurgeOldNotificationsUseCase } from '@/modules/notifications/application/use-cases/purge-old-notifications.use-case.js';
import type { NotificationRepository } from '@/modules/notifications/domain/repositories/notification.repository.js';

describe('PurgeOldNotificationsUseCase', () => {
  it('borra lo anterior al límite de días y devuelve cuántas borró', async () => {
    const deleteOlderThan = vi.fn(() => Promise.resolve(12));
    const useCase = new PurgeOldNotificationsUseCase(
      { deleteOlderThan } as unknown as NotificationRepository,
      { now: () => new Date('2026-10-31T00:00:00Z') },
    );

    expect(await useCase.execute(30)).toBe(12);
    expect(deleteOlderThan).toHaveBeenCalledExactlyOnceWith(
      new Date('2026-10-01T00:00:00Z'),
    );
  });
});
