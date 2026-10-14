import { Module } from '@nestjs/common';
import { LENDER_LOCK } from '@/shared/application/ports/lender-lock.token.js';
import { PostgresLenderLock } from '@/shared/infrastructure/persistence/postgres-lender-lock.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/**
 * Publica el cliente de Prisma para los módulos que guardan datos en PostgreSQL y el candado por
 * prestamista ({@link LENDER_LOCK}) que serializa las altas con límite.
 */
@Module({
  providers: [
    PrismaService,
    { provide: LENDER_LOCK, useClass: PostgresLenderLock },
  ],
  exports: [PrismaService, LENDER_LOCK],
})
export class PersistenceModule {}
