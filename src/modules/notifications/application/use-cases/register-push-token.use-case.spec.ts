import { describe, expect, it, vi } from 'vitest';
import { RegisterPushTokenUseCase } from '@/modules/notifications/application/use-cases/register-push-token.use-case.js';
import { PushToken } from '@/modules/notifications/domain/entities/push-token.entity.js';
import type { PushTokenRepository } from '@/modules/notifications/domain/repositories/push-token.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';

const NOW = new Date('2026-10-06T12:00:00Z');

function setup() {
  const upsert = vi.fn<(pushToken: PushToken) => Promise<void>>(() =>
    Promise.resolve(),
  );
  const pushTokens = { upsert } as unknown as PushTokenRepository;
  const ids: IdGenerator = { next: () => 'push-1' };
  const clock: Clock = { now: () => NOW };
  return {
    useCase: new RegisterPushTokenUseCase(pushTokens, ids, clock),
    upsert,
  };
}

describe('RegisterPushTokenUseCase', () => {
  it('registra el token para la persona de la sesión, con la hora del reloj', async () => {
    const { useCase, upsert } = setup();

    await useCase.execute({
      userId: 'user-1',
      token: 'ExponentPushToken[dispositivo-1]',
    });

    expect(upsert).toHaveBeenCalledWith(
      PushToken.create({
        id: 'push-1',
        token: 'ExponentPushToken[dispositivo-1]',
        userId: 'user-1',
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );
  });
});
