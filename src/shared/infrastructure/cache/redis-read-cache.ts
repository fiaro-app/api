import type { OnModuleDestroy } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { ReadCache } from '@/shared/application/ports/read-cache.port.js';
import type { Warn } from '@/shared/infrastructure/messaging/repeated-warnings.js';

/** Cuánto se espera a Redis antes de seguir sin caché: una lectura nunca espera más que esto de más. */
const REDIS_TIMEOUT_MS = 150;

/** Entradas más grandes no se guardan: protegen la memoria de Redis (D-118). */
export const MAX_ENTRY_BYTES = 256 * 1024;

/** Cada cuánto se reintenta una invalidación que falló, hasta lograrla. */
export const INVALIDATION_RETRY_MS = 1_000;

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
 * Una época global (`<prefijo>:cache:epoch`) también entra en la clave: `invalidateAll` la
 * incrementa y descarta todo de una vez, para lo que escribe sin pasar por la API (D-123).
 *
 * Si una invalidación falla (Redis caído o lento justo en ese momento), el prestamista queda
 * «pendiente»: sus lecturas en este proceso se calculan sin caché y la invalidación se reintenta
 * cada segundo hasta lograrla. Así quien escribió nunca ve su dato viejo, y las demás instancias
 * lo dejan de ver en cuanto Redis vuelve, no al vencer el TTL (D-123).
 *
 * Si Redis falla o tarda, la lectura se calcula sin caché y se avisa una vez (`warn`); nunca falla
 * por la caché. Lo único que puede perderse con Redis caído es una invalidación: el TTL corto de
 * cada entrada acota cuánto puede verse un dato viejo.
 */
export class RedisReadCache implements ReadCache, OnModuleDestroy {
  /** Cálculos en curso por clave de entrada, para no repetirlos al mismo tiempo. */
  private readonly inflight = new Map<string, Promise<unknown>>();

  /** Prestamistas con una invalidación sin lograr, con el reintento programado. */
  private readonly pending = new Map<string, NodeJS.Timeout>();

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
    if (this.pending.has(lenderId)) {
      return load();
    }
    let entryKey: string;
    try {
      const [epoch, generation] = await withTimeout(
        this.redis.mget(this.epochKey(), this.generationKey(lenderId)),
      );
      entryKey = `${this.prefix}:cache:${lenderId}:${epoch ?? '0'}.${generation ?? '0'}:${key}`;
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
    if (!(await this.bumpGeneration(lenderId))) {
      this.retryLater(lenderId);
    }
  }

  async invalidateAll(): Promise<void> {
    try {
      await withTimeout(this.redis.incr(this.epochKey()));
    } catch (error) {
      this.warn(`No se pudo invalidar toda la caché: ${String(error)}`);
    }
  }

  onModuleDestroy(): void {
    for (const timer of this.pending.values()) {
      clearTimeout(timer);
    }
    this.pending.clear();
    this.redis.disconnect();
  }

  /** @returns Si se logró incrementar la generación del prestamista. */
  private async bumpGeneration(lenderId: string): Promise<boolean> {
    try {
      await withTimeout(
        this.redis
          .multi()
          .incr(this.generationKey(lenderId))
          .expire(this.generationKey(lenderId), GENERATION_TTL_SECONDS)
          .exec(),
      );
      return true;
    } catch (error) {
      this.warn(
        `No se pudo invalidar la caché de ${lenderId}, se reintenta: ${String(error)}`,
      );
      return false;
    }
  }

  /** Marca al prestamista como pendiente y reintenta hasta lograr la invalidación. */
  private retryLater(lenderId: string): void {
    clearTimeout(this.pending.get(lenderId));
    const timer = setTimeout(() => {
      void this.bumpGeneration(lenderId).then((done) => {
        if (done) {
          this.pending.delete(lenderId);
        } else {
          this.retryLater(lenderId);
        }
      });
    }, INVALIDATION_RETRY_MS);
    timer.unref();
    this.pending.set(lenderId, timer);
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

  private epochKey(): string {
    return `${this.prefix}:cache:epoch`;
  }

  private generationKey(lenderId: string): string {
    return `${this.prefix}:cache:${lenderId}:gen`;
  }
}
