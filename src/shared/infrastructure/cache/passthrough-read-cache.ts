import { Injectable } from '@nestjs/common';
import type { ReadCache } from '@/shared/application/ports/read-cache.port.js';

/** {@link ReadCache} sin caché, para cuando no hay Redis (pruebas y desarrollo sin Docker): siempre calcula. */
@Injectable()
export class PassthroughReadCache implements ReadCache {
  async getOrLoad<T>(
    _lenderId: string,
    _key: string,
    _ttlSeconds: number,
    load: () => Promise<T>,
  ): Promise<T> {
    return load();
  }

  async invalidate(): Promise<void> {
    // Sin caché no hay nada que descartar.
  }
}
