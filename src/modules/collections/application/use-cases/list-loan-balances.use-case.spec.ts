import { describe, expect, it, vi } from 'vitest';
import { ListLoanBalancesUseCase } from '@/modules/collections/application/use-cases/list-loan-balances.use-case.js';
import type { LoanPortfolioReadRepository } from '@/modules/collections/domain/repositories/loan-portfolio-read.repository.js';
import type { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';

const NOW = new Date('2026-09-27T12:00:00-05:00');

const loan = (id: string): LoanDetails =>
  ({
    id,
    clientId: `client-${id}`,
    startDate: '2026-09-24',
    frequency: 'DAILY',
    installmentCount: 5,
    installmentValue: 10_000,
    totalPayable: 50_000,
    status: 'ACTIVE',
    closedAt: null,
  }) as unknown as LoanDetails;

function setup() {
  const getLender = vi.fn(() =>
    Promise.resolve({
      nonWorkingWeekdays: ['SUNDAY'],
      skipNationalHolidays: false,
    }),
  );
  const listVisitRecordsByLoans = vi.fn(() => Promise.resolve([]));
  const listCollectorsByLoans = vi.fn((ids: readonly string[]) =>
    Promise.resolve(
      new Map(ids.filter((id) => id !== 'loan-0').map((id) => [id, `c-${id}`])),
    ),
  );
  const useCase = new ListLoanBalancesUseCase(
    { execute: getLender } as unknown as GetLenderUseCase,
    {
      listVisitRecordsByLoans,
      listCollectorsByLoans,
    } as unknown as LoanPortfolioReadRepository,
    { now: () => NOW },
  );
  return { useCase, getLender, listVisitRecordsByLoans, listCollectorsByLoans };
}

describe('ListLoanBalancesUseCase', () => {
  it('sin préstamos no consulta nada', async () => {
    const { useCase, getLender } = setup();

    expect(
      (await useCase.execute({ lenderId: 'l', loans: [], day: '2026-09-27' }))
        .size,
    ).toBe(0);
    expect(getLender).not.toHaveBeenCalled();
  });

  it('calcula el saldo y el cobrador del día de cada préstamo, en tandas de 500', async () => {
    const {
      useCase,
      getLender,
      listVisitRecordsByLoans,
      listCollectorsByLoans,
    } = setup();
    const loans = Array.from({ length: 1001 }, (_, index) =>
      loan(`loan-${String(index)}`),
    );

    const balances = await useCase.execute({
      lenderId: 'lender-1',
      loans,
      day: '2026-09-27',
    });

    expect(balances.size).toBe(1001);
    expect(getLender).toHaveBeenCalledOnce();
    expect(listVisitRecordsByLoans).toHaveBeenCalledTimes(3);
    expect(listCollectorsByLoans).toHaveBeenCalledWith(
      expect.any(Array),
      '2026-09-27',
    );
    expect(balances.get('loan-1')).toMatchObject({
      balance: 50_000,
      collectorMembershipId: 'c-loan-1',
    });
    expect(balances.get('loan-0')?.collectorMembershipId).toBeNull();
  });

  it('mira el saldo de una fecha pasada cuando se pide', async () => {
    const { useCase } = setup();

    const balances = await useCase.execute({
      lenderId: 'lender-1',
      loans: [loan('loan-1')],
      day: '2026-09-25',
      asOf: '2026-09-25',
    });

    expect(balances.get('loan-1')?.asOf).toBe('2026-09-25');
  });
});
