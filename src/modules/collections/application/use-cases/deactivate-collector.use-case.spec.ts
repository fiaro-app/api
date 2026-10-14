import { describe, expect, it, vi } from 'vitest';
import type { GetLoanUseCase } from '@/modules/loans/application/use-cases/get-loan.use-case.js';
import type { MembershipDetails } from '@/modules/memberships/application/dtos/membership-details.dto.js';
import type { DeactivateMembershipUseCase } from '@/modules/memberships/application/use-cases/deactivate-membership.use-case.js';
import type { GetMembershipUseCase } from '@/modules/memberships/application/use-cases/get-membership.use-case.js';
import { MembershipNotFoundError } from '@/modules/memberships/domain/errors/membership-not-found.error.js';
import type { CreateNotificationUseCase } from '@/modules/notifications/application/use-cases/create-notification.use-case.js';
import { DeactivateCollectorUseCase } from '@/modules/collections/application/use-cases/deactivate-collector.use-case.js';
import { CollectionAssignment } from '@/modules/collections/domain/entities/collection-assignment.entity.js';
import { CollectorHasScheduledAssignmentsError } from '@/modules/collections/domain/errors/collector-has-scheduled-assignments.error.js';
import { CollectorNotFoundError } from '@/modules/collections/domain/errors/collector-not-found.error.js';
import { InvalidCollectionAssignmentDataError } from '@/modules/collections/domain/errors/invalid-collection-assignment-data.error.js';
import type { CollectionAssignmentRepository } from '@/modules/collections/domain/repositories/collection-assignment.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';

const NOW = new Date('2026-10-07T15:00:00Z');
const CREATED_AT = new Date('2026-09-01T00:00:00Z');

type InvalidDestinationFixture =
  'self' | 'not-found' | 'inactive' | 'wrong-role';
type InvalidDestinationRow = readonly [
  string,
  string,
  InvalidDestinationFixture,
];

const INVALID_DESTINATIONS: readonly InvalidDestinationRow[] = [
  ['el mismo que se da de baja', 'membership-collector', 'self'],
  ['no existe', 'membership-2', 'not-found'],
  ['inactivo', 'membership-2', 'inactive'],
  ['sin el rol COLLECTOR', 'membership-2', 'wrong-role'],
];

const COLLECTOR: MembershipDetails = {
  id: 'membership-collector',
  userId: 'user-collector',
  lenderId: 'lender-1',
  roles: ['COLLECTOR'],
  status: 'ACTIVE',
  portfolioId: 'portfolio-1',
  createdAt: CREATED_AT,
  deactivatedAt: null,
};

function destination(id: string, userId: string): MembershipDetails {
  return { ...COLLECTOR, id, userId };
}

function openAssignment(
  loanId: string,
  effectiveFrom = '2026-09-01',
): CollectionAssignment {
  return CollectionAssignment.create({
    id: `assignment-${loanId}`,
    loanId,
    collectorMembershipId: COLLECTOR.id,
    effectiveFrom,
    effectiveTo: null,
    createdAt: CREATED_AT,
  });
}

function setup(
  options: {
    readonly collector?: MembershipDetails;
    readonly open?: readonly CollectionAssignment[];
  } = {},
) {
  const listOpenByCollector = vi.fn(() => Promise.resolve(options.open ?? []));
  const reassign = vi.fn(() => Promise.resolve());
  const assignments: CollectionAssignmentRepository = {
    listOpenByCollector,
    reassign,
    create: vi.fn(() => Promise.resolve()),
    update: vi.fn(() => Promise.resolve()),
    findOpenByLoan: vi.fn(() => Promise.resolve(null)),
    listByLoan: vi.fn(() => Promise.resolve([])),
    findActiveByCollectorAndDate: vi.fn(() => Promise.resolve([])),
  };
  const getMembership =
    vi.fn<(id: string, lenderId: string) => Promise<MembershipDetails>>();
  getMembership.mockResolvedValueOnce(options.collector ?? COLLECTOR);
  const deactivateMembership = vi.fn(() => Promise.resolve({} as never));
  const getLoan = vi.fn(() => Promise.resolve({ status: 'ACTIVE' } as never));
  const createNotification = vi.fn(() => Promise.resolve({} as never));
  let nextId = 0;
  const ids: IdGenerator = { next: () => `assignment-new-${String(++nextId)}` };
  const clock: Clock = { now: () => NOW };
  const useCase = new DeactivateCollectorUseCase(
    assignments,
    { execute: getMembership } as unknown as GetMembershipUseCase,
    { execute: deactivateMembership } as unknown as DeactivateMembershipUseCase,
    { execute: getLoan } as unknown as GetLoanUseCase,
    { execute: createNotification } as unknown as CreateNotificationUseCase,
    ids,
    clock,
  );
  const queueDestination = (id: string, userId: string): void => {
    getMembership.mockResolvedValueOnce(destination(id, userId));
  };
  return {
    useCase,
    listOpenByCollector,
    reassign,
    getMembership,
    queueDestination,
    deactivateMembership,
    getLoan,
    createNotification,
  };
}

describe('DeactivateCollectorUseCase', () => {
  it('reasigna cada préstamo activo, antes de dar de baja, y avisa a cada cobrador nuevo', async () => {
    const open = [openAssignment('loan-1'), openAssignment('loan-2')];
    const ctx = setup({ open });
    ctx.queueDestination('membership-2', 'user-2');
    ctx.queueDestination('membership-3', 'user-3');

    const result = await ctx.useCase.execute({
      lenderId: 'lender-1',
      collectorMembershipId: 'membership-collector',
      reassignments: [
        { loanId: 'loan-1', collectorMembershipId: 'membership-2' },
        { loanId: 'loan-2', collectorMembershipId: 'membership-3' },
      ],
    });

    // La fecha exacta de cierre/apertura la prueba collector-reassignment-planner.spec.ts; aquí
    // solo importa que el plan llegue intacto al repositorio y a quien recibe cada préstamo.
    expect(ctx.reassign).toHaveBeenCalledExactlyOnceWith(
      [
        expect.objectContaining({ loanId: 'loan-1' }),
        expect.objectContaining({ loanId: 'loan-2' }),
      ],
      [
        expect.objectContaining({
          loanId: 'loan-1',
          collectorMembershipId: 'membership-2',
        }),
        expect.objectContaining({
          loanId: 'loan-2',
          collectorMembershipId: 'membership-3',
        }),
      ],
    );
    expect(ctx.createNotification).toHaveBeenCalledTimes(2);
    expect(ctx.createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: 'user-2',
        title: 'Préstamo asignado',
      }),
    );
    expect(result).toEqual({
      membershipId: 'membership-collector',
      reassignedLoans: 2,
    });
    // El orden protege a los préstamos: nunca quedan sin cobrador si algo falla a medio camino.
    const reassignOrder = ctx.reassign.mock.invocationCallOrder[0] ?? -1;
    const deactivateOrder =
      ctx.deactivateMembership.mock.invocationCallOrder[0] ?? -1;
    expect(reassignOrder).toBeLessThan(deactivateOrder);
  });

  it('rechaza una membresía sin el rol COLLECTOR', async () => {
    const nonCollector: MembershipDetails = { ...COLLECTOR, roles: ['LENDER'] };
    const ctx = setup({ collector: nonCollector });

    await expect(
      ctx.useCase.execute({
        lenderId: 'lender-1',
        collectorMembershipId: 'membership-collector',
        reassignments: [],
      }),
    ).rejects.toBeInstanceOf(CollectorNotFoundError);
    expect(ctx.listOpenByCollector).not.toHaveBeenCalled();
    expect(ctx.deactivateMembership).not.toHaveBeenCalled();
  });

  it('rechaza si el cobrador tiene asignaciones programadas para después de hoy', async () => {
    const open = [openAssignment('loan-1', '2026-10-10')];
    const ctx = setup({ open });

    await expect(
      ctx.useCase.execute({
        lenderId: 'lender-1',
        collectorMembershipId: 'membership-collector',
        reassignments: [],
      }),
    ).rejects.toBeInstanceOf(CollectorHasScheduledAssignmentsError);
    expect(ctx.getLoan).not.toHaveBeenCalled();
    expect(ctx.deactivateMembership).not.toHaveBeenCalled();
  });

  it('sin préstamos asignados, se da de baja sin reasignar ni avisar a nadie', async () => {
    const ctx = setup({ open: [] });

    const result = await ctx.useCase.execute({
      lenderId: 'lender-1',
      collectorMembershipId: 'membership-collector',
      reassignments: [],
    });

    expect(ctx.reassign).not.toHaveBeenCalled();
    expect(ctx.deactivateMembership).toHaveBeenCalledExactlyOnceWith(
      'membership-collector',
      'lender-1',
    );
    expect(ctx.createNotification).not.toHaveBeenCalled();
    expect(result).toEqual({
      membershipId: 'membership-collector',
      reassignedLoans: 0,
    });
  });

  it('cierra, sin reasignar, la asignación de un préstamo que ya no está activo', async () => {
    const open = [openAssignment('loan-saldado')];
    const ctx = setup({ open });
    ctx.getLoan.mockResolvedValueOnce({ status: 'PAID_OFF' } as never);

    const result = await ctx.useCase.execute({
      lenderId: 'lender-1',
      collectorMembershipId: 'membership-collector',
      reassignments: [],
    });

    expect(ctx.reassign).toHaveBeenCalledExactlyOnceWith(
      [expect.objectContaining({ loanId: 'loan-saldado' })],
      [],
    );
    expect(ctx.createNotification).not.toHaveBeenCalled();
    expect(result.reassignedLoans).toBe(0);
  });

  it('rechaza si falta el cobrador nuevo de un préstamo activo', async () => {
    const open = [openAssignment('loan-1')];
    const ctx = setup({ open });

    await expect(
      ctx.useCase.execute({
        lenderId: 'lender-1',
        collectorMembershipId: 'membership-collector',
        reassignments: [],
      }),
    ).rejects.toBeInstanceOf(InvalidCollectionAssignmentDataError);
    expect(ctx.reassign).not.toHaveBeenCalled();
    expect(ctx.deactivateMembership).not.toHaveBeenCalled();
  });

  it.each(INVALID_DESTINATIONS)(
    'rechaza un cobrador destino %s, sin reasignar nada',
    async (_label, destinationId, fixture) => {
      const open = [openAssignment('loan-1')];
      const ctx = setup({ open });
      if (fixture === 'not-found') {
        ctx.getMembership.mockRejectedValueOnce(
          new MembershipNotFoundError(destinationId),
        );
      } else if (fixture === 'inactive') {
        ctx.getMembership.mockResolvedValueOnce({
          ...destination(destinationId, 'user-2'),
          status: 'INACTIVE',
        });
      } else if (fixture === 'wrong-role') {
        ctx.getMembership.mockResolvedValueOnce({
          ...destination(destinationId, 'user-2'),
          roles: ['LENDER'],
        });
      }

      await expect(
        ctx.useCase.execute({
          lenderId: 'lender-1',
          collectorMembershipId: 'membership-collector',
          reassignments: [
            { loanId: 'loan-1', collectorMembershipId: destinationId },
          ],
        }),
      ).rejects.toBeInstanceOf(InvalidCollectionAssignmentDataError);
      expect(ctx.reassign).not.toHaveBeenCalled();
    },
  );

  it('propaga sin convertir un error inesperado al buscar el cobrador destino', async () => {
    const open = [openAssignment('loan-1')];
    const ctx = setup({ open });
    const unexpected = new Error('conexión caída');
    ctx.getMembership.mockRejectedValueOnce(unexpected);

    await expect(
      ctx.useCase.execute({
        lenderId: 'lender-1',
        collectorMembershipId: 'membership-collector',
        reassignments: [
          { loanId: 'loan-1', collectorMembershipId: 'membership-2' },
        ],
      }),
    ).rejects.toBe(unexpected);
    expect(ctx.reassign).not.toHaveBeenCalled();
  });

  it('avisa una sola vez, en plural, cuando el mismo cobrador recibe varios préstamos', async () => {
    const open = [openAssignment('loan-1'), openAssignment('loan-2')];
    const ctx = setup({ open });
    ctx.queueDestination('membership-2', 'user-2');
    ctx.queueDestination('membership-2', 'user-2');

    await ctx.useCase.execute({
      lenderId: 'lender-1',
      collectorMembershipId: 'membership-collector',
      reassignments: [
        { loanId: 'loan-1', collectorMembershipId: 'membership-2' },
        { loanId: 'loan-2', collectorMembershipId: 'membership-2' },
      ],
    });

    expect(ctx.createNotification).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        recipientUserId: 'user-2',
        title: 'Préstamos asignados',
        body: 'Te asignaron 2 préstamos para cobrar.',
      }),
    );
  });
});
