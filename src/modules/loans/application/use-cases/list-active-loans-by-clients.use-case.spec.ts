import { describe, expect, it, vi } from 'vitest';
import { ListActiveLoansByClientsUseCase } from '@/modules/loans/application/use-cases/list-active-loans-by-clients.use-case.js';
import { Loan } from '@/modules/loans/domain/entities/loan.entity.js';
import type { LoanRepository } from '@/modules/loans/domain/repositories/loan.repository.js';

const LOAN = Loan.create({
  id: 'loan-1',
  lenderId: 'lender-1',
  clientId: 'client-1',
  principalAmount: 500_000,
  installmentCount: 20,
  installmentValue: 30_000,
  totalPayable: 600_000,
  frequency: 'DAILY',
  startDate: '2026-10-01',
  status: 'ACTIVE',
  createdByMembershipId: 'membership-1',
  createdAt: new Date('2026-10-01T00:00:00Z'),
  closedAt: null,
});

function setup() {
  const listActiveByClients = vi.fn(() => Promise.resolve([LOAN]));
  const loans = { listActiveByClients } as unknown as LoanRepository;
  return {
    useCase: new ListActiveLoansByClientsUseCase(loans),
    listActiveByClients,
  };
}

describe('ListActiveLoansByClientsUseCase', () => {
  it('devuelve los préstamos activos de los clientes como datos públicos', async () => {
    const { useCase, listActiveByClients } = setup();

    const found = await useCase.execute('lender-1', ['client-1', 'client-2']);

    expect(listActiveByClients).toHaveBeenCalledExactlyOnceWith('lender-1', [
      'client-1',
      'client-2',
    ]);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ id: 'loan-1', clientId: 'client-1' });
  });

  it('sin clientes no consulta nada', async () => {
    const { useCase, listActiveByClients } = setup();

    await expect(useCase.execute('lender-1', [])).resolves.toEqual([]);
    expect(listActiveByClients).not.toHaveBeenCalled();
  });
});
