import { describe, expect, it, vi } from 'vitest';
import { CountActiveMembershipsByPortfolioUseCase } from '@/modules/memberships/application/use-cases/count-active-memberships-by-portfolio.use-case.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';

describe('CountActiveMembershipsByPortfolioUseCase', () => {
  it('devuelve cuántas membresías activas tiene la cartera, dentro del prestamista', async () => {
    const countActiveByPortfolio = vi.fn(() => Promise.resolve(3));
    const memberships = {
      countActiveByPortfolio,
    } as unknown as MembershipRepository;
    const useCase = new CountActiveMembershipsByPortfolioUseCase(memberships);

    const count = await useCase.execute('portfolio-1', 'lender-1');

    expect(count).toBe(3);
    expect(countActiveByPortfolio).toHaveBeenCalledExactlyOnceWith(
      'portfolio-1',
      'lender-1',
    );
  });
});
