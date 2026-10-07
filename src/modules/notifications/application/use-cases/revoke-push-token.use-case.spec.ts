import { describe, expect, it, vi } from 'vitest';
import { RevokePushTokenUseCase } from '@/modules/notifications/application/use-cases/revoke-push-token.use-case.js';
import type { PushTokenRepository } from '@/modules/notifications/domain/repositories/push-token.repository.js';

describe('RevokePushTokenUseCase', () => {
  it('quita el token solo de la persona de la sesión', async () => {
    const deleteForUser = vi.fn<
      (userId: string, token: string) => Promise<void>
    >(() => Promise.resolve());
    const pushTokens = { deleteForUser } as unknown as PushTokenRepository;
    const useCase = new RevokePushTokenUseCase(pushTokens);

    await useCase.execute({
      userId: 'user-1',
      token: 'ExponentPushToken[dispositivo-1]',
    });

    expect(deleteForUser).toHaveBeenCalledWith(
      'user-1',
      'ExponentPushToken[dispositivo-1]',
    );
  });
});
