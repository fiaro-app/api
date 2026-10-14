import { describe, expect, it } from 'vitest';
import type { PaymentReversalDetails } from '@/modules/collections/application/dtos/payment-reversal-details.dto.js';
import { toPaymentReversalResponse } from '@/modules/collections/infrastructure/controllers/schemas/payment-reversal-responses.schema.js';

describe('toPaymentReversalResponse', () => {
  it('convierte la fecha de creación a texto ISO', () => {
    const details: PaymentReversalDetails = {
      id: 'reversal-1',
      paymentId: 'payment-1',
      reason: 'Monto equivocado.',
      reversedByMembershipId: 'membership-1',
      createdAt: new Date('2026-10-01T14:05:00Z'),
    };

    expect(toPaymentReversalResponse(details)).toEqual({
      id: 'reversal-1',
      paymentId: 'payment-1',
      reason: 'Monto equivocado.',
      reversedByMembershipId: 'membership-1',
      createdAt: '2026-10-01T14:05:00.000Z',
    });
  });
});
