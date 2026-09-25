import { describe, expect, it, vi } from 'vitest';
import { MemorySignInAttempts } from '@/modules/auth/infrastructure/lockout/memory-sign-in-attempts.js';
import { RedisSignInAttempts } from '@/modules/auth/infrastructure/lockout/redis-sign-in-attempts.js';
import { createSignInAttempts } from '@/modules/auth/infrastructure/lockout/sign-in-attempts.factory.js';

const connection = { eval: vi.fn(), del: vi.fn(), disconnect: vi.fn() };
const createRedisConnection = vi.fn(() => connection);

vi.mock('@/shared/infrastructure/messaging/redis-connection.js', () => ({
  createRedisConnection: (...args: unknown[]) =>
    (createRedisConnection as (...args: unknown[]) => unknown)(...args),
}));

describe('createSignInAttempts', () => {
  it('sin Redis cuenta en la memoria del proceso', () => {
    const attempts = createSignInAttempts({
      redisUrl: undefined,
      queuePrefix: 'fiaro',
    });

    expect(attempts).toBeInstanceOf(MemorySignInAttempts);
    expect(createRedisConnection).not.toHaveBeenCalled();
  });

  it('con Redis cuenta ahí, con una conexión que falla rápido y las llaves bajo el prefijo del entorno', async () => {
    connection.eval.mockResolvedValueOnce([1, 900]);

    const attempts = createSignInAttempts({
      redisUrl: 'redis://127.0.0.1:6390',
      queuePrefix: 'fiaro-staging',
    });
    await attempts.register('huella');

    expect(attempts).toBeInstanceOf(RedisSignInAttempts);
    expect(createRedisConnection).toHaveBeenCalledWith(
      'redis://127.0.0.1:6390',
      'producer',
      expect.any(Function),
    );
    expect(connection.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      'fiaro-staging:sign-in-attempts:huella',
      '900',
    );
  });
});
