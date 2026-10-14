import {
  BusinessDateSchema,
  IdSchema,
  PaymentMethodSchema,
  PositiveCopAmountSchema,
  TimestampSchema,
  VisitOutcomeSchema,
} from '@fiaro-app/contracts';
import { z } from 'zod';

/** El pago de la visita, solo cuando `outcome` es `PAID`. */
const CollectionVisitPaymentRequestSchema = z.strictObject({
  amount: PositiveCopAmountSchema.meta({
    description: 'Monto recibido, en pesos colombianos.',
    example: 30_000,
  }),
  method: PaymentMethodSchema.optional().meta({
    description: 'Ausente: CASH por defecto.',
    example: 'CASH',
  }),
});

/**
 * Cuerpo de `POST /loans/:loanId/collection-visits`.
 *
 * @remarks
 * `id` lo genera el dispositivo (UUIDv7): también es la llave de idempotencia de la visita
 * (D-29). Las combinaciones entre `outcome`, `payment` y `promisedDate` las valida
 * `CreateCollectionVisitUseCase`, no este schema: dependen de una regla de negocio, no solo de
 * la forma del cuerpo.
 */
export const CreateCollectionVisitRequestSchema = z.strictObject({
  id: IdSchema.meta({
    description: 'Identificador de la visita, generado por el dispositivo.',
  }),
  outcome: VisitOutcomeSchema.meta({
    description: 'Resultado de la visita.',
    example: 'PAID',
  }),
  promisedDate: BusinessDateSchema.nullable().optional().meta({
    description: 'Obligatoria si, y solo si, outcome es RESCHEDULED.',
  }),
  occurredAt: TimestampSchema.meta({
    description: 'Hora real de la visita según el dispositivo.',
  }),
  payment: CollectionVisitPaymentRequestSchema.nullable().optional().meta({
    description: 'Obligatorio si, y solo si, outcome es PAID.',
  }),
});
