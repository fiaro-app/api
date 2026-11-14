import { describe, expect, it, vi } from 'vitest';
import {
  buildRequest,
  NOW,
} from '@/modules/loan-requests/__fixtures__/loan-request.fixture.js';
import { RejectLoanRequestUseCase } from '@/modules/loan-requests/application/use-cases/reject-loan-request.use-case.js';
import { LoanRequestNotFoundError } from '@/modules/loan-requests/domain/errors/loan-request-not-found.error.js';
import { LoanRequestNotPendingError } from '@/modules/loan-requests/domain/errors/loan-request-not-pending.error.js';
import type { LoanRequestRepository } from '@/modules/loan-requests/domain/repositories/loan-request.repository.js';
import type { GetMembershipUseCase } from '@/modules/memberships/application/use-cases/get-membership.use-case.js';
import type { CreateNotificationUseCase } from '@/modules/notifications/application/use-cases/create-notification.use-case.js';

const INPUT = {
  id: 'request-1',
  lenderId: 'lender-1',
  membershipId: 'admin-membership',
};

function setup(overrides: { found?: boolean; resolved?: boolean } = {}) {
  const { found = true, resolved = true } = overrides;
  const findById = vi.fn(() =>
    Promise.resolve(found ? buildRequest({ status: 'REJECTED' }) : null),
  );
  const resolve = vi.fn(() => Promise.resolve(resolved));
  const requests = { findById, resolve } as unknown as LoanRequestRepository;
  const getMembership = {
    execute: vi.fn(() => Promise.resolve({ userId: 'collector-user' })),
  };
  const createNotification = { execute: vi.fn(() => Promise.resolve({})) };
  const useCase = new RejectLoanRequestUseCase(
    requests,
    getMembership as unknown as GetMembershipUseCase,
    createNotification as unknown as CreateNotificationUseCase,
    { now: () => NOW },
  );
  return { useCase, resolve, createNotification, getMembership };
}

describe('RejectLoanRequestUseCase', () => {
  it('la marca rechazada con el motivo y se lo avisa al cobrador', async () => {
    const { useCase, resolve, createNotification, getMembership } = setup();

    const rejected = await useCase.execute({
      ...INPUT,
      reason: '  Está en mora  ',
    });

    expect(resolve).toHaveBeenCalledWith({
      id: 'request-1',
      lenderId: 'lender-1',
      to: 'REJECTED',
      resolvedByMembershipId: 'admin-membership',
      resolvedAt: NOW,
      rejectionReason: 'Está en mora',
    });
    expect(getMembership.execute).toHaveBeenCalledWith(
      'collector-membership',
      'lender-1',
    );
    expect(createNotification.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: 'collector-user',
        severity: 'WARNING',
        body: 'El administrador rechazó tu solicitud: Está en mora',
      }),
    );
    expect(rejected.status).toBe('REJECTED');
  });

  it('sin motivo el aviso no lo inventa', async () => {
    const { useCase, resolve, createNotification } = setup();

    await useCase.execute(INPUT);

    expect(resolve).toHaveBeenCalledWith(
      expect.objectContaining({ rejectionReason: null }),
    );
    expect(createNotification.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'El administrador rechazó tu solicitud de préstamo.',
      }),
    );
  });

  it('si no existe, falla sin resolver nada', async () => {
    const { useCase, resolve } = setup({ found: false });

    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(
      LoanRequestNotFoundError,
    );
    expect(resolve).not.toHaveBeenCalled();
  });

  it('si ya estaba resuelta, falla y no avisa', async () => {
    const { useCase, createNotification } = setup({ resolved: false });

    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(
      LoanRequestNotPendingError,
    );
    expect(createNotification.execute).not.toHaveBeenCalled();
  });
});
