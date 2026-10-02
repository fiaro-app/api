import { describe, expect, it, vi } from 'vitest';
import type { GetLoanUseCase } from '@/modules/loans/application/use-cases/get-loan.use-case.js';
import type { MembershipDetails } from '@/modules/memberships/application/dtos/membership-details.dto.js';
import type { GetMembershipUseCase } from '@/modules/memberships/application/use-cases/get-membership.use-case.js';
import type { CreateNotificationUseCase } from '@/modules/notifications/application/use-cases/create-notification.use-case.js';
import { CreateCollectionAssignmentUseCase } from '@/modules/collections/application/use-cases/create-collection-assignment.use-case.js';
import { CollectionAssignment } from '@/modules/collections/domain/entities/collection-assignment.entity.js';
import { InvalidCollectionAssignmentDataError } from '@/modules/collections/domain/errors/invalid-collection-assignment-data.error.js';
import type { CollectionAssignmentRepository } from '@/modules/collections/domain/repositories/collection-assignment.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';

const NOW = new Date('2026-10-01T00:00:00Z');

const COLLECTOR_MEMBERSHIP: MembershipDetails = {
  id: 'membership-collector',
  userId: 'user-1',
  lenderId: 'lender-1',
  roles: ['COLLECTOR'],
  status: 'ACTIVE',
  portfolioId: 'portfolio-1',
  createdAt: NOW,
  deactivatedAt: null,
};

function setup(openAssignment: CollectionAssignment | null = null) {
  const create = vi.fn(() => Promise.resolve());
  const update = vi.fn(() => Promise.resolve());
  const findOpenByLoan = vi.fn(() => Promise.resolve(openAssignment));
  const assignments: CollectionAssignmentRepository = {
    create,
    update,
    findOpenByLoan,
    listByLoan: vi.fn(() => Promise.resolve([])),
  };
  const getLoanExecute = vi.fn(() =>
    Promise.resolve({ id: 'loan-1' } as never),
  );
  const getLoan = { execute: getLoanExecute } as unknown as GetLoanUseCase;
  const getMembershipExecute = vi.fn(() =>
    Promise.resolve(COLLECTOR_MEMBERSHIP),
  );
  const getMembership = {
    execute: getMembershipExecute,
  } as unknown as GetMembershipUseCase;
  const createNotificationExecute = vi.fn(() => Promise.resolve({} as never));
  const createNotification = {
    execute: createNotificationExecute,
  } as unknown as CreateNotificationUseCase;
  const ids: IdGenerator = { next: () => 'assignment-new' };
  const clock: Clock = { now: () => NOW };
  const useCase = new CreateCollectionAssignmentUseCase(
    assignments,
    getLoan,
    getMembership,
    createNotification,
    ids,
    clock,
  );
  return {
    useCase,
    create,
    update,
    findOpenByLoan,
    getLoanExecute,
    getMembershipExecute,
    createNotificationExecute,
  };
}

describe('CreateCollectionAssignmentUseCase', () => {
  it('crea una asignación permanente cuando el préstamo no tenía ninguna vigente', async () => {
    const {
      useCase,
      create,
      update,
      getLoanExecute,
      getMembershipExecute,
      createNotificationExecute,
    } = setup(null);

    const created = await useCase.execute({
      lenderId: 'lender-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-collector',
      effectiveFrom: '2026-10-01',
    });

    expect(getLoanExecute).toHaveBeenCalledExactlyOnceWith(
      'loan-1',
      'lender-1',
    );
    expect(getMembershipExecute).toHaveBeenCalledExactlyOnceWith(
      'membership-collector',
      'lender-1',
    );
    expect(update).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledOnce();
    expect(created.id).toBe('assignment-new');
    expect(created.effectiveTo).toBeNull();
    expect(createNotificationExecute).toHaveBeenCalledExactlyOnceWith({
      recipientUserId: 'user-1',
      lenderId: 'lender-1',
      severity: 'INFO',
      title: 'Préstamo asignado',
      body: 'Te asignaron un préstamo para cobrar.',
      relatedEntityType: 'LOAN',
      relatedEntityId: 'loan-1',
    });
  });

  it('cierra la asignación permanente vigente antes de crear la nueva', async () => {
    const open = CollectionAssignment.create({
      id: 'assignment-old',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-other',
      effectiveFrom: '2026-01-01',
      effectiveTo: null,
      createdAt: NOW,
    });
    const { useCase, update, create } = setup(open);

    await useCase.execute({
      lenderId: 'lender-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-collector',
      effectiveFrom: '2026-10-05',
    });

    expect(update).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        id: 'assignment-old',
        effectiveTo: '2026-10-04',
      }),
    );
    expect(create).toHaveBeenCalledOnce();
  });

  it('un reemplazo con effectiveTo no toca la asignación permanente', async () => {
    const open = CollectionAssignment.create({
      id: 'assignment-old',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-other',
      effectiveFrom: '2026-01-01',
      effectiveTo: null,
      createdAt: NOW,
    });
    const { useCase, update, findOpenByLoan } = setup(open);

    await useCase.execute({
      lenderId: 'lender-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-collector',
      effectiveFrom: '2026-10-05',
      effectiveTo: '2026-10-05',
    });

    expect(findOpenByLoan).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('rechaza effectiveTo anterior a effectiveFrom sin guardar nada', async () => {
    const { useCase, create } = setup();

    await expect(
      useCase.execute({
        lenderId: 'lender-1',
        loanId: 'loan-1',
        collectorMembershipId: 'membership-collector',
        effectiveFrom: '2026-10-05',
        effectiveTo: '2026-10-01',
      }),
    ).rejects.toBeInstanceOf(InvalidCollectionAssignmentDataError);
    expect(create).not.toHaveBeenCalled();
  });

  it('rechaza una membresía sin el rol COLLECTOR sin guardar nada', async () => {
    const { useCase, getMembershipExecute, create } = setup();
    getMembershipExecute.mockResolvedValueOnce({
      ...COLLECTOR_MEMBERSHIP,
      roles: ['LENDER'],
    });

    await expect(
      useCase.execute({
        lenderId: 'lender-1',
        loanId: 'loan-1',
        collectorMembershipId: 'membership-collector',
        effectiveFrom: '2026-10-01',
      }),
    ).rejects.toBeInstanceOf(InvalidCollectionAssignmentDataError);
    expect(create).not.toHaveBeenCalled();
  });
});
