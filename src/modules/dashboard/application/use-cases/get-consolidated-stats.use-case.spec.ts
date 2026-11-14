import { describe, expect, it, vi } from 'vitest';
import { GetConsolidatedStatsUseCase } from '@/modules/dashboard/application/use-cases/get-consolidated-stats.use-case.js';

const LENDERS: Record<string, { id: string; tenantId: string; name: string }> =
  {
    a: { id: 'a', tenantId: 't1', name: 'Negocio A' },
    b: { id: 'b', tenantId: 't1', name: 'Negocio B' },
    other: { id: 'other', tenantId: 't2', name: 'De otro Tenant' },
    c: { id: 'c', tenantId: 't1', name: 'Solo cobra' },
  };

const STATS: Record<string, object> = {
  a: {
    from: '2026-11-01',
    to: '2026-11-14',
    totalPortfolio: 1_000_000,
    portfolioAtRisk: 100_000,
    expectedAmount: 200_000,
    collectedAmount: 150_000,
  },
  b: {
    from: '2026-11-01',
    to: '2026-11-14',
    totalPortfolio: 3_000_000,
    portfolioAtRisk: 500_000,
    expectedAmount: 0,
    collectedAmount: 0,
  },
};

function setup(roles: Record<string, string[]>) {
  const memberships = {
    execute: vi.fn(() =>
      Promise.resolve(
        Object.entries(roles).map(([lenderId, r]) => ({ lenderId, roles: r })),
      ),
    ),
  };
  const lenders = {
    execute: vi.fn((id: string) => Promise.resolve(LENDERS[id] as never)),
  };
  const stats = {
    execute: vi.fn(({ lenderId }: { lenderId: string }) =>
      Promise.resolve(STATS[lenderId]),
    ),
  };
  const useCase = new GetConsolidatedStatsUseCase(
    memberships as never,
    lenders as never,
    stats as never,
  );
  return { useCase, stats };
}

describe('GetConsolidatedStatsUseCase', () => {
  it('suma los negocios que administra del mismo Tenant, con cada uno y el total', async () => {
    const { useCase } = setup({
      a: ['OWNER'],
      b: ['LENDER'],
      other: ['OWNER'],
      c: ['COLLECTOR'],
    });

    const result = await useCase.execute({ userId: 'u', lenderId: 'a' });

    expect(result.lenders.map((lender) => lender.lenderId)).toEqual(['a', 'b']);
    expect(result.lenders[0]).toMatchObject({
      name: 'Negocio A',
      arrearsRate: 0.1,
      effectiveness: 0.75,
    });
    expect(result.lenders[1]?.effectiveness).toBeNull();
    expect(result.totals).toEqual({
      totalPortfolio: 4_000_000,
      portfolioAtRisk: 600_000,
      arrearsRate: 0.15,
      expectedAmount: 200_000,
      collectedAmount: 150_000,
      effectiveness: 0.75,
    });
    expect(result).toMatchObject({ from: '2026-11-01', to: '2026-11-14' });
  });

  it('pasa el período a las estadísticas de cada negocio', async () => {
    const { useCase, stats } = setup({ a: ['OWNER'] });

    await useCase.execute({
      userId: 'u',
      lenderId: 'a',
      from: '2026-10-01',
      to: '2026-10-31',
    });

    expect(stats.execute).toHaveBeenCalledWith({
      lenderId: 'a',
      from: '2026-10-01',
      to: '2026-10-31',
    });
  });

  it('con una cartera en cero, la tasa de mora es null', async () => {
    const { useCase } = setup({ a: ['OWNER'] });
    STATS.a = { ...STATS.a, totalPortfolio: 0, portfolioAtRisk: 0 };

    const result = await useCase.execute({ userId: 'u', lenderId: 'a' });

    expect(result.totals.arrearsRate).toBeNull();
  });
});
