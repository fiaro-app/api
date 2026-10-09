import { describe, expect, it } from 'vitest';
import {
  ListSettlementsRequestSchema,
  ReviewSettlementRequestSchema,
  SubmitSettlementRequestSchema,
} from '@/modules/settlements/infrastructure/controllers/schemas/settlement-requests.schema.js';

const VALID_BODY = {
  expectedAmount: 100_000,
  collectedCash: 60_000,
  collectedNequi: 30_000,
  collectedTransfer: 0,
};

describe('SubmitSettlementRequestSchema', () => {
  it('acepta los cuatro montos sin nota', () => {
    const parsed = SubmitSettlementRequestSchema.safeParse(VALID_BODY);
    expect(parsed.success).toBe(true);
  });

  it('acepta una nota', () => {
    const parsed = SubmitSettlementRequestSchema.safeParse({
      ...VALID_BODY,
      collectorNote: 'Un cliente no pagó.',
    });
    expect(parsed.success && parsed.data.collectorNote).toBe(
      'Un cliente no pagó.',
    );
  });

  it('acepta una nota explícitamente null', () => {
    expect(
      SubmitSettlementRequestSchema.safeParse({
        ...VALID_BODY,
        collectorNote: null,
      }).success,
    ).toBe(true);
  });

  it('rechaza un campo faltante', () => {
    const incomplete = {
      expectedAmount: VALID_BODY.expectedAmount,
      collectedCash: VALID_BODY.collectedCash,
      collectedNequi: VALID_BODY.collectedNequi,
    };
    expect(SubmitSettlementRequestSchema.safeParse(incomplete).success).toBe(
      false,
    );
  });

  it('rechaza un monto negativo', () => {
    expect(
      SubmitSettlementRequestSchema.safeParse({
        ...VALID_BODY,
        collectedCash: -1,
      }).success,
    ).toBe(false);
  });

  it('rechaza una nota vacía', () => {
    expect(
      SubmitSettlementRequestSchema.safeParse({
        ...VALID_BODY,
        collectorNote: '',
      }).success,
    ).toBe(false);
  });

  it('rechaza un campo que la ruta no declara', () => {
    expect(
      SubmitSettlementRequestSchema.safeParse({
        ...VALID_BODY,
        collectedAmount: 90_000,
      }).success,
    ).toBe(false);
  });
});

describe('ReviewSettlementRequestSchema', () => {
  it('acepta un cuerpo vacío', () => {
    expect(ReviewSettlementRequestSchema.parse({})).toEqual({});
  });

  it('acepta un comentario', () => {
    expect(
      ReviewSettlementRequestSchema.parse({ reviewNote: 'Todo cuadra.' }),
    ).toEqual({ reviewNote: 'Todo cuadra.' });
  });

  it('rechaza un campo que la ruta no declara', () => {
    expect(
      ReviewSettlementRequestSchema.safeParse({ status: 'APPROVED' }).success,
    ).toBe(false);
  });
});

describe('ListSettlementsRequestSchema', () => {
  it('aplica los valores por defecto de paginación', () => {
    expect(ListSettlementsRequestSchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
    });
  });

  it('acepta filtros opcionales por cobrador y por estado', () => {
    const parsed = ListSettlementsRequestSchema.parse({
      collectorMembershipId: '01a0f387-97a7-7192-bc0f-4f9d34e0480f',
      status: 'PENDING',
    });
    expect(parsed.collectorMembershipId).toBe(
      '01a0f387-97a7-7192-bc0f-4f9d34e0480f',
    );
    expect(parsed.status).toBe('PENDING');
  });

  it('acepta el filtro por cartera y por rango de fechas', () => {
    const parsed = ListSettlementsRequestSchema.parse({
      portfolioId: '01a0f387-97a7-7192-bc0f-4f9d34e0480f',
      dateRange: { from: '2026-10-01', to: '2026-10-31' },
    });
    expect(parsed.portfolioId).toBe('01a0f387-97a7-7192-bc0f-4f9d34e0480f');
    expect(parsed.dateRange).toEqual({ from: '2026-10-01', to: '2026-10-31' });
  });

  it.each([
    [
      'un rango al revés',
      { dateRange: { from: '2026-10-31', to: '2026-10-01' } },
    ],
    ['una cartera que no es UUID', { portfolioId: 'x' }],
  ])('rechaza %s', (_name, body) => {
    expect(ListSettlementsRequestSchema.safeParse(body).success).toBe(false);
  });

  it('rechaza un campo que la ruta no declara', () => {
    expect(
      ListSettlementsRequestSchema.safeParse({ sort: 'date' }).success,
    ).toBe(false);
  });
});
