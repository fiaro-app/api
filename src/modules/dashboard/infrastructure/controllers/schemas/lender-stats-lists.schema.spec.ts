import { describe, expect, it } from 'vitest';
import {
  ListCollectorPerformanceRequestSchema,
  ListTopArrearsRequestSchema,
} from '@/modules/dashboard/infrastructure/controllers/schemas/lender-stats-lists.schema.js';

describe('ListTopArrearsRequestSchema', () => {
  it('10 por página por defecto y como máximo 50', () => {
    expect(ListTopArrearsRequestSchema.parse({})).toEqual({
      page: 1,
      pageSize: 10,
    });
    expect(
      ListTopArrearsRequestSchema.safeParse({ pageSize: 51 }).success,
    ).toBe(false);
  });

  it('no acepta período: la mora es la de hoy', () => {
    expect(
      ListTopArrearsRequestSchema.safeParse({
        dateRange: { from: '2026-09-01', to: '2026-09-30' },
      }).success,
    ).toBe(false);
  });
});

describe('ListCollectorPerformanceRequestSchema', () => {
  it('acepta un período pasado y rechaza uno futuro o de más de un año', () => {
    expect(
      ListCollectorPerformanceRequestSchema.safeParse({
        dateRange: { from: '2026-09-01', to: '2026-09-30' },
      }).success,
    ).toBe(true);
    expect(
      ListCollectorPerformanceRequestSchema.safeParse({
        dateRange: { from: '2026-09-01', to: '2999-01-01' },
      }).success,
    ).toBe(false);
    expect(
      ListCollectorPerformanceRequestSchema.safeParse({
        dateRange: { from: '2024-01-01', to: '2025-12-31' },
      }).success,
    ).toBe(false);
  });
});
