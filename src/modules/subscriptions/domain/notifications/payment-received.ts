import type { PurchasablePlanCode } from '@/modules/subscriptions/domain/plans/plan-catalog.js';

/** Título del aviso de pago recibido: el mismo en la app, en el correo y en el push. */
export const PAYMENT_RECEIVED_TITLE = 'Pago recibido';

const PLAN_NAMES: Readonly<Record<PurchasablePlanCode, string>> = {
  INDIVIDUAL: 'Individual',
  PRO: 'Pro',
  TEAM: 'Team',
};

const PESOS = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

const LONG_DATE = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/**
 * El texto de la confirmación de un pago: plan, monto y hasta cuándo queda pagado. Sirve también de
 * comprobante en el correo, así que lleva el monto que se cobró de verdad (el de la orden).
 *
 * @param planCode - El plan pagado.
 * @param amountInCents - Lo que se cobró, en centavos.
 * @param periodEndsAt - Hasta cuándo quedó pagado.
 */
export function paymentReceivedBody(
  planCode: PurchasablePlanCode,
  amountInCents: number,
  periodEndsAt: Date,
): string {
  return `Recibimos tu pago de ${PESOS.format(amountInCents / 100)} del plan ${PLAN_NAMES[planCode]}. Tu plan está activo hasta el ${LONG_DATE.format(periodEndsAt)}.`;
}
