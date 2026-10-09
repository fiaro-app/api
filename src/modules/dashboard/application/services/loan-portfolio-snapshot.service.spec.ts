import { describe, expect, it, vi } from 'vitest';
import type { LoanBalanceDetails } from '@/modules/collections/application/dtos/loan-balance.dto.js';
import type { GetLoanBalanceUseCase } from '@/modules/collections/application/use-cases/get-loan-balance.use-case.js';
import type { ListCollectionAssignmentsUseCase } from '@/modules/collections/application/use-cases/list-collection-assignments.use-case.js';
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
  const getLoanBalance = vi.fn<
    (
      loanId: string,
      lenderId: string,
      asOf?: string,
    ) => Promise<LoanBalanceDetails>
  >((loanId) =>
    Promise.resolve({
      balance: 100_000,
      overdueAmount: loanId === 'late' ? 10_000 : 0,
      overdueDays: loanId === 'late' ? 4 : 0,
    } as LoanBalanceDetails),
  );
  const listAssignments = vi.fn(() =>
    Promise.resolve([
      {
        collectorMembershipId: 'old',
        effectiveFrom: '2026-01-01',
        effectiveTo: '2026-09-15',
      },
      {
        collectorMembershipId: 'new',
        effectiveFrom: '2026-09-16',
        effectiveTo: null,
      },
    ]),
  );
  const service = new LoanPortfolioSnapshotService(
    { execute: listLoans } as unknown as ListLoansUseCase,
    { execute: getLoanBalance } as unknown as GetLoanBalanceUseCase,
    { execute: listAssignments } as unknown as ListCollectionAssignmentsUseCase,
  );
  return { service, listLoans, getLoanBalance };
}

describe('LoanPortfolioSnapshotService.current', () => {
  it('pide solo los préstamos ACTIVE y su saldo de hoy, y resuelve el cobrador de hoy', async () => {
    const { service, listLoans, getLoanBalance } = setup([
      loan('late', '2026-08-01T12:00:00Z', null),
    ]);

    const records = await service.current('lender-1', '2026-10-09');

    expect(listLoans).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ACTIVE' }),
    );
    expect(getLoanBalance).toHaveBeenCalledExactlyOnceWith(
      'late',
      'lender-1',
      undefined,
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
    const { service, getLoanBalance } = setup(LOANS);

    const before = await service.asOf('lender-1', '2026-09-10');
    const after = await service.asOf('lender-1', '2026-09-30');

    expect(getLoanBalance).toHaveBeenCalledWith(
      'open',
      'lender-1',
      '2026-09-30',
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
});
