import { Global, Module } from '@nestjs/common';
import { COLLECTOR_ACCESS } from '@/shared/application/ports/collector-access.token.js';
import { PrismaCollectorAccess } from '@/shared/infrastructure/access/prisma-collector-access.js';
import { PersistenceModule } from '@/shared/infrastructure/persistence/persistence.module.js';

/**
 * Publica `COLLECTOR_ACCESS`, global: los controllers de `loans`, `clients` y `collections` usan el
 * mismo guard (`@RestrictCollectorTo`) sin importarse entre sí.
 */
@Global()
@Module({
  imports: [PersistenceModule],
  providers: [{ provide: COLLECTOR_ACCESS, useClass: PrismaCollectorAccess }],
  exports: [COLLECTOR_ACCESS],
})
export class CollectorAccessModule {}
