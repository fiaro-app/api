import { z } from 'zod';
import type { PaymentReversalDetails } from '@/modules/collections/application/dtos/payment-reversal-details.dto.js';

/** Respuesta con los datos públicos de una reversión de pago. */
export const PaymentReversalResponseSchema = z
  .object({
    id: z.uuid().meta({ description: 'Identificador de la reversión.' }),
    paymentId: z.uuid().meta({ description: 'El pago anulado.' }),
    reason: z.string().meta({ description: 'Motivo.' }),
    reversedByMembershipId: z.uuid().meta({
      description: 'La membresía (rol LENDER) que la hizo.',
    }),
    createdAt: z.iso.datetime({ offset: true }).meta({
      description: 'Cuándo se registró.',
    }),
  })
  .meta({ id: 'CreatePaymentReversalResponse' });

/** @param details - Los datos de la reversión, tal como los devuelve el caso de uso. */
export function toPaymentReversalResponse(
  details: PaymentReversalDetails,
): z.output<typeof PaymentReversalResponseSchema> {
  return {
    id: details.id,
    paymentId: details.paymentId,
    reason: details.reason,
    reversedByMembershipId: details.reversedByMembershipId,
    createdAt: details.createdAt.toISOString(),
  };
}
