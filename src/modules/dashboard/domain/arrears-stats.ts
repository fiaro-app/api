/** Los 4 buckets fijos de antigüedad de mora (PROTOTIPO-FLUJOS.md §4.9). */
export type ArrearsAgeLabel = '0-7' | '8-15' | '16-30' | '30+';

const ARREARS_AGE_LABELS: readonly ArrearsAgeLabel[] = [
  '0-7',
  '8-15',
  '16-30',
  '30+',
];

/** Un préstamo en mora, lo mínimo para agruparlo por antigüedad. */
export interface OverdueLoanRecord {
  readonly clientId: string;
  readonly balance: number;
  readonly overdueDays: number;
}

/** Cuánto y cuántos clientes distintos hay en un bucket de antigüedad. */
export interface ArrearsBucket {
  readonly label: ArrearsAgeLabel;
  readonly amount: number;
  readonly clientsCount: number;
}

/**
 * Agrupa préstamos en mora por antigüedad (PROTOTIPO-FLUJOS.md §4.9): `overdueDays` nunca
 * negativo (D-84), así que 0 cae en el primer bucket, no se pierde.
 *
 * @param records - Préstamos con `overdueAmount > 0`; los demás no están en mora.
 * @returns Los 4 buckets, siempre en el mismo orden, aunque alguno quede en cero.
 */
export function bucketArrearsByAge(
  records: readonly OverdueLoanRecord[],
): readonly ArrearsBucket[] {
  return ARREARS_AGE_LABELS.map((label) => {
    const inBucket = records.filter(
      (record) => arrearsAgeLabel(record.overdueDays) === label,
    );
    return {
      label,
      amount: inBucket.reduce((sum, record) => sum + record.balance, 0),
      clientsCount: new Set(inBucket.map((record) => record.clientId)).size,
    };
  });
}

function arrearsAgeLabel(overdueDays: number): ArrearsAgeLabel {
  if (overdueDays <= 7) {
    return '0-7';
  }
  if (overdueDays <= 15) {
    return '8-15';
  }
  if (overdueDays <= 30) {
    return '16-30';
  }
  return '30+';
}

/** Un préstamo en mora, lo mínimo para el ranking de clientes. */
export interface OverdueLoanAmount {
  readonly clientId: string;
  readonly overdueDays: number;
  readonly overdueAmount: number;
}

/** Un cliente en el ranking de mayor mora. */
export interface TopArrearsClient {
  readonly clientId: string;
  readonly overdueDays: number;
  readonly overdueAmount: number;
}

/**
 * El ranking de clientes con mayor mora (PROTOTIPO-FLUJOS.md §4.9): descendente por días de
 * mora, y a igualdad de días, por monto. Agrupa por cliente, no por préstamo — uno con dos
 * préstamos vencidos cuenta una vez, con `overdueDays` el mayor de los dos y `overdueAmount` la
 * suma de ambos.
 *
 * @param records - Préstamos con `overdueAmount > 0`; los demás no están en mora.
 * @param limit - Cuántos clientes como máximo devuelve.
 */
export function rankTopArrears(
  records: readonly OverdueLoanAmount[],
  limit: number,
): readonly TopArrearsClient[] {
  const byClient = new Map<string, TopArrearsClient>();
  for (const record of records) {
    const existing = byClient.get(record.clientId);
    byClient.set(record.clientId, {
      clientId: record.clientId,
      overdueDays: Math.max(existing?.overdueDays ?? 0, record.overdueDays),
      overdueAmount: (existing?.overdueAmount ?? 0) + record.overdueAmount,
    });
  }
  return [...byClient.values()]
    .sort(
      (a, b) =>
        b.overdueDays - a.overdueDays || b.overdueAmount - a.overdueAmount,
    )
    .slice(0, limit);
}
