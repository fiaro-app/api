import { describe, expect, it } from 'vitest';
import { GetLenderStatsRequestSchema } from '@/modules/dashboard/infrastructure/controllers/schemas/lender-stats-requests.schema.js';

describe('GetLenderStatsRequestSchema', () => {
  it('acepta un cuerpo vacío', () => {
    expect(GetLenderStatsRequestSchema.safeParse({}).success).toBe(true);
  });

  it('acepta los tres filtros combinados', () => {
    expect(
      GetLenderStatsRequestSchema.safeParse({
        dateRange: { from: '2026-10-01', to: '2026-10-07' },
        collectorMembershipId: '0199999a-0000-7000-8000-000000000001',
        portfolioId: '0199999a-0000-7000-8000-000000000002',
      }).success,
    ).toBe(true);
  });

  it('rechaza un dateRange con to anterior a from', () => {
    expect(
      GetLenderStatsRequestSchema.safeParse({
        dateRange: { from: '2026-10-07', to: '2026-10-01' },
      }).success,
    ).toBe(false);
  });

  it('rechaza un collectorMembershipId que no es UUID', () => {
    expect(
      GetLenderStatsRequestSchema.safeParse({ collectorMembershipId: 'x' })
        .success,
    ).toBe(false);
  });

  it('rechaza un campo que la ruta no declara', () => {
    expect(GetLenderStatsRequestSchema.safeParse({ nota: 'x' }).success).toBe(
      false,
    );
  });
});
