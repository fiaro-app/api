import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { Env } from '@/config/env.js';
import { WompiPaymentGateway } from '@/modules/subscriptions/infrastructure/wompi/wompi-payment-gateway.js';

const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const EVENTS_SECRET = 'test_events_secret';
const INTEGRITY_SECRET = 'test_integrity_secret';

function gatewayWith(wompi: Partial<Env['subscription']['wompi']> = {}) {
  return new WompiPaymentGateway({
    subscription: {
      wompi: {
        enabled: true,
        publicKey: 'pub_test_abc',
        integritySecret: INTEGRITY_SECRET,
        eventsSecret: EVENTS_SECRET,
        checkoutUrl: 'https://checkout.wompi.co/p/',
        redirectUrl: 'https://app.fiaro.co/plan',
        ...wompi,
      },
    },
  } as Env);
}

const TRANSACTION = {
  id: '1234-1610641025-49201',
  reference: 'fiaro-abc',
  status: 'APPROVED',
  amount_in_cents: 6_900_000,
  currency: 'COP',
  payment_method_type: 'PSE',
};

/** Un aviso como el de Wompi, firmado con el secreto de pruebas. */
function signedEvent(
  over: {
    transaction?: Record<string, unknown>;
    properties?: string[];
    event?: string;
    timestamp?: number;
    secret?: string;
  } = {},
) {
  const transaction: Record<string, unknown> = {
    ...TRANSACTION,
    ...over.transaction,
  };
  const properties = over.properties ?? [
    'transaction.id',
    'transaction.status',
    'transaction.amount_in_cents',
  ];
  const timestamp = over.timestamp ?? 1_530_291_411;
  const values = properties.map((p) =>
    String(transaction[p.split('.')[1] ?? '']),
  );
  const checksum = sha(
    `${values.join('')}${String(timestamp)}${over.secret ?? EVENTS_SECRET}`,
  );
  return {
    event: over.event ?? 'transaction.updated',
    data: { transaction },
    signature: { checksum, properties },
    timestamp,
    sent_at: '2026-10-16T12:00:00.000Z',
  };
}

describe('WompiPaymentGateway.checkoutFor', () => {
  it('firma la integridad con referencia, monto, moneda y secreto, en ese orden', () => {
    const checkout = gatewayWith().checkoutFor({
      reference: 'fiaro-abc',
      amountInCents: 6_900_000,
      currency: 'COP',
    });

    expect(checkout).toEqual({
      url: 'https://checkout.wompi.co/p/',
      publicKey: 'pub_test_abc',
      currency: 'COP',
      amountInCents: 6_900_000,
      reference: 'fiaro-abc',
      signatureIntegrity: sha(`fiaro-abc6900000COP${INTEGRITY_SECRET}`),
      redirectUrl: 'https://app.fiaro.co/plan',
    });
  });

  it('sin configuración no arma nada', () => {
    const gateway = gatewayWith({ enabled: false, publicKey: undefined });

    expect(gateway.isConfigured()).toBe(false);
    expect(() =>
      gateway.checkoutFor({
        reference: 'r',
        amountInCents: 1,
        currency: 'COP',
      }),
    ).toThrow(/no está configurado/);
  });
});

describe('WompiPaymentGateway.parseEvent', () => {
  it('acepta un aviso bien firmado, con o sin la cabecera', () => {
    const body = signedEvent();
    const expected = {
      kind: 'transaction',
      event: {
        reference: 'fiaro-abc',
        wompiTransactionId: '1234-1610641025-49201',
        status: 'APPROVED',
        amountInCents: 6_900_000,
        currency: 'COP',
        paymentMethodType: 'PSE',
      },
    };

    expect(gatewayWith().parseEvent(body, undefined)).toEqual(expected);
    expect(
      gatewayWith().parseEvent(body, body.signature.checksum.toUpperCase()),
    ).toEqual(expected);
  });

  it('el medio de pago es opcional en el aviso', () => {
    const body = signedEvent({
      transaction: { payment_method_type: undefined },
    });

    expect(gatewayWith().parseEvent(body, undefined)).toMatchObject({
      kind: 'transaction',
      event: { paymentMethodType: null },
    });
  });

  it('rechaza una firma hecha con otro secreto', () => {
    expect(
      gatewayWith().parseEvent(signedEvent({ secret: 'otro' }), undefined),
    ).toEqual({ kind: 'invalid' });
  });

  it('rechaza un aviso al que le cambiaron el estado o el monto', () => {
    const body = signedEvent();
    for (const change of [{ status: 'DECLINED' }, { amount_in_cents: 1 }]) {
      const tampered = {
        ...body,
        data: { transaction: { ...TRANSACTION, ...change } },
      };
      expect(gatewayWith().parseEvent(tampered, undefined)).toEqual({
        kind: 'invalid',
      });
    }
  });

  it('rechaza una cabecera que no coincide', () => {
    expect(gatewayWith().parseEvent(signedEvent(), 'a'.repeat(64))).toEqual({
      kind: 'invalid',
    });
    expect(gatewayWith().parseEvent(signedEvent(), 'no-es-un-hash')).toEqual({
      kind: 'invalid',
    });
  });

  it('exige que la firma cubra el id, el estado y el monto', () => {
    const partial = signedEvent({ properties: ['transaction.id'] });

    expect(gatewayWith().parseEvent(partial, undefined)).toEqual({
      kind: 'invalid',
    });
  });

  it('rechaza lo que no tiene la forma de un aviso', () => {
    for (const body of [null, 'x', {}, { event: 'transaction.updated' }]) {
      expect(gatewayWith().parseEvent(body, undefined)).toEqual({
        kind: 'invalid',
      });
    }
  });

  it('rechaza una propiedad firmada que el aviso no trae', () => {
    const body = signedEvent();
    const missing = {
      ...body,
      signature: {
        ...body.signature,
        properties: [...body.signature.properties, 'transaction.nope'],
      },
    };

    expect(gatewayWith().parseEvent(missing, undefined)).toEqual({
      kind: 'invalid',
    });
  });

  it('un aviso auténtico de otro tipo se ignora', () => {
    expect(
      gatewayWith().parseEvent(
        signedEvent({ event: 'nequi_token.updated' }),
        undefined,
      ),
    ).toEqual({ kind: 'ignored' });
  });

  it('sin secreto de eventos nada es válido', () => {
    expect(
      gatewayWith({ eventsSecret: undefined }).parseEvent(
        signedEvent(),
        undefined,
      ),
    ).toEqual({ kind: 'invalid' });
  });

  it('un aviso firmado pero sin transacción completa es inválido', () => {
    const body = signedEvent({ transaction: { reference: undefined } });

    expect(gatewayWith().parseEvent(body, undefined)).toEqual({
      kind: 'invalid',
    });
  });
});
