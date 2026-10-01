import { describe, expect, it } from 'vitest';
import { CreateCollectionVisitRequestSchema } from '@/modules/collections/infrastructure/controllers/schemas/collection-visit-requests.schema.js';

const BASE = {
  id: '01999999-9999-7999-9999-999999999999',
  occurredAt: '2026-10-01T14:00:00.000Z',
};

describe('CreateCollectionVisitRequestSchema', () => {
  it('acepta PAID con pago', () => {
    expect(
      CreateCollectionVisitRequestSchema.safeParse({
        ...BASE,
        outcome: 'PAID',
        payment: { amount: 30_000 },
      }).success,
    ).toBe(true);
  });

  it('acepta un pago con método', () => {
    expect(
      CreateCollectionVisitRequestSchema.safeParse({
        ...BASE,
        outcome: 'PAID',
        payment: { amount: 30_000, method: 'NEQUI' },
      }).success,
    ).toBe(true);
  });

  it('acepta RESCHEDULED con promisedDate', () => {
    expect(
      CreateCollectionVisitRequestSchema.safeParse({
        ...BASE,
        outcome: 'RESCHEDULED',
        promisedDate: '2026-10-05',
      }).success,
    ).toBe(true);
  });

  it('acepta NOT_FOUND sin pago ni promisedDate', () => {
    expect(
      CreateCollectionVisitRequestSchema.safeParse({
        ...BASE,
        outcome: 'NOT_FOUND',
      }).success,
    ).toBe(true);
  });

  it('rechaza un monto de pago negativo', () => {
    expect(
      CreateCollectionVisitRequestSchema.safeParse({
        ...BASE,
        outcome: 'PAID',
        payment: { amount: -1 },
      }).success,
    ).toBe(false);
  });

  it('rechaza una hora que no es ISO', () => {
    expect(
      CreateCollectionVisitRequestSchema.safeParse({
        ...BASE,
        outcome: 'NOT_FOUND',
        occurredAt: '01/10/2026',
      }).success,
    ).toBe(false);
  });

  it('rechaza un campo que la ruta no declara', () => {
    expect(
      CreateCollectionVisitRequestSchema.safeParse({
        ...BASE,
        outcome: 'NOT_FOUND',
        nota: 'x',
      }).success,
    ).toBe(false);
  });
});
