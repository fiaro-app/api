import { describe, expect, it, vi } from 'vitest';
import { buildRequest } from '@/modules/loan-requests/__fixtures__/loan-request.fixture.js';
import { ListLoanRequestsUseCase } from '@/modules/loan-requests/application/use-cases/list-loan-requests.use-case.js';
import type { LoanRequestRepository } from '@/modules/loan-requests/domain/repositories/loan-request.repository.js';

describe('ListLoanRequestsUseCase', () => {
  it('pasa el criterio al repositorio y devuelve la página como datos públicos', async () => {
    const list = vi.fn(() =>
      Promise.resolve({ items: [buildRequest()], total: 1 }),
    );
    const useCase = new ListLoanRequestsUseCase({
      list,
    } as unknown as LoanRequestRepository);
    const input = {
      lenderId: 'lender-1',
      page: 1,
      pageSize: 20,
      status: 'PENDING' as const,
    };

    const page = await useCase.execute(input);

    expect(list).toHaveBeenCalledWith(input);
    expect(page.total).toBe(1);
    expect(page.items[0]).toMatchObject({ id: 'request-1', status: 'PENDING' });
  });
});
