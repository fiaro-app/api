import { Injectable } from '@nestjs/common';
import type { DailySettlement } from '@/modules/settlements/domain/entities/daily-settlement.entity.js';
import type {
  DailySettlementRepository,
  ListSettlementsCriteria,
  ReviewDailySettlementInput,
  SettlementsPage,
  UpsertDailySettlementInput,
} from '@/modules/settlements/domain/repositories/daily-settlement.repository.js';
import { toDailySettlement } from '@/modules/settlements/infrastructure/persistence/daily-settlement.mapper.js';
import type { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/** Guarda a los cuadres diarios en PostgreSQL con Prisma. */
@Injectable()
export class PrismaDailySettlementRepository implements DailySettlementRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * @param id - Identificador del cuadre.
   * @param lenderId - El prestamista dueño, resuelto a través de la membresía del cobrador: el
   * cuadre no tiene su propio `lenderId`.
   */
  async findById(
    id: string,
    lenderId: string,
  ): Promise<DailySettlement | null> {
    const row = await this.prisma.dailySettlement.findFirst({
      where: { id, collectorMembership: { lenderId } },
    });
    return row === null ? null : toDailySettlement(row);
  }

  /** @param criteria - Prestamista, paginación y filtros opcionales. */
  async list(criteria: ListSettlementsCriteria): Promise<SettlementsPage> {
    const where: Prisma.DailySettlementWhereInput = {
      collectorMembership: {
        lenderId: criteria.lenderId,
        ...(criteria.portfolioId ? { portfolioId: criteria.portfolioId } : {}),
      },
      ...(criteria.collectorMembershipId
        ? { collectorMembershipId: criteria.collectorMembershipId }
        : {}),
      ...(criteria.status ? { status: criteria.status } : {}),
      ...(criteria.from || criteria.to
        ? {
            date: {
              ...(criteria.from ? { gte: criteria.from } : {}),
              ...(criteria.to ? { lte: criteria.to } : {}),
            },
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.dailySettlement.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (criteria.page - 1) * criteria.pageSize,
        take: criteria.pageSize,
      }),
      this.prisma.dailySettlement.count({ where }),
    ]);
    return { items: rows.map(toDailySettlement), total };
  }

  /**
   * @param input - Datos declarados por el cobrador al cerrar. El `upsert` de Prisma resuelve en
   * una sola operación atómica si el envío crea el cuadre o reemplaza uno existente, así que dos
   * envíos a la vez del mismo cobrador y día nunca chocan (a diferencia de buscar y luego decidir
   * crear o actualizar, que sí tendría esa ventana de carrera).
   */
  async upsert(input: UpsertDailySettlementInput): Promise<DailySettlement> {
    const row = await this.prisma.dailySettlement.upsert({
      where: {
        collectorMembershipId_date: {
          collectorMembershipId: input.collectorMembershipId,
          date: input.date,
        },
      },
      create: {
        id: input.id,
        collectorMembershipId: input.collectorMembershipId,
        date: input.date,
        expectedAmount: input.expectedAmount,
        collectedAmount: input.collectedAmount,
        collectedCash: input.collectedCash,
        collectedNequi: input.collectedNequi,
        collectedTransfer: input.collectedTransfer,
        collectorNote: input.collectorNote,
        submittedAt: input.submittedAt,
      },
      update: {
        expectedAmount: input.expectedAmount,
        collectedAmount: input.collectedAmount,
        collectedCash: input.collectedCash,
        collectedNequi: input.collectedNequi,
        collectedTransfer: input.collectedTransfer,
        collectorNote: input.collectorNote,
        submittedAt: input.submittedAt,
        status: 'PENDING',
        reviewNote: null,
        reviewedByMembershipId: null,
        reviewedAt: null,
      },
    });
    return toDailySettlement(row);
  }

  /** @param input - La decisión del prestamista. */
  async review(input: ReviewDailySettlementInput): Promise<DailySettlement> {
    const row = await this.prisma.dailySettlement.update({
      where: { id: input.id },
      data: {
        status: input.status,
        reviewNote: input.reviewNote,
        reviewedByMembershipId: input.reviewedByMembershipId,
        reviewedAt: input.reviewedAt,
      },
    });
    return toDailySettlement(row);
  }
}
