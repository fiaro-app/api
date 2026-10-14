import { Injectable } from '@nestjs/common';
import type { LenderLock } from '@/shared/application/ports/lender-lock.port.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/** Cuánto puede durar el trabajo con el candado tomado antes de que Prisma aborte la transacción. */
const LOCK_TIMEOUT_MS = 15_000;

/**
 * {@link LenderLock} con un candado consultivo de PostgreSQL (`pg_advisory_xact_lock`): lo
 * comparten todas las instancias de la API porque vive en la base de datos, y se suelta solo al
 * terminar la transacción que lo tomó, incluso si `work` falla.
 *
 * @remarks
 * `work` no corre dentro de esa transacción (usa sus propias conexiones): la transacción solo
 * sostiene el candado. Por eso cada escritura de `work` sigue siendo atómica por su cuenta.
 */
@Injectable()
export class PostgresLenderLock implements LenderLock {
  constructor(private readonly prisma: PrismaService) {}

  async runExclusive<T>(lenderId: string, work: () => Promise<T>): Promise<T> {
    return this.prisma.$transaction(
      async (tx) => {
        const key = `lender:${lenderId}`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
        return work();
      },
      { timeout: LOCK_TIMEOUT_MS, maxWait: LOCK_TIMEOUT_MS },
    );
  }
}
