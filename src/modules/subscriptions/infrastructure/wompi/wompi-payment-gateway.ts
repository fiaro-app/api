import { createHash, timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { Env } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';
import type {
  CheckoutParams,
  ParsedEvent,
  PaymentGateway,
} from '@/modules/subscriptions/application/ports/payment-gateway.port.js';

/** Lo que Wompi manda en cada aviso; lo demás se ignora. */
const EventSchema = z.object({
  event: z.string(),
  data: z.record(z.string(), z.unknown()),
  signature: z.object({
    checksum: z.string(),
    properties: z.array(z.string()),
  }),
  timestamp: z.number().int(),
});

const TransactionSchema = z.object({
  id: z.string().min(1),
  reference: z.string().min(1),
  status: z.string().min(1),
  amount_in_cents: z.number().int(),
  currency: z.string().min(1),
  payment_method_type: z.string().nullish(),
});

/**
 * Lo que la firma del aviso tiene que cubrir como mínimo: sin esto, un aviso firmado solo sobre su
 * id dejaría cambiar el estado o el monto sin que se note.
 */
const REQUIRED_PROPERTIES = [
  'transaction.id',
  'transaction.status',
  'transaction.amount_in_cents',
] as const;

const HEX_SHA256 = /^[0-9a-f]{64}$/;

/** @param value - Un valor del aviso que entra en la firma. */
function isSignable(value: unknown): value is string | number | boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

/**
 * Lee `a.b.c` dentro de `data`.
 *
 * @param data - El objeto `data` del aviso.
 * @param path - Una propiedad de `signature.properties`.
 */
function valueAt(data: Record<string, unknown>, path: string): unknown {
  let current: unknown = data;
  for (const key of path.split('.')) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** @param text - Texto a resumir. */
function sha256Hex(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/** @param a - Un resumen hexadecimal. @param b - Otro, para compararlo en tiempo constante. */
function sameDigest(a: string, b: string): boolean {
  const left = a.toLowerCase();
  const right = b.toLowerCase();
  return (
    HEX_SHA256.test(left) &&
    HEX_SHA256.test(right) &&
    timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'))
  );
}

/**
 * {@link PaymentGateway} con Wompi (D-149): el Web Checkout y sus avisos (eventos).
 *
 * @remarks
 * Las firmas siguen la documentación de Wompi: la de integridad es
 * `SHA256(referencia + monto + moneda + secretoDeIntegridad)` y la de un aviso es
 * `SHA256(valores de signature.properties + timestamp + secretoDeEventos)`. Ninguno de los dos
 * secretos sale del servidor. El orden y la lista de propiedades se leen del propio aviso, porque
 * Wompi dice que pueden cambiar.
 */
@Injectable()
export class WompiPaymentGateway implements PaymentGateway {
  constructor(@Inject(ENV) private readonly env: Env) {}

  isConfigured(): boolean {
    return this.env.subscription.wompi.enabled;
  }

  checkoutFor(order: {
    reference: string;
    amountInCents: number;
    currency: string;
  }): CheckoutParams {
    const { publicKey, integritySecret, redirectUrl, checkoutUrl } =
      this.env.subscription.wompi;
    if (!publicKey || !integritySecret || !redirectUrl) {
      throw new Error('Wompi no está configurado');
    }
    return {
      url: checkoutUrl,
      publicKey,
      currency: order.currency,
      amountInCents: order.amountInCents,
      reference: order.reference,
      signatureIntegrity: sha256Hex(
        `${order.reference}${String(order.amountInCents)}${order.currency}${integritySecret}`,
      ),
      redirectUrl,
    };
  }

  parseEvent(body: unknown, checksumHeader: string | undefined): ParsedEvent {
    const event = this.authenticate(body, checksumHeader);
    if (event === null) {
      return { kind: 'invalid' };
    }
    if (event.event !== 'transaction.updated') {
      return { kind: 'ignored' };
    }
    const { transaction } = event.data;
    const parsed = TransactionSchema.safeParse(transaction);
    if (!parsed.success) {
      return { kind: 'invalid' };
    }
    return {
      kind: 'transaction',
      event: {
        reference: parsed.data.reference,
        wompiTransactionId: parsed.data.id,
        status: parsed.data.status,
        amountInCents: parsed.data.amount_in_cents,
        currency: parsed.data.currency,
        paymentMethodType: parsed.data.payment_method_type ?? null,
      },
    };
  }

  /**
   * @returns El aviso con su firma comprobada, o `null` si no tiene la forma esperada o la firma
   * (la del cuerpo y, si vino, la de la cabecera) no coincide.
   */
  private authenticate(
    body: unknown,
    checksumHeader: string | undefined,
  ): z.output<typeof EventSchema> | null {
    const secret = this.env.subscription.wompi.eventsSecret;
    const parsed = EventSchema.safeParse(body);
    if (!secret || !parsed.success) {
      return null;
    }
    const { data, signature, timestamp } = parsed.data;
    if (!REQUIRED_PROPERTIES.every((p) => signature.properties.includes(p))) {
      return null;
    }
    const values = signature.properties.map((p) => valueAt(data, p));
    if (!values.every(isSignable)) {
      return null;
    }
    const expected = sha256Hex(
      `${values.map(String).join('')}${String(timestamp)}${secret}`,
    );
    const headerOk =
      checksumHeader === undefined || sameDigest(expected, checksumHeader);
    return sameDigest(expected, signature.checksum) && headerOk
      ? parsed.data
      : null;
  }
}
