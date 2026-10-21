import type { ImportFrequency } from '@/modules/imports/domain/import-row.js';
import { addDays } from '@/shared/domain/calendar/business-date.js';

/**
 * El mismo día de la fecha, un mes antes; si ese día no existe en el mes anterior (el 31 de marzo →
 * febrero), el último día de ese mes.
 *
 * @param isoDate - Fecha `AAAA-MM-DD`.
 */
function previousMonth(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number) as [
    number,
    number,
    number,
  ];
  const lastDay = new Date(Date.UTC(year, month - 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month - 2, Math.min(day, lastDay)))
    .toISOString()
    .slice(0, 10);
}

/**
 * La fecha de inicio con la que un préstamo en curso cobra su próxima cuota en `nextDate`. El calendario
 * de cuotas arranca DESPUÉS de `startDate` (`loan-schedule`): la primera cuota es un período después, o el
 * primer día de cobro siguiente si es diaria. Para que la primera cuota que falta caiga en `nextDate`, el
 * préstamo «empieza» un período antes (D-152).
 *
 * @remarks
 * Mensual no es exacta cuando el día no existe en el mes anterior (próxima cuota el 31 de marzo → inicio el
 * 28 de febrero → primera cuota el 28 de marzo). Y si `nextDate` no es día de cobro, la cuota pasa al
 * siguiente que sí lo es, como en cualquier préstamo (D-35).
 *
 * @param nextDate - Fecha `AAAA-MM-DD` de la próxima cuota.
 * @param frequency - Cada cuánto se cobra.
 */
export function startDateForNextInstallment(
  nextDate: string,
  frequency: ImportFrequency,
): string {
  switch (frequency) {
    case 'DAILY':
      return addDays(nextDate, -1);
    case 'WEEKLY':
      return addDays(nextDate, -7);
    case 'BIWEEKLY':
      return addDays(nextDate, -15);
    case 'MONTHLY':
      return previousMonth(nextDate);
  }
}
