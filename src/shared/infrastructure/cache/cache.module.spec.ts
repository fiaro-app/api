import { describe, expect, it } from 'vitest';
import { createReadCache } from '@/shared/infrastructure/cache/cache.module.js';
import { PassthroughReadCache } from '@/shared/infrastructure/cache/passthrough-read-cache.js';
import { RedisReadCache } from '@/shared/infrastructure/cache/redis-read-cache.js';

describe('createReadCache', () => {
  it('sin URL de Redis no guarda nada', () => {
    expect(
      createReadCache({ cacheRedisUrl: undefined, queuePrefix: 'fiaro' }),
    ).toBeInstanceOf(PassthroughReadCache);
  });

  it('con URL usa Redis', () => {
    const cache = createReadCache({
      cacheRedisUrl: 'redis://127.0.0.1:1',
      queuePrefix: 'fiaro',
    });

    expect(cache).toBeInstanceOf(RedisReadCache);
    (cache as RedisReadCache).onModuleDestroy();
  });
});
