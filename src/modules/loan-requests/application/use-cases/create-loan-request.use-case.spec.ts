import { describe, expect, it, vi } from 'vitest';
import {
  NEW_CLIENT,
  NOW,
  TERMS,
} from '@/modules/loan-requests/__fixtures__/loan-request.fixture.js';
import { CreateLoanRequestUseCase } from '@/modules/loan-requests/application/use-cases/create-loan-request.use-case.js';
import type { FindClientIdByNationalIdUseCase } from '@/modules/loan-requests/application/use-cases/find-client-id-by-national-id.use-case.js';
import { LoanRequestClientDataRequiredError } from '@/modules/loan-requests/domain/errors/loan-request-client-data-required.error.js';
import type { LoanRequestRepository } from '@/modules/loan-requests/domain/repositories/loan-request.repository.js';
import type { ListActiveMembershipsByRolesUseCase } from '@/modules/memberships/application/use-cases/list-active-memberships-by-roles.use-case.js';
import type { CreateNotificationUseCase } from '@/modules/notifications/application/use-cases/create-notification.use-case.js';

const INPUT = {
  lenderId: 'lender-1',
  membershipId: 'collector-membership',
  nationalId: '1.020.304.050',
  ...TERMS,
};

function setup(existingClientId: string | null) {
  const create = vi.fn(() => Promise.resolve());
  const requests = { create } as unknown as LoanRequestRepository;
  const findClientId = {
    execute: vi.fn(() => Promise.resolve(existingClientId)),
  };
  const listMemberships = {
    execute: vi.fn(() =>
      Promise.resolve([{ userId: 'admin-user-1' }, { userId: 'admin-user-2' }]),
    ),
  };
  const createNotification = { execute: vi.fn(() => Promise.resolve({})) };
  const useCase = new CreateLoanRequestUseCase(
    requests,
    findClientId as unknown as FindClientIdByNationalIdUseCase,
    listMemberships as unknown as ListActiveMembershipsByRolesUseCase,
    createNotification as unknown as CreateNotificationUseCase,
    { next: () => 'request-1' },
    { now: () => NOW },
  );
  return { useCase, create, findClientId, listMemberships, createNotification };
}

describe('CreateLoanRequestUseCase', () => {
  it('con una cédula nueva guarda al cliente propuesto y avisa a cada administrador', async () => {
    const { useCase, create, listMemberships, createNotification } =
      setup(null);

    const created = await useCase.execute({ ...INPUT, client: NEW_CLIENT });

    expect(created).toMatchObject({
      id: 'request-1',
      status: 'PENDING',
      clientId: null,
      nationalId: '1020304050',
      newClient: NEW_CLIENT,
      requestedByMembershipId: 'collector-membership',
      ...TERMS,
    });
    expect(create).toHaveBeenCalledOnce();
    expect(listMemberships.execute).toHaveBeenCalledWith('lender-1', [
      'OWNER',
      'LENDER',
    ]);
    expect(createNotification.execute).toHaveBeenCalledTimes(2);
    expect(createNotification.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: 'admin-user-2',
        lenderId: 'lender-1',
        title: 'Solicitud de préstamo',
      }),
    );
  });

  it('con una cédula que ya existe apunta al cliente y no guarda datos personales', async () => {
    const { useCase } = setup('client-1');

    const created = await useCase.execute({ ...INPUT, client: NEW_CLIENT });

    expect(created).toMatchObject({ clientId: 'client-1', newClient: null });
  });

  it('con una cédula que ya existe no exige los datos del cliente', async () => {
    const { useCase } = setup('client-1');

    await expect(useCase.execute(INPUT)).resolves.toMatchObject({
      clientId: 'client-1',
    });
  });

  it('si la cédula no existe y no vienen los datos del cliente, rechaza sin guardar ni avisar', async () => {
    const { useCase, create, createNotification } = setup(null);

    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(
      LoanRequestClientDataRequiredError,
    );
    expect(create).not.toHaveBeenCalled();
    expect(createNotification.execute).not.toHaveBeenCalled();
  });
});
