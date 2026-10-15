/** Nivel de riesgo de un cliente para el negocio, de menor a mayor. */
export type ClientRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

/** Lo que pesa en el puntaje; las apps traducen cada código a su texto. */
export type ClientRiskFactorCode =
  'OVERDUE_DAYS' | 'OVERDUE_SHARE' | 'MULTIPLE_LOANS_IN_ARREARS' | 'PAID_LOANS';

/** Un factor con los puntos que sumó o restó y el dato que lo causó. */
export interface ClientRiskFactor {
  readonly code: ClientRiskFactorCode;
  /** Puntos que sumó (positivo) o restó (negativo) al puntaje. */
  readonly points: number;
  /** El dato: días de atraso, % vencido (0 a 100), préstamos en mora o préstamos pagados. */
  readonly value: number;
}

/** Lo que se sabe de un cliente en un negocio: sus préstamos y su mora de hoy. */
export interface ClientRiskInput {
  readonly paidOffLoans: number;
  readonly loansInArrears: number;
  /** Los días de atraso del préstamo más atrasado. */
  readonly maxOverdueDays: number;
  readonly overdueAmount: number;
  /** Saldo pendiente de sus préstamos activos. */
  readonly balance: number;
}

/** El resultado: puntaje de 0 (sin riesgo) a 100, su nivel y lo que lo explica. */
export interface ClientRisk {
  readonly score: number;
  readonly level: ClientRiskLevel;
  readonly factors: readonly ClientRiskFactor[];
}

/** Hasta cuántos días de atraso suma cada tramo de puntos. */
const OVERDUE_DAY_BRACKETS: readonly (readonly [number, number])[] = [
  [7, 15],
  [15, 30],
  [30, 50],
  [Number.POSITIVE_INFINITY, 70],
];

const MAX_OVERDUE_SHARE_POINTS = 15;
const MULTIPLE_LOANS_POINTS = 10;
const POINTS_PER_PAID_LOAN = 5;
const MAX_PAID_LOANS_DISCOUNT = 15;

/** Los puntos por días de atraso: 0 si no debe nada vencido. */
function overdueDayPoints(days: number): number {
  if (days <= 0) {
    return 0;
  }
  return OVERDUE_DAY_BRACKETS.find(([upTo]) => days <= upTo)?.[1] ?? 0;
}

/**
 * El nivel que corresponde a un puntaje: menos de 25 bajo, menos de 50 medio, menos de 75 alto y
 * de ahí en adelante muy alto.
 *
 * @param score - Puntaje de 0 a 100.
 */
export function riskLevelOf(score: number): ClientRiskLevel {
  if (score < 25) {
    return 'LOW';
  }
  if (score < 50) {
    return 'MEDIUM';
  }
  return score < 75 ? 'HIGH' : 'VERY_HIGH';
}

/**
 * Puntúa el riesgo de un cliente con su historial en un solo negocio: la mora de hoy (días y
 * proporción del saldo), tener varios préstamos en mora a la vez, y los préstamos que ya pagó,
 * que restan.
 *
 * @remarks
 * Solo mira lo que el negocio ya tiene: no repasa cuota por cuota cuándo se pagó cada una, así que
 * un cliente que pagó siempre tarde pero hoy está al día no sube. Es una regla simple y explicable,
 * no un modelo estadístico.
 *
 * @param input - El historial del cliente en el negocio.
 */
export function assessClientRisk(input: ClientRiskInput): ClientRisk {
  const share =
    input.balance > 0 ? Math.min(input.overdueAmount / input.balance, 1) : 0;
  const candidates: readonly ClientRiskFactor[] = [
    {
      code: 'OVERDUE_DAYS',
      points: overdueDayPoints(input.maxOverdueDays),
      value: input.maxOverdueDays,
    },
    {
      code: 'OVERDUE_SHARE',
      points: Math.round(share * MAX_OVERDUE_SHARE_POINTS),
      value: Math.round(share * 100),
    },
    {
      code: 'MULTIPLE_LOANS_IN_ARREARS',
      points: input.loansInArrears >= 2 ? MULTIPLE_LOANS_POINTS : 0,
      value: input.loansInArrears,
    },
    {
      code: 'PAID_LOANS',
      points: -Math.min(
        input.paidOffLoans * POINTS_PER_PAID_LOAN,
        MAX_PAID_LOANS_DISCOUNT,
      ),
      value: input.paidOffLoans,
    },
  ];
  const factors = candidates.filter((factor) => factor.points !== 0);
  const total = factors.reduce((sum, factor) => sum + factor.points, 0);
  const score = Math.min(100, Math.max(0, total));
  return { score, level: riskLevelOf(score), factors };
}
