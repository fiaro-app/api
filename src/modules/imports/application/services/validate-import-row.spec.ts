import { describe, expect, it } from 'vitest';
import { validateImportRow } from '@/modules/imports/application/services/validate-import-row.js';
import type { ImportRowInput } from '@/modules/imports/domain/import-row.js';

const ROW: ImportRowInput = {
  nationalId: '1020304050',
  fullName: 'María Pérez',
  occupation: 'Tendera',
  phone: '3001234567',
  address: 'Calle 1 # 2-3',
  loan: {
    remainingInstallments: 10,
    installmentValue: 30_000,
    frequency: 'WEEKLY',
    nextInstallmentDate: '2026-11-03',
  },
};

const COLLECTORS = new Map([['+573009876543', 'membership-9']]);

const LOAN: NonNullable<ImportRowInput['loan']> = {
  remainingInstallments: 10,
  installmentValue: 30_000,
  frequency: 'WEEKLY',
  nextInstallmentDate: '2026-11-03',
};

const withLoan = (loan: Partial<typeof LOAN>) => ({
  ...ROW,
  loan: { ...LOAN, ...loan },
});

describe('validateImportRow', () => {
  it('una fila completa es válida y arranca una cuota antes de la próxima', () => {
    const result = validateImportRow(
      withLoan({ collectorPhone: '300 987 6543' }),
      COLLECTORS,
    );

    expect(result.issues).toEqual([]);
    expect(result.valid?.loan?.collectorMembershipId).toBe('membership-9');
    expect(result.valid?.loan?.data.startDate).toBe('2026-10-27');
    expect(result.valid?.loan?.data.principalAmount).toBe(300_000);
  });

  it('una fila sin préstamo solo trae el cliente', () => {
    const result = validateImportRow({ ...ROW, loan: null }, COLLECTORS);

    expect(result.valid?.loan).toBeNull();
  });

  it('un cobrador desconocido, o un celular que no es de Colombia, deja la fila inválida', () => {
    for (const collectorPhone of ['3101112222', 'abc']) {
      const result = validateImportRow(
        withLoan({ collectorPhone }),
        COLLECTORS,
      );

      expect(result.valid).toBeNull();
      expect(result.issues[0]?.field).toBe('collectorPhone');
    }
  });

  it('una fecha que no existe en el calendario se rechaza', () => {
    const result = validateImportRow(
      withLoan({ nextInstallmentDate: '2026-02-30' }),
      COLLECTORS,
    );

    expect(result.issues.map((issue) => issue.field)).toEqual([
      'nextInstallmentDate',
    ]);
  });

  it('los errores del préstamo salen con el nombre de la columna de la hoja', () => {
    const result = validateImportRow(
      withLoan({ remainingInstallments: 0 }),
      COLLECTORS,
    );

    expect(result.valid).toBeNull();
    expect(result.issues.some((i) => i.field === 'remainingInstallments')).toBe(
      true,
    );
  });

  it('los errores del cliente y del préstamo se juntan', () => {
    const result = validateImportRow(
      { ...ROW, phone: '123', loan: { ...LOAN, installmentValue: -1 } },
      COLLECTORS,
    );

    expect(result.issues.length).toBeGreaterThan(1);
  });

  it('un fallo inesperado no se esconde como error de la fila', () => {
    const broken = {
      ...ROW,
      get address(): string {
        throw new TypeError('inesperado');
      },
    };

    expect(() => validateImportRow(broken, COLLECTORS)).toThrow();
  });
});
