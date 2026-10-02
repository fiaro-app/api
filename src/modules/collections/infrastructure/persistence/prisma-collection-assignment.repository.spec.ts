import { describe, expect, it, vi } from 'vitest';
import { CollectionAssignment } from '@/modules/collections/domain/entities/collection-assignment.entity.js';
import { PrismaCollectionAssignmentRepository } from '@/modules/collections/infrastructure/persistence/prisma-collection-assignment.repository.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

const CREATED_AT = new Date('2026-09-30T00:00:00Z');

const assignment = CollectionAssignment.create({
  id: 'assignment-1',
  loanId: 'loan-1',
  collectorMembershipId: 'membership-1',
  effectiveFrom: '2026-10-01',
  effectiveTo: null,
  createdAt: CREATED_AT,
});

const row = {
  id: 'assignment-1',
  loanId: 'loan-1',
  collectorMembershipId: 'membership-1',
  effectiveFrom: '2026-10-01',
  effectiveTo: null,
  createdAt: CREATED_AT,
};

function setup() {
  const create = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve(),
  );
  const findFirst = vi.fn<(args: unknown) => Promise<unknown>>();
  const findMany = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve([]),
  );
  const update = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve(),
  );
  const repository = new PrismaCollectionAssignmentRepository({
    collectionAssignment: { create, findFirst, findMany, update },
  } as unknown as PrismaService);
  return { repository, create, findFirst, findMany, update };
}

describe('PrismaCollectionAssignmentRepository.create', () => {
  it('guarda la asignación nueva', async () => {
    const { repository, create } = setup();

    await repository.create(assignment);

    expect(create).toHaveBeenCalledExactlyOnceWith({
      data: {
        id: 'assignment-1',
        loanId: 'loan-1',
        collectorMembershipId: 'membership-1',
        effectiveFrom: '2026-10-01',
        effectiveTo: null,
        createdAt: CREATED_AT,
      },
    });
  });
});

describe('PrismaCollectionAssignmentRepository.findOpenByLoan', () => {
  it('devuelve la asignación vigente sin fecha de fin', async () => {
    const { repository, findFirst } = setup();
    findFirst.mockResolvedValueOnce(row);

    const found = await repository.findOpenByLoan('loan-1');

    expect(findFirst).toHaveBeenCalledExactlyOnceWith({
      where: { loanId: 'loan-1', effectiveTo: null },
    });
    expect(found).toEqual(assignment);
  });

  it('devuelve null si no hay ninguna vigente', async () => {
    const { repository, findFirst } = setup();
    findFirst.mockResolvedValueOnce(null);

    await expect(repository.findOpenByLoan('loan-1')).resolves.toBeNull();
  });
});

describe('PrismaCollectionAssignmentRepository.listByLoan', () => {
  it('devuelve las asignaciones del préstamo, de la más antigua a la más nueva', async () => {
    const { repository, findMany } = setup();
    findMany.mockResolvedValueOnce([row]);

    const found = await repository.listByLoan('loan-1');

    expect(findMany).toHaveBeenCalledExactlyOnceWith({
      where: { loanId: 'loan-1' },
      orderBy: { effectiveFrom: 'asc' },
    });
    expect(found).toEqual([assignment]);
  });
});

describe('PrismaCollectionAssignmentRepository.findActiveByCollectorAndDate', () => {
  it('filtra por cobrador y por vigencia en la fecha', async () => {
    const { repository, findMany } = setup();
    findMany.mockResolvedValueOnce([row]);

    const found = await repository.findActiveByCollectorAndDate(
      'membership-1',
      '2026-10-02',
    );

    expect(findMany).toHaveBeenCalledExactlyOnceWith({
      where: {
        collectorMembershipId: 'membership-1',
        effectiveFrom: { lte: '2026-10-02' },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: '2026-10-02' } }],
      },
      orderBy: { effectiveFrom: 'asc' },
    });
    expect(found).toEqual([assignment]);
  });
});

describe('PrismaCollectionAssignmentRepository.update', () => {
  it('reemplaza los datos de la asignación', async () => {
    const { repository, update } = setup();

    await repository.update(assignment);

    expect(update).toHaveBeenCalledExactlyOnceWith({
      where: { id: 'assignment-1' },
      data: {
        id: 'assignment-1',
        loanId: 'loan-1',
        collectorMembershipId: 'membership-1',
        effectiveFrom: '2026-10-01',
        effectiveTo: null,
        createdAt: CREATED_AT,
      },
    });
  });
});
