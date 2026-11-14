import { describe, expect, it, vi } from 'vitest';
import { buildRequest } from '@/modules/loan-requests/__fixtures__/loan-request.fixture.js';
import { GetLoanRequestUseCase } from '@/modules/loan-requests/application/use-cases/get-loan-request.use-case.js';
import { LoanRequestNotFoundError } from '@/modules/loan-requests/domain/errors/loan-request-not-found.error.js';
import type { LoanRequestRepository } from '@/modules/loan-requests/domain/repositories/loan-request.repository.js';

function setup(found: boolean) {
  const findById = vi.fn(() => Promise.resolve(found ? buildRequest() : null));
  return new GetLoanRequestUseCase({
    findById,
  } as unknown as LoanRequestRepository);
}

describe('GetLoanRequestUseCase', () => {
  it('devuelve la solicitud del prestamista', async () => {
    await expect(
      setup(true).execute('request-1', 'lender-1'),
    ).resolves.toMatchObject({ id: 'request-1' });
  });

  it('un cobrador ve la que hizo él', async () => {
    await expect(
      setup(true).execute('request-1', 'lender-1', 'collector-membership'),
    ).resolves.toMatchObject({ id: 'request-1' });
  });

  it('un cobrador no ve la de otro: se comporta como si no existiera', async () => {
    await expect(
      setup(true).execute('request-1', 'lender-1', 'other-collector'),
    ).rejects.toBeInstanceOf(LoanRequestNotFoundError);
  });

  it('si no existe, falla', async () => {
    await expect(
      setup(false).execute('request-1', 'lender-1'),
    ).rejects.toBeInstanceOf(LoanRequestNotFoundError);
  });
});
