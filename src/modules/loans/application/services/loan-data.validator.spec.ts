import { describe, expect, it } from 'vitest';
import { validateLoanData } from '@/modules/loans/application/services/loan-data.validator.js';
import { InvalidLoanDataError } from '@/modules/loans/domain/errors/invalid-loan-data.error.js';

const VALID_INPUT = {
  principalAmount: 500_000,
  installmentCount: 20,
  installmentValue: 30_000,
  totalPayable: 600_000,
  frequency: 'DAILY' as const,
  startDate: '2026-10-01',
};

describe('validateLoanData', () => {
  it('devuelve los datos tal cual cuando cumplen el contrato', () => {
    expect(validateLoanData(VALID_INPUT)).toEqual(VALID_INPUT);
  });

  it('no exige que totalPayable sea installmentCount × installmentValue', () => {
    expect(
      validateLoanData({ ...VALID_INPUT, totalPayable: 999_999 }).totalPayable,
    ).toBe(999_999);
  });

  it('rechaza un monto prestado en cero', () => {
    let error: unknown;
    try {
      validateLoanData({ ...VALID_INPUT, principalAmount: 0 });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(InvalidLoanDataError);
    expect((error as InvalidLoanDataError).issues[0]?.path).toEqual([
      'principalAmount',
    ]);
  });

  it('rechaza una fecha de inicio que no es AAAA-MM-DD', () => {
    expect(
      validateLoanData.bind(null, { ...VALID_INPUT, startDate: '01/10/2026' }),
    ).toThrow(InvalidLoanDataError);
  });

  it('rechaza una frecuencia que no está en el catálogo', () => {
    expect(
      validateLoanData.bind(null, {
        ...VALID_INPUT,
        frequency: 'YEARLY' as unknown as typeof VALID_INPUT.frequency,
      }),
    ).toThrow(InvalidLoanDataError);
  });

  it('cada issue lleva los valores de su falla para llenar los marcadores del mensaje', () => {
    let error: unknown;
    try {
      validateLoanData({ ...VALID_INPUT, installmentCount: 0 });
    } catch (caught) {
      error = caught;
    }

    expect((error as InvalidLoanDataError).issues[0]?.params).toEqual({
      minimum: '1',
    });
  });
});
