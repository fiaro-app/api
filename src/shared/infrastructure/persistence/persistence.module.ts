import { Module } from '@nestjs/common';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/** Publica el cliente de Prisma para los módulos que guardan datos en PostgreSQL. */
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PersistenceModule {}
