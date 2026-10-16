import { describe, expect, it, vi } from 'vitest';
import { PrismaPortfolioLimit } from '@/modules/lenders/infrastructure/persistence/prisma-portfolio-limit.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

function setup(found: unknown) {
  const findUnique = vi.fn(() => Promise.resolve(found));
  return {
    limit: new PrismaPortfolioLimit({
      lender: { findUnique },
    } as unknown as PrismaService),
    findUnique,
  };
}

describe('PrismaPortfolioLimit', () => {
  it('lee el tope de la suscripción del Tenant del prestamista', async () => {
    const { limit, findUnique } = setup({
      tenant: { subscription: { maxPortfolios: 4 } },
    });

    expect(await limit.maxPortfolios('lender-1')).toBe(4);
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'lender-1' } }),
    );
  });

  it('sin prestamista o sin suscripción no hay tope', async () => {
    expect(await setup(null).limit.maxPortfolios('x')).toBeNull();
    expect(
      await setup({ tenant: { subscription: null } }).limit.maxPortfolios('x'),
    ).toBeNull();
  });
});
