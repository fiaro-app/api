import { describe, expect, it } from 'vitest';
import { calculateLoanBalance } from '@/modules/collections/application/services/calculate-loan-balance.js';
import { CollectionVisit } from '@/modules/collections/domain/entities/collection-visit.entity.js';
import { Payment } from '@/modules/collections/domain/entities/payment.entity.js';
import type { CollectionVisitRecord } from '@/modules/collections/domain/repositories/collection-visit-record.js';
import type { LenderDetails } from '@/modules/lenders/application/dtos/lender-details.dto.js';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';

const LENDER = {
  nonWorkingWeekdays: [],
  skipNationalHolidays: false,
} as unknown as LenderDetails;

const loan = (overrides: Partial<LoanDetails> = {}): LoanDetails =>
  ({
    id: 'loan-1',
    startDate: '2026-09-24',
    frequency: 'DAILY',
    installmentCount: 5,
    installmentValue: 10_000,
    totalPayable: 50_000,
    status: 'ACTIVE',
    closedAt: null,
    ...overrides,
  }) as LoanDetails;

const paid = (amount: number): CollectionVisitRecord => {
  const at = new Date('2026-09-26T15:00:00Z');
  return {
    visit: CollectionVisit.create({
      id: 'visit-1',
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      outcome: 'PAID',
      expectedAmount: 10_000,
      promisedDate: null,
      occurredAt: at,
      createdAt: at,
    }),
    payment: Payment.create({
      id: 'payment-1',
      loanId: 'loan-1',
      visitId: 'visit-1',
      amount,
      method: 'CASH',
      occurredAt: at,
      createdAt: at,
    }),
    reversal: null,
  };
};

describe('calculateLoanBalance', () => {
  it('calcula el saldo y la mora de hoy con los pagos vigentes', () => {
    const result = calculateLoanBalance({
      loan: loan(),
      lender: LENDER,
      records: [paid(10_000)],
      today: '2026-09-27',
    });

    expect(result).toMatchObject({
      loanId: 'loan-1',
      asOf: '2026-09-27',
      balance: 40_000,
      overdueAmount: 20_000, // vencían 25, 26 y 27: 30.000 menos 10.000 pagados
    });
  });

  it('un préstamo cerrado no tiene mora', () => {
    const result = calculateLoanBalance({
      loan: loan({
        status: 'PAID_OFF',
        closedAt: new Date('2026-09-26T12:00:00Z'),
      }),
      lender: LENDER,
      records: [paid(50_000)],
      today: '2026-09-27',
    });

    expect(result.overdueAmount).toBe(0);
    expect(result.nextDueDate).toBeNull();
  });

  describe('con asOf', () => {
    it('usa esa fecha y solo los pagos hasta ella', () => {
      const result = calculateLoanBalance({
        loan: loan(),
        lender: LENDER,
        records: [paid(10_000)], // pagado el 26
        today: '2026-09-27',
        asOf: '2026-09-25',
      });

      expect(result.asOf).toBe('2026-09-25');
      expect(result.balance).toBe(50_000);
    });

    it('un préstamo cerrado después de esa fecha todavía estaba abierto', () => {
      const closed = loan({
        status: 'PAID_OFF',
        closedAt: new Date('2026-09-27T15:00:00-05:00'),
      });

      const before = calculateLoanBalance({
        loan: closed,
        lender: LENDER,
        records: [],
        today: '2026-09-30',
        asOf: '2026-09-26',
      });
      const after = calculateLoanBalance({
        loan: closed,
        lender: LENDER,
        records: [],
        today: '2026-09-30',
        asOf: '2026-09-27',
      });

      expect(before.overdueAmount).toBe(20_000);
      expect(after.overdueAmount).toBe(0);
    });

    it('un préstamo no activo sin fecha de cierre se da por cerrado', () => {
      const result = calculateLoanBalance({
        loan: loan({ status: 'CANCELED', closedAt: null }),
        lender: LENDER,
        records: [],
        today: '2026-09-30',
        asOf: '2026-09-26',
      });

      expect(result.overdueAmount).toBe(0);
    });
  });
});
