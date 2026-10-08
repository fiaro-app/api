import { Injectable } from '@nestjs/common';
import type { CollectionAssignment } from '@/modules/collections/domain/entities/collection-assignment.entity.js';
import type { CollectionAssignmentRepository } from '@/modules/collections/domain/repositories/collection-assignment.repository.js';
import {
  toCollectionAssignment,
  toCollectionAssignmentCreateInput,
} from '@/modules/collections/infrastructure/persistence/collection-assignment.mapper.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/** Guarda a las asignaciones de cobro en PostgreSQL con Prisma. */
@Injectable()
export class PrismaCollectionAssignmentRepository implements CollectionAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** @param assignment - Asignación nueva. */
  async create(assignment: CollectionAssignment): Promise<void> {
    await this.prisma.collectionAssignment.create({
      data: toCollectionAssignmentCreateInput(assignment),
    });
  }

  /** @param loanId - El préstamo. */
  async findOpenByLoan(loanId: string): Promise<CollectionAssignment | null> {
    const row = await this.prisma.collectionAssignment.findFirst({
      where: { loanId, effectiveTo: null },
    });
    return row === null ? null : toCollectionAssignment(row);
  }

  /** @param loanId - El préstamo. */
  async listByLoan(loanId: string): Promise<readonly CollectionAssignment[]> {
    const rows = await this.prisma.collectionAssignment.findMany({
      where: { loanId },
      orderBy: { effectiveFrom: 'asc' },
    });
    return rows.map(toCollectionAssignment);
  }

  /**
   * @param collectorMembershipId - El cobrador.
   * @param date - Fecha de calendario (`AAAA-MM-DD`).
   */
  async findActiveByCollectorAndDate(
    collectorMembershipId: string,
    date: string,
  ): Promise<readonly CollectionAssignment[]> {
    const rows = await this.prisma.collectionAssignment.findMany({
      where: {
        collectorMembershipId,
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      },
      orderBy: { effectiveFrom: 'asc' },
    });
    return rows.map(toCollectionAssignment);
  }

  /** @param assignment - La asignación con sus datos ya actualizados. */
  async update(assignment: CollectionAssignment): Promise<void> {
    await this.prisma.collectionAssignment.update({
      where: { id: assignment.id },
      data: toCollectionAssignmentCreateInput(assignment),
    });
  }

  /**
   * @param collectorMembershipId - El cobrador.
   * @param asOf - Fecha de calendario (`AAAA-MM-DD`).
   */
  async listOpenByCollector(
    collectorMembershipId: string,
    asOf: string,
  ): Promise<readonly CollectionAssignment[]> {
    const rows = await this.prisma.collectionAssignment.findMany({
      where: {
        collectorMembershipId,
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: asOf } }],
      },
      orderBy: { effectiveFrom: 'asc' },
    });
    return rows.map(toCollectionAssignment);
  }

  /**
   * @param closed - Las asignaciones que terminan, con su `effectiveTo` ya puesto.
   * @param opened - Las asignaciones nuevas.
   */
  async reassign(
    closed: readonly CollectionAssignment[],
    opened: readonly CollectionAssignment[],
  ): Promise<void> {
    await this.prisma.$transaction([
      ...closed.map((assignment) =>
        this.prisma.collectionAssignment.update({
          where: { id: assignment.id },
          data: toCollectionAssignmentCreateInput(assignment),
        }),
      ),
      ...opened.map((assignment) =>
        this.prisma.collectionAssignment.create({
          data: toCollectionAssignmentCreateInput(assignment),
        }),
      ),
    ]);
  }
}
