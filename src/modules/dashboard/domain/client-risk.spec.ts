import { describe, expect, it } from 'vitest';
import {
  assessClientRisk,
  riskLevelOf,
} from '@/modules/dashboard/domain/client-risk.js';

const CLEAN = {
  paidOffLoans: 0,
  loansInArrears: 0,
  maxOverdueDays: 0,
  overdueAmount: 0,
  balance: 100_000,
};

describe('assessClientRisk', () => {
  it('un cliente sin mora ni historial es de riesgo bajo y sin factores', () => {
    expect(assessClientRisk(CLEAN)).toEqual({
      score: 0,
      level: 'LOW',
      factors: [],
    });
  });

  it.each([
    [5, 15],
    [7, 15],
    [10, 30],
    [20, 50],
    [45, 70],
  ])('%i días de atraso suman %i puntos', (days, points) => {
    const { factors } = assessClientRisk({ ...CLEAN, maxOverdueDays: days });
    expect(factors.find((f) => f.code === 'OVERDUE_DAYS')?.points).toBe(points);
  });

  it('suma días, proporción vencida y varios préstamos en mora hasta muy alto', () => {
    const risk = assessClientRisk({
      ...CLEAN,
      maxOverdueDays: 45,
      overdueAmount: 100_000,
      loansInArrears: 2,
    });
    expect(risk.score).toBe(95);
    expect(risk.level).toBe('VERY_HIGH');
    expect(risk.factors.map((f) => f.code)).toEqual([
      'OVERDUE_DAYS',
      'OVERDUE_SHARE',
      'MULTIPLE_LOANS_IN_ARREARS',
    ]);
  });

  it('los préstamos pagados restan, con tope, y el puntaje nunca baja de 0', () => {
    const risk = assessClientRisk({ ...CLEAN, paidOffLoans: 10 });
    expect(risk.score).toBe(0);
    expect(risk.factors).toEqual([
      { code: 'PAID_LOANS', points: -15, value: 10 },
    ]);
    const withArrears = assessClientRisk({
      ...CLEAN,
      paidOffLoans: 10,
      maxOverdueDays: 10,
    });
    expect(withArrears.score).toBe(15);
  });

  it('sin saldo la proporción vencida no suma y no divide entre cero', () => {
    expect(
      assessClientRisk({ ...CLEAN, balance: 0, overdueAmount: 5 }).factors,
    ).toEqual([]);
  });
});

describe('riskLevelOf', () => {
  it.each([
    [0, 'LOW'],
    [24, 'LOW'],
    [25, 'MEDIUM'],
    [49, 'MEDIUM'],
    [50, 'HIGH'],
    [74, 'HIGH'],
    [75, 'VERY_HIGH'],
    [100, 'VERY_HIGH'],
  ])('%i es %s', (score, level) => {
    expect(riskLevelOf(score)).toBe(level);
  });
});
