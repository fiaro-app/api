import { PaymentMethodSchema, VisitOutcomeSchema } from '@fiaro-app/contracts';
import { z } from 'zod';
import type { CollectionVisitDetails } from '@/modules/collections/application/dtos/collection-visit-details.dto.js';

/** Respuesta con los datos públicos de una reversión de pago. */
const PaymentReversalResponseSchema = z
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
  .meta({ id: 'PaymentReversalResponse' });

/** Respuesta con los datos públicos de un pago. */
const PaymentResponseSchema = z
  .object({
    id: z.uuid().meta({ description: 'Identificador del pago.' }),
    loanId: z.uuid().meta({ description: 'El préstamo pagado.' }),
    visitId: z.uuid().meta({ description: 'La visita que lo generó.' }),
    amount: z
      .int()
      .meta({ description: 'Monto recibido, en pesos colombianos.' }),
    method: PaymentMethodSchema.meta({
      description: 'Medio con el que se pagó.',
    }),
    occurredAt: z.iso.datetime({ offset: true }).meta({
      description: 'Igual al occurredAt de la visita que lo generó.',
    }),
    createdAt: z.iso.datetime({ offset: true }).meta({
      description: 'Cuándo se registró.',
    }),
    reversal: PaymentReversalResponseSchema.nullable().meta({
      description: 'La reversión de este pago, o null si sigue vigente.',
    }),
  })
  .meta({ id: 'PaymentResponse' });

/** Respuesta con los datos públicos de una visita de cobro. */
export const CollectionVisitResponseSchema = z
  .object({
    id: z.uuid().meta({ description: 'Identificador de la visita.' }),
    loanId: z.uuid().meta({ description: 'El préstamo visitado.' }),
    collectorMembershipId: z.uuid().meta({
      description: 'La membresía (rol COLLECTOR) que hizo la visita.',
    }),
    outcome: VisitOutcomeSchema.meta({
      description: 'Resultado de la visita.',
    }),
    expectedAmount: z.int().meta({
      description: 'Cuota que se esperaba cobrar en ese momento.',
    }),
    promisedDate: z.iso.date().nullable().meta({
      description: 'Solo con RESCHEDULED.',
    }),
    occurredAt: z.iso.datetime({ offset: true }).meta({
      description: 'Hora real de la visita según el dispositivo.',
    }),
    createdAt: z.iso.datetime({ offset: true }).meta({
      description: 'Hora en que la visita llegó al servidor.',
    }),
    payment: PaymentResponseSchema.nullable().meta({
      description: 'El pago que generó, o null si outcome no fue PAID.',
    }),
  })
  .meta({ id: 'CollectionVisitResponse' });

/** Respuesta de `GET /loans/:loanId/collection-visits`: el historial completo, sin paginar. */
export const CollectionVisitsResponseSchema = z
  .array(CollectionVisitResponseSchema)
  .meta({ id: 'CollectionVisitsResponse' });

/** @param details - Los datos de la visita, tal como los devuelve el caso de uso. */
export function toCollectionVisitResponse(
  details: CollectionVisitDetails,
): z.output<typeof CollectionVisitResponseSchema> {
  return {
    id: details.id,
    loanId: details.loanId,
    collectorMembershipId: details.collectorMembershipId,
    outcome: details.outcome,
    expectedAmount: details.expectedAmount,
    promisedDate: details.promisedDate,
    occurredAt: details.occurredAt.toISOString(),
    createdAt: details.createdAt.toISOString(),
    payment:
      details.payment === null
        ? null
        : {
            id: details.payment.id,
            loanId: details.payment.loanId,
            visitId: details.payment.visitId,
            amount: details.payment.amount,
            method: details.payment.method,
            occurredAt: details.payment.occurredAt.toISOString(),
            createdAt: details.payment.createdAt.toISOString(),
            reversal:
              details.payment.reversal === null
                ? null
                : {
                    id: details.payment.reversal.id,
                    paymentId: details.payment.reversal.paymentId,
                    reason: details.payment.reversal.reason,
                    reversedByMembershipId:
                      details.payment.reversal.reversedByMembershipId,
                    createdAt: details.payment.reversal.createdAt.toISOString(),
                  },
          },
  };
}

/** @param list - Las visitas, tal como las devuelve el caso de uso. */
export function toCollectionVisitsResponse(
  list: readonly CollectionVisitDetails[],
): z.output<typeof CollectionVisitsResponseSchema> {
  return list.map(toCollectionVisitResponse);
}
