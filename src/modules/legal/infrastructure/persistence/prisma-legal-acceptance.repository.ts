import { Injectable } from '@nestjs/common';
import type {
  LegalAcceptanceRepository,
  NewLegalAcceptance,
} from '@/modules/legal/domain/repositories/legal-acceptance.repository.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/** Guarda las aceptaciones legales en PostgreSQL con Prisma. */
@Injectable()
export class PrismaLegalAcceptanceRepository implements LegalAcceptanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** @param rows - Las aceptaciones. */
  async recordMany(rows: readonly NewLegalAcceptance[]): Promise<void> {
    await this.prisma.legalAcceptance.createMany({ data: [...rows] });
  }
}
