import { Global, Logger, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ENV } from '@/config/env.token.js';
import type { Env } from '@/config/env.js';
import type { ReadCache } from '@/shared/application/ports/read-cache.port.js';
import { READ_CACHE } from '@/shared/application/ports/read-cache.token.js';
import { InvalidateLenderCacheInterceptor } from '@/shared/infrastructure/cache/invalidate-lender-cache.interceptor.js';
import { PassthroughReadCache } from '@/shared/infrastructure/cache/passthrough-read-cache.js';
import { RedisReadCache } from '@/shared/infrastructure/cache/redis-read-cache.js';
import { createRedisConnection } from '@/shared/infrastructure/messaging/redis-connection.js';
import { repeatedWarnings } from '@/shared/infrastructure/messaging/repeated-warnings.js';

/**
 * La caché que corresponde al entorno: en Redis si hay URL, si no una que siempre calcula.
 *
 * @param env - `cacheRedisUrl` y el prefijo de las claves.
 */
export function createReadCache(
  env: Pick<Env, 'cacheRedisUrl' | 'queuePrefix'>,
): ReadCache {
  if (env.cacheRedisUrl === undefined) {
    return new PassthroughReadCache();
  }
  const warn = repeatedWarnings(new Logger('ReadCache'));
  return new RedisReadCache(
    createRedisConnection(env.cacheRedisUrl, 'producer', warn),
    env.queuePrefix,
    warn,
  );
}

/**
 * Caché de lecturas por prestamista (D-118), global: cualquier controlador inyecta `READ_CACHE`.
 * Usa `CACHE_REDIS_URL` (o, si no está, `REDIS_URL`); sin ninguna, no guarda nada. Registra el
 * interceptor que la invalida después de cada escritura.
 */
@Global()
@Module({
  providers: [
    {
      provide: READ_CACHE,
      inject: [ENV],
      useFactory: createReadCache,
    },
    { provide: APP_INTERCEPTOR, useClass: InvalidateLenderCacheInterceptor },
  ],
  exports: [READ_CACHE],
})
export class CacheModule {}
