import { describe, expect, it } from 'vitest';
import { GetLenderStatsExportRequestSchema } from '@/modules/dashboard/infrastructure/controllers/schemas/lender-stats-export-requests.schema.js';

describe('GetLenderStatsExportRequestSchema', () => {
  it('acepta format: pdf solo', () => {
    expect(
      GetLenderStatsExportRequestSchema.safeParse({ format: 'pdf' }).success,
    ).toBe(true);
  });

  it('acepta los filtros de /stats junto con el formato', () => {
    expect(
      GetLenderStatsExportRequestSchema.safeParse({
        format: 'pdf',
        dateRange: { from: '2026-10-01', to: '2026-10-07' },
        collectorMembershipId: '0199999a-0000-7000-8000-000000000001',
      }).success,
    ).toBe(true);
  });

  it('rechaza sin format', () => {
    expect(GetLenderStatsExportRequestSchema.safeParse({}).success).toBe(false);
  });

  it('rechaza un format que no sea pdf', () => {
    expect(
      GetLenderStatsExportRequestSchema.safeParse({ format: 'csv' }).success,
    ).toBe(false);
  });
});
