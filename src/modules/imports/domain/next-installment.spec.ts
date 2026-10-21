import { describe, expect, it } from 'vitest';
import { startDateForNextInstallment } from '@/modules/imports/domain/next-installment.js';

describe('startDateForNextInstallment', () => {
  it('diario, semanal y quincenal retroceden un período', () => {
    expect(startDateForNextInstallment('2026-10-22', 'DAILY')).toBe(
      '2026-10-21',
    );
    expect(startDateForNextInstallment('2026-10-22', 'WEEKLY')).toBe(
      '2026-10-15',
    );
    expect(startDateForNextInstallment('2026-10-22', 'BIWEEKLY')).toBe(
      '2026-10-07',
    );
  });

  it('mensual retrocede un mes, también en enero y con meses cortos', () => {
    expect(startDateForNextInstallment('2026-10-22', 'MONTHLY')).toBe(
      '2026-09-22',
    );
    expect(startDateForNextInstallment('2026-01-15', 'MONTHLY')).toBe(
      '2025-12-15',
    );
    expect(startDateForNextInstallment('2026-03-31', 'MONTHLY')).toBe(
      '2026-02-28',
    );
    expect(startDateForNextInstallment('2028-03-31', 'MONTHLY')).toBe(
      '2028-02-29',
    );
  });

  it('cruza el cambio de año', () => {
    expect(startDateForNextInstallment('2026-01-03', 'WEEKLY')).toBe(
      '2025-12-27',
    );
  });
});
