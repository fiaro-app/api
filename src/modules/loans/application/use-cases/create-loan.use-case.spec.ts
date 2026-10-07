import { describe, expect, it, vi } from 'vitest';
import type { GetClientUseCase } from '@/modules/clients/application/use-cases/get-client.use-case.js';
import { CreateLoanUseCase } from '@/modules/loans/application/use-cases/create-loan.use-case.js';
import type { Loan } from '@/modules/loans/domain/entities/loan.entity.js';
import { InvalidLoanDataError } from '@/modules/loans/domain/errors/invalid-loan-data.error.js';
import type { LoanRepository } from '@/modules/loans/domain/repositories/loan.repository.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';

const NOW = new Date('2026-09-30T00:00:00Z');

const VALID_INPUT = {
  lenderId: 'lender-1',
  membershipId: 'membership-1',
  clientId: 'client-1',
  principalAmount: 500_000,
  installmentCount: 20,
  installmentValue: 30_000,
  totalPayable: 600_000,
  frequency: 'DAILY' as const,
  startDate: '2026-10-01',
};

function setup() {
  const saved: Loan[] = [];
  const create = vi.fn((loan: Loan) => {
    saved.push(loan);
    return Promise.resolve();
  });
  const loans: LoanRepository = {
    listLenderIdsWithStatus: vi.fn(() => Promise.resolve([])),
    create,
    findById: vi.fn(() => Promise.resolve(null)),
    list: vi.fn(() => Promise.resolve({ items: [], total: 0 })),
    update: vi.fn(() => Promise.resolve()),
  };
  const getClientUseCase = {
    execute: vi.fn(() => Promise.resolve({})),
  };
  const ids: IdGenerator = { next: () => 'loan-1' };
  const clock: Clock = { now: () => NOW };
  return {
    useCase: new CreateLoanUseCase(
      loans,
      getClientUseCase as unknown as GetClientUseCase,
      ids,
      clock,
    ),
    create,
    getClientUseCase,
    saved,
  };
}

describe('CreateLoanUseCase', () => {
  it('crea el préstamo ACTIVE tras confirmar que el cliente es del prestamista de la sesión', async () => {
    const { useCase, saved, getClientUseCase } = setup();

    const created = await useCase.execute(VALID_INPUT);

    expect(getClientUseCase.execute).toHaveBeenCalledExactlyOnceWith(
      'client-1',
      'lender-1',
    );
    expect(created).toEqual({
      id: 'loan-1',
      clientId: 'client-1',
      principalAmount: 500_000,
      installmentCount: 20,
      installmentValue: 30_000,
      totalPayable: 600_000,
      frequency: 'DAILY',
      startDate: '2026-10-01',
      status: 'ACTIVE',
      createdByMembershipId: 'membership-1',
      createdAt: NOW,
      closedAt: null,
    });
    expect(saved).toHaveLength(1);
    expect(saved[0]?.lenderId).toBe('lender-1');
  });

  it('propaga el error del cliente sin llegar a guardar el préstamo', async () => {
    const { useCase, create, getClientUseCase } = setup();
    const notFound = new Error('cliente no existe');
    getClientUseCase.execute.mockRejectedValueOnce(notFound);

    await expect(useCase.execute(VALID_INPUT)).rejects.toBe(notFound);
    expect(create).not.toHaveBeenCalled();
  });

  it('rechaza datos que no cumplen el contrato sin guardar nada', async () => {
    const { useCase, create } = setup();

    await expect(
      useCase.execute({ ...VALID_INPUT, principalAmount: 0 }),
    ).rejects.toBeInstanceOf(InvalidLoanDataError);
    expect(create).not.toHaveBeenCalled();
  });
});
