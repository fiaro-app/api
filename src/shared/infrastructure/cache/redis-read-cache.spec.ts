import type { Redis } from 'ioredis';
import { describe, expect, it, vi } from 'vitest';
import { PassthroughReadCache } from '@/shared/infrastructure/cache/passthrough-read-cache.js';
import {
  MAX_ENTRY_BYTES,
  RedisReadCache,
} from '@/shared/infrastructure/cache/redis-read-cache.js';

/** Un Redis en memoria con lo justo que usa la caché. */
function fakeRedis() {
  const store = new Map<string, string>();
  const ttls = new Map<string, number>();
  const redis = {
    get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    set: vi.fn((key: string, value: string, _ex: string, ttl: number) => {
      store.set(key, value);
      ttls.set(key, ttl);
      return Promise.resolve('OK');
    }),
    multi: vi.fn(() => {
      const ops: (() => void)[] = [];
      const chain = {
        incr: (key: string) => {
          ops.push(() =>
            store.set(key, String(Number(store.get(key) ?? '0') + 1)),
          );
          return chain;
        },
        expire: (key: string, ttl: number) => {
          ops.push(() => ttls.set(key, ttl));
          return chain;
        },
        exec: () => {
          ops.forEach((op) => {
            op();
          });
          return Promise.resolve([]);
        },
      };
      return chain;
    }),
    disconnect: vi.fn(),
  };
  return { redis, store, ttls };
}

function setup() {
  const fake = fakeRedis();
  const warn = vi.fn();
  const cache = new RedisReadCache(
    fake.redis as unknown as Redis,
    'fiaro',
    warn,
  );
  return { ...fake, warn, cache };
}

describe('RedisReadCache', () => {
  it('calcula una vez y después lee de la caché, con su TTL', async () => {
    const { cache, ttls } = setup();
    const load = vi.fn(() => Promise.resolve({ total: 3 }));

    expect(await cache.getOrLoad('lender-1', 'stats:a', 60, load)).toEqual({
      total: 3,
    });
    await vi.waitFor(() => {
      expect(ttls.get('fiaro:cache:lender-1:0:stats:a')).toBe(60);
    });
    expect(await cache.getOrLoad('lender-1', 'stats:a', 60, load)).toEqual({
      total: 3,
    });
    expect(load).toHaveBeenCalledOnce();
  });

  it('invalidar cambia la generación: lo guardado ya no se lee', async () => {
    const { cache, ttls } = setup();
    const load = vi
      .fn<() => Promise<number>>()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);

    await cache.getOrLoad('lender-1', 'k', 60, load);
    await cache.invalidate('lender-1');

    expect(await cache.getOrLoad('lender-1', 'k', 60, load)).toBe(2);
    expect(ttls.get('fiaro:cache:lender-1:gen')).toBe(7 * 24 * 60 * 60);
  });

  it('no mezcla prestamistas', async () => {
    const { cache } = setup();
    await cache.getOrLoad('lender-1', 'k', 60, () => Promise.resolve('uno'));

    expect(
      await cache.getOrLoad('lender-2', 'k', 60, () => Promise.resolve('dos')),
    ).toBe('dos');
  });

  it('no guarda una entrada demasiado grande', async () => {
    const { cache, redis } = setup();
    const big = 'x'.repeat(MAX_ENTRY_BYTES + 1);

    await cache.getOrLoad('lender-1', 'k', 60, () => Promise.resolve(big));

    expect(redis.set).not.toHaveBeenCalled();
  });

  it('con Redis caído calcula directo, avisa y no falla al invalidar ni al guardar', async () => {
    const { cache, redis, warn } = setup();
    redis.get.mockRejectedValue(new Error('ECONNREFUSED'));
    redis.multi.mockImplementation(() => {
      throw new Error('ECONNREFUSED');
    });

    expect(
      await cache.getOrLoad('lender-1', 'k', 60, () => Promise.resolve(7)),
    ).toBe(7);
    await expect(cache.invalidate('lender-1')).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(2);

    redis.get.mockResolvedValue(null);
    redis.set.mockRejectedValueOnce(new Error('OOM'));
    expect(
      await cache.getOrLoad('lender-1', 'k', 60, () => Promise.resolve(8)),
    ).toBe(8);
    await vi.waitFor(() => {
      expect(warn).toHaveBeenCalledTimes(3);
    });
  });

  it('con Redis lento no espera más de lo debido', async () => {
    vi.useFakeTimers();
    const { cache, redis } = setup();
    redis.get.mockImplementation(() => new Promise(() => undefined));

    const result = cache.getOrLoad('lender-1', 'k', 60, () =>
      Promise.resolve('directo'),
    );
    await vi.advanceTimersByTimeAsync(200);

    expect(await result).toBe('directo');
    vi.useRealTimers();
  });

  it('cierra la conexión al apagar', () => {
    const { cache, redis } = setup();
    cache.onModuleDestroy();
    expect(redis.disconnect).toHaveBeenCalledOnce();
  });
});

describe('PassthroughReadCache', () => {
  it('siempre calcula y no tiene nada que invalidar', async () => {
    const cache = new PassthroughReadCache();
    const load = vi.fn(() => Promise.resolve(1));

    await cache.getOrLoad('l', 'k', 60, load);
    await cache.getOrLoad('l', 'k', 60, load);
    await cache.invalidate();

    expect(load).toHaveBeenCalledTimes(2);
  });
});
