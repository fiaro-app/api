import { describe, expect, it } from 'vitest';
import {
  bucketArrearsByAge,
  rankTopArrears,
  summarizePortfolio,
  totalCollection,
} from '@/modules/dashboard/domain/arrears-stats.js';

describe('bucketArrearsByAge', () => {
  it('devuelve los 4 buckets en orden, aunque alguno quede en cero', () => {
    const buckets = bucketArrearsByAge([]);

    expect(buckets).toEqual([
      { label: '0-7', amount: 0, clientsCount: 0 },
      { label: '8-15', amount: 0, clientsCount: 0 },
      { label: '16-30', amount: 0, clientsCount: 0 },
      { label: '30+', amount: 0, clientsCount: 0 },
    ]);
  });

  it('agrupa cada préstamo por su antigüedad, con los límites de cada bucket', () => {
    const buckets = bucketArrearsByAge([
      { clientId: 'c1', balance: 10_000, overdueDays: 0 },
      { clientId: 'c2', balance: 20_000, overdueDays: 7 },
      { clientId: 'c3', balance: 30_000, overdueDays: 8 },
      { clientId: 'c4', balance: 40_000, overdueDays: 15 },
      { clientId: 'c5', balance: 50_000, overdueDays: 16 },
      { clientId: 'c6', balance: 60_000, overdueDays: 30 },
      { clientId: 'c7', balance: 70_000, overdueDays: 31 },
    ]);

    expect(buckets).toEqual([
      { label: '0-7', amount: 30_000, clientsCount: 2 },
      { label: '8-15', amount: 70_000, clientsCount: 2 },
      { label: '16-30', amount: 110_000, clientsCount: 2 },
      { label: '30+', amount: 70_000, clientsCount: 1 },
    ]);
  });

  it('cuenta clientes distintos, no préstamos, si uno tiene varios en el mismo bucket', () => {
    const buckets = bucketArrearsByAge([
      { clientId: 'c1', balance: 10_000, overdueDays: 1 },
      { clientId: 'c1', balance: 5_000, overdueDays: 3 },
    ]);

    expect(buckets[0]).toEqual({
      label: '0-7',
      amount: 15_000,
      clientsCount: 1,
    });
  });
});

describe('rankTopArrears', () => {
  it('ordena descendente por días de mora', () => {
    const ranking = rankTopArrears(
      [
        { clientId: 'c1', overdueDays: 5, overdueAmount: 10_000 },
        { clientId: 'c2', overdueDays: 20, overdueAmount: 5_000 },
      ],
      10,
    );

    expect(ranking.map((entry) => entry.clientId)).toEqual(['c2', 'c1']);
  });

  it('a igualdad de días, ordena descendente por monto', () => {
    const ranking = rankTopArrears(
      [
        { clientId: 'c1', overdueDays: 10, overdueAmount: 5_000 },
        { clientId: 'c2', overdueDays: 10, overdueAmount: 15_000 },
      ],
      10,
    );

    expect(ranking.map((entry) => entry.clientId)).toEqual(['c2', 'c1']);
  });

  it('agrupa por cliente: el mayor de los días, la suma de los montos', () => {
    const ranking = rankTopArrears(
      [
        { clientId: 'c1', overdueDays: 5, overdueAmount: 10_000 },
        { clientId: 'c1', overdueDays: 12, overdueAmount: 7_000 },
      ],
      10,
    );

    expect(ranking).toEqual([
      { clientId: 'c1', overdueDays: 12, overdueAmount: 17_000 },
    ]);
  });

  it('recorta al límite pedido', () => {
    const ranking = rankTopArrears(
      [
        { clientId: 'c1', overdueDays: 1, overdueAmount: 1 },
        { clientId: 'c2', overdueDays: 2, overdueAmount: 1 },
        { clientId: 'c3', overdueDays: 3, overdueAmount: 1 },
      ],
      2,
    );

    expect(ranking).toHaveLength(2);
    expect(ranking.map((entry) => entry.clientId)).toEqual(['c3', 'c2']);
  });
});

describe('summarizePortfolio', () => {
  it('suma la cartera y la cartera en riesgo, y calcula el % en mora', () => {
    const summary = summarizePortfolio([
      { balance: 300_000, overdueAmount: 0 },
      { balance: 100_000, overdueAmount: 20_000 },
      { balance: 100_000, overdueAmount: 5_000 },
    ]);

    expect(summary).toEqual({
      totalPortfolio: 500_000,
      portfolioAtRisk: 200_000,
      arrearsRate: 0.4,
    });
  });

  it('una cartera vacía no tiene % en mora: no está definido, no es cero', () => {
    expect(summarizePortfolio([])).toEqual({
      totalPortfolio: 0,
      portfolioAtRisk: 0,
      arrearsRate: null,
    });
  });
});

describe('totalCollection', () => {
  it('suma lo esperado y lo cobrado, y calcula la efectividad', () => {
    expect(
      totalCollection([
        { expectedAmount: 100_000, collectedAmount: 80_000 },
        { expectedAmount: 100_000, collectedAmount: 100_000 },
      ]),
    ).toEqual({
      expectedAmount: 200_000,
      collectedAmount: 180_000,
      effectiveness: 0.9,
    });
  });

  it('sin nada esperado la efectividad es null, no 0 ni 1', () => {
    expect(totalCollection([])).toEqual({
      expectedAmount: 0,
      collectedAmount: 0,
      effectiveness: null,
    });
  });
});
