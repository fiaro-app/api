import type { MoraTally } from '@/modules/alerts/domain/mora/mora-tally.js';

/** Título del aviso diario de mora: el mismo en la app, en el correo y en el push. */
export const MORA_NOTIFICATION_TITLE = 'Préstamos en mora';

/** Pesos colombianos sin centavos, como se muestran las cifras en la app. */
const PESOS = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/**
 * El texto del aviso: cuántos préstamos están en mora y cuánto suman lo vencido.
 *
 * @param tally - Lo que el prestamista tiene en mora; se envía solo si hay al menos uno.
 * @returns El cuerpo de la notificación, en español.
 */
export function moraNotificationBody(tally: MoraTally): string {
  const loans =
    tally.loansInMora === 1
      ? '1 préstamo'
      : `${String(tally.loansInMora)} préstamos`;
  return `Hoy tienes ${loans} en mora por ${PESOS.format(tally.overdueAmount)} en total.`;
}
