import { describe, expect, it } from 'vitest';
import {
  sumNetPayments,
  sumNetPaymentsAsOf,
} from '@/modules/collections/application/services/sum-net-payments.js';
import { CollectionVisit } from '@/modules/collections/domain/entities/collection-visit.entity.js';
import { Payment } from '@/modules/collections/domain/entities/payment.entity.js';
import { PaymentReversal } from '@/modules/collections/domain/entities/payment-reversal.entity.js';
import type { CollectionVisitRecord } from '@/modules/collections/domain/repositories/collection-visit-record.js';

const OCCURRED_AT = new Date('2026-10-01T14:00:00Z');

function visitRecord(
  id: string,
  payment: Payment | null,
  reversal: PaymentReversal | null = null,
): CollectionVisitRecord {
  return {
    visit: CollectionVisit.create({
      id,
      loanId: 'loan-1',
      collectorMembershipId: 'membership-1',
      outcome: payment === null ? 'NOT_FOUND' : 'PAID',
      expectedAmount: 10_000,
      promisedDate: null,
      occurredAt: OCCURRED_AT,
      createdAt: OCCURRED_AT,
    }),
    payment,
    reversal,
  };
}

function payment(id: string, amount: number): Payment {
  return Payment.create({
    id,
    loanId: 'loan-1',
    visitId: id,
    amount,
    method: 'CASH',
    occurredAt: OCCURRED_AT,
    createdAt: OCCURRED_AT,
  });
}

function reversal(paymentId: string): PaymentReversal {
  return PaymentReversal.create({
    id: `${paymentId}-reversal`,
    paymentId,
    reason: 'Monto equivocado.',
    reversedByMembershipId: 'membership-2',
    createdAt: OCCURRED_AT,
  });
}

describe('sumNetPayments', () => {
  it('da 0 para una lista vacía', () => {
    expect(sumNetPayments([])).toBe(0);
  });

  it('suma los pagos de visitas PAID', () => {
    const records = [
      visitRecord('visit-1', payment('payment-1', 10_000)),
      visitRecord('visit-2', payment('payment-2', 20_000)),
    ];

    expect(sumNetPayments(records)).toBe(30_000);
  });

  it('ignora las visitas sin pago', () => {
    const records = [
      visitRecord('visit-1', payment('payment-1', 10_000)),
      visitRecord('visit-2', null),
    ];

    expect(sumNetPayments(records)).toBe(10_000);
  });

  it('no suma un pago que tiene reversión', () => {
    const records = [
      visitRecord('visit-1', payment('payment-1', 10_000)),
      visitRecord(
        'visit-2',
        payment('payment-2', 20_000),
        reversal('payment-2'),
      ),
    ];

    expect(sumNetPayments(records)).toBe(10_000);
  });
});

describe('sumNetPaymentsAsOf', () => {
  const PAYMENT_DAY = '2026-10-01'; // OCCURRED_AT, 09:00 en Bogotá

  function reversalCreatedAt(
    paymentId: string,
    createdAt: Date,
  ): PaymentReversal {
    return PaymentReversal.create({
      id: `${paymentId}-reversal`,
      paymentId,
      reason: 'Monto equivocado.',
      reversedByMembershipId: 'membership-2',
      createdAt,
    });
  }

  it('no cuenta un pago posterior a la fecha, y sí uno de ese mismo día', () => {
    const records = [visitRecord('visit-1', payment('payment-1', 10_000))];

    expect(sumNetPaymentsAsOf(records, '2026-09-30')).toBe(0);
    expect(sumNetPaymentsAsOf(records, PAYMENT_DAY)).toBe(10_000);
    expect(sumNetPaymentsAsOf(records, '2026-10-20')).toBe(10_000);
  });

  it('un pago reversado después de la fecha todavía contaba entonces', () => {
    const records = [
      visitRecord(
        'visit-1',
        payment('payment-1', 10_000),
        reversalCreatedAt('payment-1', new Date('2026-10-05T14:00:00Z')),
      ),
    ];

    expect(sumNetPaymentsAsOf(records, '2026-10-04')).toBe(10_000);
    expect(sumNetPaymentsAsOf(records, '2026-10-05')).toBe(0);
    expect(sumNetPaymentsAsOf(records, '2026-10-06')).toBe(0);
  });

  it('ignora las visitas sin pago', () => {
    expect(
      sumNetPaymentsAsOf([visitRecord('visit-1', null)], '2026-10-20'),
    ).toBe(0);
  });

  it('usa el día de Bogotá, no el de UTC: un pago a las 22:00 de Bogotá es de ese día', () => {
    const late = Payment.create({
      id: 'payment-late',
      loanId: 'loan-1',
      visitId: 'visit-late',
      amount: 5_000,
      method: 'CASH',
      occurredAt: new Date('2026-10-02T03:00:00Z'), // 2026-10-01 22:00 en Bogotá
      createdAt: new Date('2026-10-02T03:00:00Z'),
    });

    expect(
      sumNetPaymentsAsOf([visitRecord('visit-late', late)], '2026-10-01'),
    ).toBe(5_000);
  });
});
