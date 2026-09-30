import { describe, expect, it } from 'vitest';
import {
  CreateLoanRequestSchema,
  ListLoansRequestSchema,
} from '@/modules/loans/infrastructure/controllers/schemas/loan-requests.schema.js';

const VALID_BODY = {
  clientId: '01a0f387-97a7-7192-bc0f-4f9d34e0480f',
  principalAmount: 500_000,
  installmentCount: 20,
  installmentValue: 30_000,
  totalPayable: 600_000,
  frequency: 'DAILY',
  startDate: '2026-10-01',
};

describe('CreateLoanRequestSchema', () => {
  it('acepta los siete campos', () => {
    expect(CreateLoanRequestSchema.safeParse(VALID_BODY).success).toBe(true);
  });

  it('rechaza un campo faltante', () => {
    const incomplete = {
      clientId: VALID_BODY.clientId,
      principalAmount: VALID_BODY.principalAmount,
      installmentCount: VALID_BODY.installmentCount,
      installmentValue: VALID_BODY.installmentValue,
      frequency: VALID_BODY.frequency,
    };
    expect(CreateLoanRequestSchema.safeParse(incomplete).success).toBe(false);
  });

  it('rechaza un campo que la ruta no declara', () => {
    expect(
      CreateLoanRequestSchema.safeParse({ ...VALID_BODY, lenderId: 'x' })
        .success,
    ).toBe(false);
  });

  it('rechaza una frecuencia que no está en el catálogo', () => {
    expect(
      CreateLoanRequestSchema.safeParse({ ...VALID_BODY, frequency: 'YEARLY' })
        .success,
    ).toBe(false);
  });
});

describe('ListLoansRequestSchema', () => {
  it('aplica los valores por defecto de paginación', () => {
    expect(ListLoansRequestSchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
    });
  });

  it('acepta filtros opcionales por cliente y por estado', () => {
    const parsed = ListLoansRequestSchema.parse({
      clientId: VALID_BODY.clientId,
      status: 'ACTIVE',
    });
    expect(parsed.clientId).toBe(VALID_BODY.clientId);
    expect(parsed.status).toBe('ACTIVE');
  });

  it('rechaza un campo que la ruta no declara', () => {
    expect(
      ListLoansRequestSchema.safeParse({ sort: 'startDate' }).success,
    ).toBe(false);
  });
});
