import { describe, expect, it, vi } from 'vitest';
import { PrismaPlanSeatLimits } from '@/modules/memberships/infrastructure/persistence/prisma-plan-seat-limits.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

function setup(found: unknown) {
  const findUnique = vi.fn(() => Promise.resolve(found));
  return {
    limits: new PrismaPlanSeatLimits({
      lender: { findUnique },
    } as unknown as PrismaService),
    findUnique,
  };
}

describe('PrismaPlanSeatLimits', () => {
  it('lee los topes de la suscripción del Tenant del prestamista', async () => {
    const { limits, findUnique } = setup({
      tenant: { subscription: { maxCollectors: 5, maxAdmins: 3 } },
    });

    expect(await limits.maxCollectors('lender-1')).toBe(5);
    expect(await limits.maxAdmins('lender-1')).toBe(3);
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'lender-1' } }),
    );
  });

  it('sin prestamista o sin suscripción no hay tope', async () => {
    expect(await setup(null).limits.maxCollectors('x')).toBeNull();
    expect(
      await setup({ tenant: { subscription: null } }).limits.maxAdmins('x'),
    ).toBeNull();
  });
});
