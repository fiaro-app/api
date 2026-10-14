import { describe, expect, it, vi } from 'vitest';
import type {
  ListLoanBalancesUseCase,
  LoanBalanceSnapshot,
} from '@/modules/collections/application/use-cases/list-loan-balances.use-case.js';
import { LoanPortfolioSnapshotService } from '@/modules/dashboard/application/services/loan-portfolio-snapshot.service.js';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';
import type { ListLoansUseCase } from '@/modules/loans/application/use-cases/list-loans.use-case.js';

const loan = (
  id: string,
  createdAt: string,
  closedAt: string | null,
  status: LoanDetails['status'] = 'ACTIVE',
): LoanDetails =>
  ({
    id,
    clientId: `client-${id}`,
    status,
    createdAt: new Date(createdAt),
    closedAt: closedAt === null ? null : new Date(closedAt),
  }) as LoanDetails;

function setup(loans: readonly LoanDetails[]) {
  const listLoans = vi.fn(() =>
    Promise.resolve({ items: loans, total: loans.length }),
  );
  const listLoanBalances = vi.fn(
    (input: { loans: readonly LoanDetails[]; day: string; asOf?: string }) =>
      Promise.resolve(
        new Map<string, LoanBalanceSnapshot>(
          input.loans.map((item) => [
            item.id,
            {
              balance: 100_000,
              overdueAmount: item.id === 'late' ? 10_000 : 0,
              overdueDays: item.id === 'late' ? 4 : 0,
              collectorMembershipId: input.day < '2026-09-16' ? 'old' : 'new',
            } as LoanBalanceSnapshot,
          ]),
        ),
      ),
  );
  const service = new LoanPortfolioSnapshotService(
    { execute: listLoans } as unknown as ListLoansUseCase,
    { execute: listLoanBalances } as unknown as ListLoanBalancesUseCase,
  );
  return { service, listLoans, listLoanBalances };
}

describe('LoanPortfolioSnapshotService.current', () => {
  it('pide solo los préstamos ACTIVE y su saldo de hoy, y resuelve el cobrador de hoy', async () => {
    const { service, listLoans, listLoanBalances } = setup([
      loan('late', '2026-08-01T12:00:00Z', null),
    ]);

    const records = await service.current('lender-1', '2026-10-09');

    expect(listLoans).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE' }),
    );
    expect(listLoanBalances).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        lenderId: 'lender-1',
        day: '2026-10-09',
        asOf: undefined,
      }),
    );
    expect(records).toEqual([
      {
        clientId: 'client-late',
        balance: 100_000,
        overdueAmount: 10_000,
        overdueDays: 4,
        collectorMembershipId: 'new',
      },
    ]);
  });
});

describe('LoanPortfolioSnapshotService.asOf', () => {
  const LOANS = [
    loan('open', '2026-08-01T12:00:00Z', null),
    loan(
      'closed-later',
      '2026-08-01T12:00:00Z',
      '2026-10-02T12:00:00Z',
      'PAID_OFF',
    ),
    loan(
      'closed-before',
      '2026-08-01T12:00:00Z',
      '2026-09-10T12:00:00Z',
      'PAID_OFF',
    ),
    loan('created-after', '2026-10-01T12:00:00Z', null),
  ];

  it('incluye solo los préstamos que ya existían y seguían abiertos ese día', async () => {
    const { service, listLoans } = setup(LOANS);

    const records = await service.asOf('lender-1', '2026-09-30');

    expect(listLoans).toHaveBeenCalledWith(
      expect.objectContaining({ status: undefined }),
    );
    expect(records.map((r) => r.clientId)).toEqual([
      'client-open',
      'client-closed-later',
    ]);
  });

  it('calcula el saldo de esa fecha y resuelve el cobrador que tenía asignado entonces', async () => {
    const { service, listLoanBalances } = setup(LOANS);

    const before = await service.asOf('lender-1', '2026-09-10');
    const after = await service.asOf('lender-1', '2026-09-30');

    expect(listLoanBalances).toHaveBeenCalledWith(
      expect.objectContaining({ day: '2026-09-30', asOf: '2026-09-30' }),
    );
    expect(before[0]?.collectorMembershipId).toBe('old');
    expect(after[0]?.collectorMembershipId).toBe('new');
  });

  it('un préstamo cerrado el mismo día ya no cuenta ese día', async () => {
    const { service } = setup([
      loan(
        'closes-today',
        '2026-08-01T12:00:00Z',
        '2026-09-30T12:00:00Z',
        'PAID_OFF',
      ),
    ]);

    const records = await service.asOf('lender-1', '2026-09-30');

    expect(records).toEqual([]);
  });

  it('un préstamo sin saldo calculado sale en cero y sin cobrador', async () => {
    const { service, listLoanBalances } = setup([
      loan('open', '2026-08-01T12:00:00Z', null),
    ]);
    listLoanBalances.mockResolvedValueOnce(new Map());

    expect(await service.current('lender-1', '2026-10-09')).toEqual([
      {
        clientId: 'client-open',
        balance: 0,
        overdueAmount: 0,
        overdueDays: 0,
        collectorMembershipId: null,
      },
    ]);
  });
});
