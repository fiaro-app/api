import { describe, expect, it } from 'vitest';
import {
  buildDailySeries,
  datesBetween,
  settlementIntegrity,
  totalsByMethod,
  visitMix,
} from '@/modules/dashboard/domain/insights.js';

describe('datesBetween', () => {
  it('lista cada día, ambos extremos incluidos, también al cruzar de mes', () => {
    expect(datesBetween('2026-09-29', '2026-10-02')).toEqual([
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
    ]);
    expect(datesBetween('2026-10-05', '2026-10-05')).toEqual(['2026-10-05']);
  });

  it('rechaza un rango al revés', () => {
    expect(() => datesBetween('2026-10-05', '2026-10-01')).toThrow(RangeError);
  });
});

describe('buildDailySeries', () => {
  it('trae todos los días, con ceros donde no hubo movimiento, y suma los medios de pago de un día', () => {
    const series = buildDailySeries(
      '2026-10-01',
      '2026-10-03',
      [
        { date: '2026-10-01', method: 'CASH', amount: 30_000, count: 3 },
        { date: '2026-10-01', method: 'NEQUI', amount: 10_000, count: 1 },
        { date: '2026-10-03', method: 'CASH', amount: 5_000, count: 1 },
      ],
      new Map([
        ['2026-10-01', 50_000],
        ['2026-10-02', 50_000],
      ]),
    );

    expect(series).toEqual([
      { date: '2026-10-01', expected: 50_000, collected: 40_000 },
      { date: '2026-10-02', expected: 50_000, collected: 0 },
      { date: '2026-10-03', expected: 0, collected: 5_000 },
    ]);
  });
});

describe('totalsByMethod', () => {
  it('suma por medio y siempre trae los tres', () => {
    expect(totalsByMethod([])).toEqual({ CASH: 0, NEQUI: 0, TRANSFER: 0 });
    expect(
      totalsByMethod([
        { date: 'a', method: 'CASH', amount: 5, count: 1 },
        { date: 'b', method: 'CASH', amount: 7, count: 1 },
        { date: 'b', method: 'TRANSFER', amount: 1, count: 1 },
      ]),
    ).toEqual({ CASH: 12, NEQUI: 0, TRANSFER: 1 });
  });
});

describe('visitMix', () => {
  it('calcula la tasa de contacto y la de pago', () => {
    const mix = visitMix({ PAID: 6, NOT_FOUND: 2, REFUSED: 1, RESCHEDULED: 1 });

    expect(mix.total).toBe(10);
    expect(mix.contactRate).toBeCloseTo(0.8);
    expect(mix.paidRate).toBeCloseTo(0.6);
  });

  it('sin visitas las tasas son null, no cero', () => {
    const mix = visitMix({ PAID: 0, NOT_FOUND: 0, REFUSED: 0, RESCHEDULED: 0 });

    expect(mix).toMatchObject({ total: 0, contactRate: null, paidRate: null });
  });
});

describe('settlementIntegrity', () => {
  it('cuenta los que cuadran y suma lo que faltó y lo que sobró por separado', () => {
    const result = settlementIntegrity([
      { expectedAmount: 100, collectedAmount: 100 },
      { expectedAmount: 100, collectedAmount: 70 },
      { expectedAmount: 100, collectedAmount: 90 },
      { expectedAmount: 100, collectedAmount: 130 },
    ]);

    expect(result).toEqual({
      submitted: 4,
      balanced: 1,
      withDifference: 3,
      shortfall: 40,
      surplus: 30,
    });
  });

  it('sin cuadres todo es cero', () => {
    expect(settlementIntegrity([])).toEqual({
      submitted: 0,
      balanced: 0,
      withDifference: 0,
      shortfall: 0,
      surplus: 0,
    });
  });
});
