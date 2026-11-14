import { describe, expect, it, vi } from 'vitest';
import type { CreateClientUseCase } from '@/modules/clients/application/use-cases/create-client.use-case.js';
import type { CreateCollectionAssignmentUseCase } from '@/modules/collections/application/use-cases/create-collection-assignment.use-case.js';
import type { CreateLoanUseCase } from '@/modules/loans/application/use-cases/create-loan.use-case.js';
import {
  buildRequest,
  NEW_CLIENT,
  NOW,
  TERMS,
} from '@/modules/loan-requests/__fixtures__/loan-request.fixture.js';
import { ApproveLoanRequestUseCase } from '@/modules/loan-requests/application/use-cases/approve-loan-request.use-case.js';
import { LoanRequestClientDataRequiredError } from '@/modules/loan-requests/domain/errors/loan-request-client-data-required.error.js';
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

function setup(
  options: {
    request?: ReturnType<typeof buildRequest> | null;
    resolved?: boolean;
  } = {},
) {
  const request =
    options.request === undefined ? buildRequest() : options.request;
  const approved =
    request === null
      ? null
      : buildRequest({
          clientId: request.clientId,
          newClient: request.newClient,
          status: 'APPROVED',
          loanId: 'loan-1',
        });
  const findById = vi
    .fn<() => Promise<ReturnType<typeof buildRequest> | null>>()
    .mockResolvedValueOnce(request)
    .mockResolvedValue(approved);
  const resolve = vi.fn(() => Promise.resolve(options.resolved ?? true));
  const attachLoan = vi.fn(() => Promise.resolve());
  const reopen = vi.fn(() => Promise.resolve());
  const requests = {
    findById,
    resolve,
    attachLoan,
    reopen,
  } as unknown as LoanRequestRepository;
  const createClient = {
    execute: vi.fn(() => Promise.resolve({ id: 'client-new' })),
  };
  const createLoan = {
    execute: vi.fn(() => Promise.resolve({ id: 'loan-1' })),
  };
  const createAssignment = { execute: vi.fn(() => Promise.resolve({})) };
  const getMembership = {
    execute: vi.fn(() => Promise.resolve({ userId: 'collector-user' })),
  };
  const createNotification = { execute: vi.fn(() => Promise.resolve({})) };
  const useCase = new ApproveLoanRequestUseCase(
    requests,
    createClient as unknown as CreateClientUseCase,
    createLoan as unknown as CreateLoanUseCase,
    createAssignment as unknown as CreateCollectionAssignmentUseCase,
    getMembership as unknown as GetMembershipUseCase,
    createNotification as unknown as CreateNotificationUseCase,
    { now: () => NOW },
  );
  return {
    useCase,
    resolve,
    attachLoan,
    reopen,
    createClient,
    createLoan,
    createAssignment,
    createNotification,
  };
}

describe('ApproveLoanRequestUseCase', () => {
  it('crea el cliente nuevo, el préstamo y la asignación al cobrador, y le avisa', async () => {
    const {
      useCase,
      resolve,
      createClient,
      createLoan,
      createAssignment,
      attachLoan,
      createNotification,
    } = setup();

    const approved = await useCase.execute(INPUT);

    expect(resolve).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'APPROVED',
        resolvedByMembershipId: 'admin-membership',
      }),
    );
    expect(createClient.execute).toHaveBeenCalledWith({
      lenderId: 'lender-1',
      nationalId: '1020304050',
      ...NEW_CLIENT,
    });
    expect(createLoan.execute).toHaveBeenCalledWith({
      lenderId: 'lender-1',
      membershipId: 'admin-membership',
      clientId: 'client-new',
      ...TERMS,
    });
    expect(createAssignment.execute).toHaveBeenCalledWith({
      lenderId: 'lender-1',
      loanId: 'loan-1',
      collectorMembershipId: 'collector-membership',
      effectiveFrom: TERMS.startDate,
    });
    expect(attachLoan).toHaveBeenCalledWith('request-1', 'loan-1');
    expect(createNotification.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: 'collector-user',
        relatedEntityType: 'LOAN',
        relatedEntityId: 'loan-1',
      }),
    );
    expect(approved).toMatchObject({ status: 'APPROVED', loanId: 'loan-1' });
  });

  it('aplica los ajustes del administrador al cliente y al préstamo', async () => {
    const { useCase, createClient, createLoan, createAssignment } = setup();

    await useCase.execute({
      ...INPUT,
      client: { phone: '+573009998877' },
      loan: { principalAmount: 400_000, startDate: '2026-10-20' },
    });

    expect(createClient.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '+573009998877',
        fullName: NEW_CLIENT.fullName,
      }),
    );
    expect(createLoan.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        principalAmount: 400_000,
        startDate: '2026-10-20',
      }),
    );
    expect(createAssignment.execute).toHaveBeenCalledWith(
      expect.objectContaining({ effectiveFrom: '2026-10-20' }),
    );
  });

  it('con un cliente existente no crea otro', async () => {
    const { useCase, createClient, createLoan } = setup({
      request: buildRequest({ clientId: 'client-1', newClient: null }),
    });

    await useCase.execute(INPUT);

    expect(createClient.execute).not.toHaveBeenCalled();
    expect(createLoan.execute).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: 'client-1' }),
    );
  });

  it('si no existe, falla sin reservar nada', async () => {
    const { useCase, resolve } = setup({ request: null });

    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(
      LoanRequestNotFoundError,
    );
    expect(resolve).not.toHaveBeenCalled();
  });

  it('si otro administrador ya la resolvió, falla sin crear nada', async () => {
    const { useCase, createLoan } = setup({ resolved: false });

    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(
      LoanRequestNotPendingError,
    );
    expect(createLoan.execute).not.toHaveBeenCalled();
  });

  it('si la solicitud no trae cliente ni datos para crearlo, la devuelve a pendiente', async () => {
    const { useCase, reopen } = setup({
      request: buildRequest({ newClient: null }),
    });

    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(
      LoanRequestClientDataRequiredError,
    );
    expect(reopen).toHaveBeenCalledWith('request-1');
  });

  it('si el préstamo falla, la devuelve a pendiente y no avisa', async () => {
    const { useCase, createLoan, reopen, attachLoan, createNotification } =
      setup();
    createLoan.execute.mockRejectedValueOnce(new Error('boom'));

    await expect(useCase.execute(INPUT)).rejects.toThrow('boom');
    expect(reopen).toHaveBeenCalledWith('request-1');
    expect(attachLoan).not.toHaveBeenCalled();
    expect(createNotification.execute).not.toHaveBeenCalled();
  });
});
