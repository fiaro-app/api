import { describe, expect, it, vi } from 'vitest';
import { createAttemptCounter } from '@/modules/auth/infrastructure/lockout/attempt-counter.factory.js';
import { MemorySignInAttempts } from '@/modules/auth/infrastructure/lockout/memory-sign-in-attempts.js';
import { RedisSignInAttempts } from '@/modules/auth/infrastructure/lockout/redis-sign-in-attempts.js';

const connection = { eval: vi.fn(), del: vi.fn(), disconnect: vi.fn() };
const createRedisConnection = vi.fn(() => connection);

vi.mock('@/shared/infrastructure/messaging/redis-connection.js', () => ({
  createRedisConnection: (...args: unknown[]) =>
    (createRedisConnection as (...args: unknown[]) => unknown)(...args),
}));

describe('createAttemptCounter', () => {
  it('sin Redis cuenta en la memoria del proceso, con el límite y la ventana dados', async () => {
    const counter = createAttemptCounter(
      { redisUrl: undefined, queuePrefix: 'fiaro' },
      'password-reset-requests',
      3,
      3_600,
      'Test',
    );

    expect(counter).toBeInstanceOf(MemorySignInAttempts);
    expect(createRedisConnection).not.toHaveBeenCalled();
    const verdicts = [];
    for (let i = 0; i < 4; i += 1) {
      verdicts.push(await counter.register('h'));
    }
    expect(verdicts.map((verdict) => verdict.allowed)).toEqual([
      true,
      true,
      true,
      false,
    ]);
  });

  it('con Redis cuenta ahí, con las llaves bajo el prefijo del entorno y el sufijo dado', async () => {
    connection.eval.mockResolvedValueOnce([1, 3_600]);

    const counter = createAttemptCounter(
      { redisUrl: 'redis://127.0.0.1:6390', queuePrefix: 'fiaro-staging' },
      'password-reset-requests',
      3,
      3_600,
      'Test',
    );
    await counter.register('huella');

    expect(counter).toBeInstanceOf(RedisSignInAttempts);
    expect(createRedisConnection).toHaveBeenCalledWith(
      'redis://127.0.0.1:6390',
      'producer',
      expect.any(Function),
    );
    expect(connection.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      'fiaro-staging:password-reset-requests:huella',
      '3600',
    );
  });
});
