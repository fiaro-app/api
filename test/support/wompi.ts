import { createHash } from 'node:crypto';
import { HEADERS } from '@test/support/notification-seed.js';

export const INTEGRITY_SECRET = 'test_integrity_e2e';
export const EVENTS_SECRET = 'test_events_e2e';
/** Variables de entorno que encienden el cobro con Wompi (llaves de pruebas). */
export const BILLING_ENV = {
  CORS_ORIGINS: HEADERS.Origin,
  WOMPI_PUBLIC_KEY: 'pub_test_e2e',
  WOMPI_INTEGRITY_SECRET: INTEGRITY_SECRET,
  WOMPI_EVENTS_SECRET: EVENTS_SECRET,
  WOMPI_REDIRECT_URL: 'https://app.fiaro.test/plan',
};
export const DAY_MS = 24 * 60 * 60 * 1000;

export const sha = (text: string) =>
  createHash('sha256').update(text).digest('hex');

let eventSeq = 0;

/** Un aviso `transaction.updated` firmado como lo hace Wompi. */
export function wompiEvent(
  reference: string,
  over: {
    status?: string;
    amountInCents?: number;
    secret?: string;
    id?: string;
  } = {},
) {
  eventSeq += 1;
  const transaction = {
    id: over.id ?? `tx-${String(eventSeq)}`,
    reference,
    status: over.status ?? 'APPROVED',
    amount_in_cents: over.amountInCents ?? 6_900_000,
    currency: 'COP',
    payment_method_type: 'PSE',
  };
  const timestamp = 1_530_291_411 + eventSeq;
  const checksum = sha(
    `${transaction.id}${transaction.status}${String(transaction.amount_in_cents)}${String(timestamp)}${over.secret ?? EVENTS_SECRET}`,
  );
  return {
    event: 'transaction.updated',
    data: { transaction },
    signature: {
      checksum,
      properties: [
        'transaction.id',
        'transaction.status',
        'transaction.amount_in_cents',
      ],
    },
    timestamp,
    sent_at: new Date().toISOString(),
  };
}
