import type { OnModuleDestroy } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { ReadCache } from '@/shared/application/ports/read-cache.port.js';
import type { Warn } from '@/shared/infrastructure/messaging/repeated-warnings.js';

/** Cuánto se espera a Redis antes de seguir sin caché: una lectura nunca espera más que esto de más. */
const REDIS_TIMEOUT_MS = 150;

/** Entradas más grandes no se guardan: protegen la memoria de Redis (D-118). */
export const MAX_ENTRY_BYTES = 256 * 1024;

/** Cuánto vive el contador de generación sin escrituras: siempre mucho más que cualquier entrada. */
const GENERATION_TTL_SECONDS = 7 * 24 * 60 * 60;

/** Rechaza si `promise` no termina a tiempo. */
async function withTimeout<T>(promise: Promise<T>): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Redis no respondió en ${String(REDIS_TIMEOUT_MS)} ms`));
    }, REDIS_TIMEOUT_MS);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * {@link ReadCache} en Redis, invalidada por generación (D-118).
 *
 * @remarks
 * Cada prestamista tiene un contador (`<prefijo>:cache:<lenderId>:gen`) que forma parte de la
 * clave de todas sus entradas. Invalidar es incrementarlo: las entradas viejas dejan de leerse de
 * inmediato y Redis las borra al vencer su TTL, sin recorrer claves. Una lectura calculada mientras
 * llegaba una escritura se guarda con la generación vieja, así que tampoco se vuelve a leer.
 *
 * Lecturas iguales al mismo tiempo en este proceso comparten un solo cálculo (`inflight`): sin
 * eso, veinte pedidos de las mismas estadísticas con la caché vacía las calcularían veinte veces a
 * la vez (medido: p95 de 2,4 s contra 9 ms).
 *
 * Si Redis falla o tarda, la lectura se calcula sin caché y se avisa una vez (`warn`); nunca falla
 * por la caché. Lo único que puede perderse con Redis caído es una invalidación: el TTL corto de
 * cada entrada acota cuánto puede verse un dato viejo.
 */
export class RedisReadCache implements ReadCache, OnModuleDestroy {
  /** Cálculos en curso por clave de entrada, para no repetirlos al mismo tiempo. */
  private readonly inflight = new Map<string, Promise<unknown>>();

  constructor(
    private readonly redis: Redis,
    private readonly prefix: string,
    private readonly warn: Warn,
  ) {}

  async getOrLoad<T>(
    lenderId: string,
    key: string,
    ttlSeconds: number,
    load: () => Promise<T>,
  ): Promise<T> {
    let entryKey: string;
    try {
      const generation = await withTimeout(
        this.redis.get(this.generationKey(lenderId)),
      );
      entryKey = `${this.prefix}:cache:${lenderId}:${generation ?? '0'}:${key}`;
      const cached = await withTimeout(this.redis.get(entryKey));
      if (cached !== null) {
        return JSON.parse(cached) as T;
      }
    } catch (error) {
      this.warn(`Caché sin Redis, se calcula directo: ${String(error)}`);
      return load();
    }
    const running = this.inflight.get(entryKey);
    if (running !== undefined) {
      return running as Promise<T>;
    }
    const loading = load()
      .then((value) => {
        this.store(entryKey, value, ttlSeconds);
        return value;
      })
      .finally(() => {
        this.inflight.delete(entryKey);
      });
    this.inflight.set(entryKey, loading);
    return loading;
  }

  async invalidate(lenderId: string): Promise<void> {
    try {
      await withTimeout(
        this.redis
          .multi()
          .incr(this.generationKey(lenderId))
          .expire(this.generationKey(lenderId), GENERATION_TTL_SECONDS)
          .exec(),
      );
    } catch (error) {
      this.warn(
        `No se pudo invalidar la caché de ${lenderId}: ${String(error)}`,
      );
    }
  }

  onModuleDestroy(): void {
    this.redis.disconnect();
  }

  /** Guarda sin esperar: la respuesta no se demora por escribir en la caché. */
  private store(entryKey: string, value: unknown, ttlSeconds: number): void {
    const json = JSON.stringify(value);
    if (Buffer.byteLength(json) > MAX_ENTRY_BYTES) {
      return;
    }
    this.redis.set(entryKey, json, 'EX', ttlSeconds).catch((error: unknown) => {
      this.warn(`No se pudo guardar en la caché: ${String(error)}`);
    });
  }

  private generationKey(lenderId: string): string {
    return `${this.prefix}:cache:${lenderId}:gen`;
  }
}
