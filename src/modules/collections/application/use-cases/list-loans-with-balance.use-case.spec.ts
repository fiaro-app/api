import { describe, expect, it, vi } from 'vitest';
import type { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import type { ListLoansUseCase } from '@/modules/loans/application/use-cases/list-loans.use-case.js';
import type { GetMembershipEntryUseCase } from '@/modules/memberships/application/use-cases/get-membership-entry.use-case.js';
import { ListLoansWithBalanceUseCase } from '@/modules/collections/application/use-cases/list-loans-with-balance.use-case.js';
import { CollectionVisit } from '@/modules/collections/domain/entities/collection-visit.entity.js';
import { Payment } from '@/modules/collections/domain/entities/payment.entity.js';
import type { CollectionVisitRecord } from '@/modules/collections/domain/repositories/collection-visit-record.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';

const NOW = new Date('2026-09-27T12:00:00-05:00');

const loan = (id: string, clientId: string) => ({
  id,
  clientId,
  startDate: '2026-09-24',
  frequency: 'DAILY',
  installmentCount: 5,
  installmentValue: 10_000,
  totalPayable: 50_000,
  status: 'ACTIVE',
  closedAt: null,
});

const paidRecord = (loanId: string, amount: number): CollectionVisitRecord => ({
  visit: CollectionVisit.create({
    id: `visit-${loanId}`,
    loanId,
    collectorMembershipId: 'membership-1',
    outcome: 'PAID',
    expectedAmount: 10_000,
    promisedDate: null,
    occurredAt: NOW,
    createdAt: NOW,
  }),
  payment: Payment.create({
    id: `payment-${loanId}`,
    loanId,
    visitId: `visit-${loanId}`,
    amount,
    method: 'CASH',
    occurredAt: NOW,
    createdAt: NOW,
  }),
  reversal: null,
});

function setup(
  loans: readonly ReturnType<typeof loan>[] = [
    loan('loan-1', 'client-1'),
    loan('loan-2', 'client-2'),
  ],
) {
  const listLoans = vi.fn(() => Promise.resolve({ items: loans, total: 42 }));
  const getLender = vi.fn(() =>
    Promise.resolve({
      nonWorkingWeekdays: ['SUNDAY'],
      skipNationalHolidays: false,
    }),
  );
  const getMembership = vi.fn((id: string) =>
    Promise.resolve({ id, fullName: `Cobrador ${id}` }),
  );
  const listVisitRecordsByLoans = vi.fn(() =>
    Promise.resolve([paidRecord('loan-1', 20_000)]),
  );
  const listCollectorsByLoans = vi.fn(() =>
    Promise.resolve(new Map([['loan-1', 'membership-1']])),
  );
  const clock: Clock = { now: () => NOW };
  const useCase = new ListLoansWithBalanceUseCase(
    { execute: listLoans } as unknown as ListLoansUseCase,
    { execute: getLender } as unknown as GetLenderUseCase,
    { execute: getMembership } as unknown as GetMembershipEntryUseCase,
    {
      listVisitRecordsByLoans,
      listCollectorsByLoans,
    },
    clock,
  );
  return {
    useCase,
    listLoans,
    getLender,
    getMembership,
    listVisitRecordsByLoans,
    listCollectorsByLoans,
  };
}

describe('ListLoansWithBalanceUseCase', () => {
  it('suma a cada préstamo su saldo, su mora y su cobrador, y conserva el total sin paginar', async () => {
    const { useCase } = setup();

    const page = await useCase.execute({
      lenderId: 'lender-1',
      page: 1,
      pageSize: 20,
    });

    expect(page.total).toBe(42);
    expect(page.items).toHaveLength(2);
    const [first, second] = page.items;
    expect(first).toMatchObject({
      balance: 30_000, // 50.000 pactados - 20.000 pagados
      overdueAmount: 0, // vencían el 25 y el 26 (el 27 es domingo): 20.000, y pagó 20.000
      collector: {
        membershipId: 'membership-1',
        fullName: 'Cobrador membership-1',
      },
    });
    expect(second).toMatchObject({
      balance: 50_000,
      collector: null,
    });
    expect(first?.loan.id).toBe('loan-1');
  });

  it('hace una consulta por cosa para toda la página, no una por préstamo', async () => {
    const {
      useCase,
      getLender,
      getMembership,
      listVisitRecordsByLoans,
      listCollectorsByLoans,
    } = setup();

    await useCase.execute({ lenderId: 'lender-1', page: 1, pageSize: 20 });

    expect(getLender).toHaveBeenCalledExactlyOnceWith('lender-1');
    expect(listVisitRecordsByLoans).toHaveBeenCalledExactlyOnceWith([
      'loan-1',
      'loan-2',
    ]);
    expect(listCollectorsByLoans).toHaveBeenCalledExactlyOnceWith(
      ['loan-1', 'loan-2'],
      '2026-09-27',
    );
    expect(getMembership).toHaveBeenCalledExactlyOnceWith(
      'membership-1',
      'lender-1',
    );
  });

  it('pide el nombre de cada cobrador distinto una sola vez', async () => {
    const { useCase, getMembership, listCollectorsByLoans } = setup();
    listCollectorsByLoans.mockResolvedValueOnce(
      new Map([
        ['loan-1', 'membership-1'],
        ['loan-2', 'membership-1'],
      ]),
    );

    await useCase.execute({ lenderId: 'lender-1', page: 1, pageSize: 20 });

    expect(getMembership).toHaveBeenCalledOnce();
  });

  it('una página vacía no consulta nada más', async () => {
    const { useCase, getLender, listVisitRecordsByLoans } = setup([]);

    const page = await useCase.execute({
      lenderId: 'lender-1',
      page: 1,
      pageSize: 20,
    });

    expect(page).toEqual({ items: [], total: 42 });
    expect(getLender).not.toHaveBeenCalled();
    expect(listVisitRecordsByLoans).not.toHaveBeenCalled();
  });
});
