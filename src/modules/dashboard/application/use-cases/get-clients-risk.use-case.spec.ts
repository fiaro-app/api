import { describe, expect, it, vi } from 'vitest';
import { GetClientsRiskUseCase } from '@/modules/dashboard/application/use-cases/get-clients-risk.use-case.js';

const loan = (id: string, clientId: string, status: string) => ({
  id,
  clientId,
  status,
});

function setup(loans: Record<string, ReturnType<typeof loan>[]>) {
  const listLoans = {
    execute: vi.fn(({ clientId }: { clientId: string }) => {
      const items = loans[clientId] ?? [];
      return Promise.resolve({ items, total: items.length });
    }),
  };
  const listLoanBalances = {
    execute: vi.fn(() =>
      Promise.resolve(
        new Map([
          ['a1', { balance: 100_000, overdueAmount: 50_000, overdueDays: 20 }],
          ['a2', { balance: 100_000, overdueAmount: 10_000, overdueDays: 3 }],
          ['b1', { balance: 80_000, overdueAmount: 0, overdueDays: 0 }],
        ]),
      ),
    ),
  };
  const clock = { now: () => new Date('2026-10-15T15:00:00Z') };
  const useCase = new GetClientsRiskUseCase(
    listLoans as never,
    listLoanBalances as never,
    clock,
  );
  return { useCase, listLoanBalances };
}

describe('GetClientsRiskUseCase', () => {
  it('puntúa cada cliente con sus préstamos, uno por uno y en el orden pedido', async () => {
    const { useCase, listLoanBalances } = setup({
      A: [
        loan('a1', 'A', 'ACTIVE'),
        loan('a2', 'A', 'ACTIVE'),
        loan('a0', 'A', 'PAID_OFF'),
        loan('ax', 'A', 'CANCELED'),
      ],
      B: [loan('b1', 'B', 'ACTIVE')],
    });

    const result = await useCase.execute({
      lenderId: 'l',
      clientIds: ['B', 'A', 'N'],
    });

    expect(result.map((r) => r.clientId)).toEqual(['B', 'A', 'N']);
    expect(result[0]).toMatchObject({ level: 'LOW', loansCount: 1, score: 0 });
    expect(result[1]).toMatchObject({ loansCount: 3, level: 'HIGH' });
    expect(result[1]?.factors.map((f) => f.code)).toEqual([
      'OVERDUE_DAYS',
      'OVERDUE_SHARE',
      'MULTIPLE_LOANS_IN_ARREARS',
      'PAID_LOANS',
    ]);
    expect(result[2]).toMatchObject({
      level: 'LOW',
      loansCount: 0,
      factors: [],
    });
    expect(listLoanBalances.execute).toHaveBeenCalledTimes(1);
  });
});
