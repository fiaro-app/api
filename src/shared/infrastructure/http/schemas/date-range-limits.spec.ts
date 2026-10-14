import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  addDateRangeIssues,
  DATE_RANGE_LIMITS,
} from '@/shared/infrastructure/http/schemas/date-range-limits.js';

const Query = z
  .strictObject({ from: z.string().optional(), to: z.string().optional() })
  .superRefine((query, ctx) => {
    addDateRangeIssues(query, { maxDays: 31 }, ctx);
  });

describe('addDateRangeIssues', () => {
  afterEach(() => vi.useRealTimers());

  it('no revisa nada si falta una de las dos fechas', () => {
    expect(Query.safeParse({}).success).toBe(true);
    expect(Query.safeParse({ from: '2999-01-01' }).success).toBe(true);
  });

  it('reporta el orden, el futuro y el largo con las claves del contrato', () => {
    vi.useFakeTimers({ now: new Date('2026-10-14T15:00:00Z') });

    expect(
      Query.safeParse({ from: '2026-10-01', to: '2026-10-14' }).success,
    ).toBe(true);
    const messages = (query: object) =>
      Query.safeParse(query).error?.issues.map((issue) => issue.message);
    expect(messages({ from: '2026-10-10', to: '2026-10-01' })).toEqual([
      'contracts.date_range.end_before_start',
    ]);
    expect(messages({ from: '2026-10-10', to: '2026-10-20' })).toEqual([
      'contracts.date_range.in_future',
    ]);
    expect(messages({ from: '2026-08-01', to: '2026-10-01' })).toEqual([
      'contracts.date_range.too_long',
    ]);
  });

  it('ninguna consulta histórica acepta fechas futuras', () => {
    for (const limits of Object.values(DATE_RANGE_LIMITS)) {
      expect('allowFuture' in limits).toBe(false);
    }
  });
});
