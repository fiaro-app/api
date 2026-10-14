import { describe, expect, it, vi } from 'vitest';
import { PrismaCollectorSeatLimit } from '@/modules/memberships/infrastructure/persistence/prisma-collector-seat-limit.js';
import type { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

function setup(found: unknown) {
  const findUnique = vi.fn(() => Promise.resolve(found));
  return {
    limit: new PrismaCollectorSeatLimit({
      lender: { findUnique },
    } as unknown as PrismaService),
    findUnique,
  };
}

describe('PrismaCollectorSeatLimit', () => {
  it('lee el tope de la suscripción del Tenant del prestamista', async () => {
    const { limit, findUnique } = setup({
      tenant: { subscription: { maxCollectors: 5 } },
    });

    expect(await limit.maxCollectors('lender-1')).toBe(5);
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'lender-1' } }),
    );
  });

  it('sin prestamista o sin suscripción no hay tope', async () => {
    expect(await setup(null).limit.maxCollectors('x')).toBeNull();
    expect(
      await setup({ tenant: { subscription: null } }).limit.maxCollectors('x'),
    ).toBeNull();
  });
});
