import { describe, expect, it } from 'vitest';
import type { LenderDetails } from '@/modules/lenders/application/dtos/lender-details.dto.js';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';
import { computeExpectedForDay } from '@/modules/collections/application/services/compute-expected-for-day.js';
import { CollectionVisit } from '@/modules/collections/domain/entities/collection-visit.entity.js';
import { Payment } from '@/modules/collections/domain/entities/payment.entity.js';
import type { CollectionVisitRecord } from '@/modules/collections/domain/repositories/collection-visit-record.js';

const LENDER = {
  nonWorkingWeekdays: [],
  skipNationalHolidays: false,
} as unknown as LenderDetails;

function loan(startDate: string): LoanDetails {
  return {
    id: 'loan-1',
    clientId: 'client-1',
    principalAmount: 50_000,
    installmentCount: 5,
    installmentValue: 10_000,
    totalPayable: 50_000,
    frequency: 'DAILY',
    startDate,
    status: 'ACTIVE',
    createdByMembershipId: 'm',
    createdAt: new Date('2026-09-01T00:00:00Z'),
    closedAt: null,
  };
}

function paid(amount: number, day: string): CollectionVisitRecord {
  const at = new Date(`${day}T15:00:00Z`);
  return {
    visit: CollectionVisit.create({
      id: `v-${day}`,
      loanId: 'loan-1',
      collectorMembershipId: 'm',
      outcome: 'PAID',
      expectedAmount: 10_000,
      promisedDate: null,
      occurredAt: at,
      createdAt: at,
    }),
    payment: Payment.create({
      id: `p-${day}`,
      loanId: 'loan-1',
      visitId: `v-${day}`,
      amount,
      method: 'CASH',
      occurredAt: at,
      createdAt: at,
    }),
    reversal: null,
  };
}

describe('computeExpectedForDay', () => {
  it('suma la cuota de hoy y la mora que traía', () => {
    // la primera cuota vence al día siguiente del arranque: al cierre del 3 van 20.000, pagó 10.000 → mora 10.000, más la de hoy
    expect(
      computeExpectedForDay(
        loan('2026-10-01'),
        LENDER,
        [paid(10_000, '2026-10-02')],
        '2026-10-04',
      ),
    ).toBe(20_000);
  });

  it('no pasa del saldo que le quedaba', () => {
    expect(
      computeExpectedForDay(
        loan('2026-10-01'),
        LENDER,
        [paid(45_000, '2026-10-02')],
        '2026-10-05',
      ),
    ).toBe(5_000);
  });

  it('el pago adelantado no descuenta la cuota de hoy', () => {
    expect(
      computeExpectedForDay(
        loan('2026-10-01'),
        LENDER,
        [paid(30_000, '2026-10-01')],
        '2026-10-03',
      ),
    ).toBe(10_000);
  });

  it('un préstamo cuya primera cuota vence hoy espera solo esa cuota', () => {
    expect(
      computeExpectedForDay(loan('2026-10-03'), LENDER, [], '2026-10-04'),
    ).toBe(10_000);
  });

  it('un préstamo que arranca hoy todavía no tiene cuotas ni mora', () => {
    expect(
      computeExpectedForDay(loan('2026-10-04'), LENDER, [], '2026-10-04'),
    ).toBe(0);
  });
});
