import { describe, expect, it, vi } from 'vitest';
import {
  buildRequest,
  NEW_CLIENT,
  NOW,
  TERMS,
} from '@/modules/loan-requests/__fixtures__/loan-request.fixture.js';
import { PrismaLoanRequestRepository } from '@/modules/loan-requests/infrastructure/persistence/prisma-loan-request.repository.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

const ROW = {
  id: 'request-1',
  lenderId: 'lender-1',
  requestedByMembershipId: 'collector-membership',
  clientId: null,
  nationalId: '1020304050',
  clientFullName: NEW_CLIENT.fullName,
  clientOccupation: NEW_CLIENT.occupation,
  clientPhone: NEW_CLIENT.phone,
  clientAddress: NEW_CLIENT.address,
  ...TERMS,
  status: 'PENDING' as const,
  resolvedByMembershipId: null,
  resolvedAt: null,
  rejectionReason: null,
  loanId: null,
  createdAt: NOW,
  updatedAt: NOW,
};

function setup() {
  const create = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve(),
  );
  const findFirst = vi.fn<(args: unknown) => Promise<unknown>>();
  const findMany = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve([ROW]),
  );
  const count = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve(1),
  );
  const update = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve(),
  );
  const updateMany = vi.fn<(args: unknown) => Promise<unknown>>(() =>
    Promise.resolve({ count: 1 }),
  );
  const repository = new PrismaLoanRequestRepository({
    loanRequest: { create, findFirst, findMany, count, update, updateMany },
  } as unknown as PrismaService);
  return { repository, create, findFirst, findMany, count, update, updateMany };
}

describe('PrismaLoanRequestRepository', () => {
  it('create guarda la solicitud', async () => {
    const { repository, create } = setup();

    await repository.create(buildRequest());

    expect(create).toHaveBeenCalledOnce();
  });

  it('findById devuelve la solicitud del prestamista, o null', async () => {
    const { repository, findFirst } = setup();
    findFirst.mockResolvedValueOnce(ROW).mockResolvedValueOnce(null);

    expect(await repository.findById('request-1', 'lender-1')).toEqual(
      buildRequest(),
    );
    expect(await repository.findById('request-2', 'lender-1')).toBeNull();
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'request-1', lenderId: 'lender-1' },
    });
  });

  it('list filtra por prestamista y pagina, de la más nueva a la más antigua', async () => {
    const { repository, findMany, count } = setup();

    const page = await repository.list({
      lenderId: 'lender-1',
      page: 2,
      pageSize: 10,
    });

    expect(page).toEqual({ items: [buildRequest()], total: 1 });
    expect(findMany).toHaveBeenCalledWith({
      where: { lenderId: 'lender-1' },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: 10,
      take: 10,
    });
    expect(count).toHaveBeenCalledWith({ where: { lenderId: 'lender-1' } });
  });

  it('list suma los filtros de estado y de cobrador cuando llegan', async () => {
    const { repository, count } = setup();

    await repository.list({
      lenderId: 'lender-1',
      page: 1,
      pageSize: 10,
      status: 'PENDING',
      requestedByMembershipId: 'collector-membership',
    });

    expect(count).toHaveBeenCalledWith({
      where: {
        lenderId: 'lender-1',
        status: 'PENDING',
        requestedByMembershipId: 'collector-membership',
      },
    });
  });

  it('resolve solo toca una solicitud pendiente y dice si lo logró', async () => {
    const { repository, updateMany } = setup();
    updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const input = {
      id: 'request-1',
      lenderId: 'lender-1',
      to: 'REJECTED' as const,
      resolvedByMembershipId: 'admin-membership',
      resolvedAt: NOW,
      rejectionReason: 'No',
    };

    expect(await repository.resolve(input)).toBe(true);
    expect(await repository.resolve(input)).toBe(false);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'request-1', lenderId: 'lender-1', status: 'PENDING' },
      data: {
        status: 'REJECTED',
        resolvedByMembershipId: 'admin-membership',
        resolvedAt: NOW,
        rejectionReason: 'No',
      },
    });
  });

  it('attachLoan guarda el préstamo creado', async () => {
    const { repository, update } = setup();

    await repository.attachLoan('request-1', 'loan-1');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'request-1' },
      data: { loanId: 'loan-1' },
    });
  });

  it('reopen devuelve la solicitud a pendiente y borra su resolución', async () => {
    const { repository, update } = setup();

    await repository.reopen('request-1');

    expect(update).toHaveBeenCalledWith({
      where: { id: 'request-1' },
      data: {
        status: 'PENDING',
        resolvedByMembershipId: null,
        resolvedAt: null,
        rejectionReason: null,
      },
    });
  });
});
