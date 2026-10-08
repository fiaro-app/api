import { describe, expect, it } from 'vitest';
import {
  GetCollectorDailySummaryRequestSchema,
  GetCollectorStatsRequestSchema,
} from '@/modules/collections/infrastructure/controllers/schemas/collector-stats-requests.schema.js';

describe('GetCollectorDailySummaryRequestSchema', () => {
  it('acepta un cuerpo vacío', () => {
    expect(GetCollectorDailySummaryRequestSchema.safeParse({}).success).toBe(
      true,
    );
  });

  it('acepta date', () => {
    expect(
      GetCollectorDailySummaryRequestSchema.safeParse({ date: '2026-10-07' })
        .success,
    ).toBe(true);
  });

  it('rechaza una fecha con formato inválido', () => {
    expect(
      GetCollectorDailySummaryRequestSchema.safeParse({ date: '07/10/2026' })
        .success,
    ).toBe(false);
  });

  it('rechaza un campo que la ruta no declara', () => {
    expect(
      GetCollectorDailySummaryRequestSchema.safeParse({ nota: 'x' }).success,
    ).toBe(false);
  });
});

describe('GetCollectorStatsRequestSchema', () => {
  it('acepta un cuerpo vacío', () => {
    expect(GetCollectorStatsRequestSchema.safeParse({}).success).toBe(true);
  });

  it('acepta un dateRange válido', () => {
    expect(
      GetCollectorStatsRequestSchema.safeParse({
        dateRange: { from: '2026-10-01', to: '2026-10-07' },
      }).success,
    ).toBe(true);
  });

  it('rechaza un dateRange con to anterior a from', () => {
    expect(
      GetCollectorStatsRequestSchema.safeParse({
        dateRange: { from: '2026-10-07', to: '2026-10-01' },
      }).success,
    ).toBe(false);
  });

  it('rechaza un campo que la ruta no declara', () => {
    expect(
      GetCollectorStatsRequestSchema.safeParse({ nota: 'x' }).success,
    ).toBe(false);
  });
});
