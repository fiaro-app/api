import {
  PaymentMethodSchema,
  VisitOutcomeSchema,
  paginated,
} from '@fiaro-app/contracts';
import { z } from 'zod';
import type { CollectionVisitReportResult } from '@/modules/collections/application/dtos/collection-visit-report.dto.js';

/** Una fila de «Cobros del día». */
export const CollectionVisitReportEntryResponseSchema = z
  .object({
    visitId: z.uuid().meta({ description: 'Identificador de la visita.' }),
    occurredAt: z.iso.datetime({ offset: true }).meta({
      description: 'Hora real de la visita según el dispositivo.',
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
    loan: z
      .object({ id: z.uuid().meta({ description: 'El préstamo visitado.' }) })
      .meta({ id: 'CollectionVisitReportLoan' }),
    client: z
      .object({
        id: z.uuid().meta({ description: 'El cliente del préstamo.' }),
        fullName: z.string().meta({ description: 'Su nombre completo.' }),
      })
      .meta({ id: 'CollectionVisitReportClient' }),
    collector: z
      .object({
        membershipId: z.uuid().meta({ description: 'La membresía que cobró.' }),
        fullName: z
          .string()
          .meta({ description: 'Nombre completo del cobrador.' }),
      })
      .meta({ id: 'CollectionVisitReportCollector' }),
    payment: z
      .object({
        id: z.uuid().meta({ description: 'Identificador del pago.' }),
        amount: z
          .int()
          .meta({ description: 'Monto recibido, en pesos colombianos.' }),
        method: PaymentMethodSchema.meta({
          description: 'Medio con el que se pagó.',
        }),
        reversed: z.boolean().meta({
          description:
            'Si el pago fue anulado con una reversión: ya no cuenta como cobrado.',
        }),
      })
      .nullable()
      .meta({
        id: 'CollectionVisitReportPayment',
        description: 'El pago que generó, o null si outcome no fue PAID.',
      }),
  })
  .meta({ id: 'CollectionVisitReportEntryResponse' });

/** Respuesta de `QUERY /collection-visits`: una página de visitas y el rango que se consultó. */
export const CollectionVisitReportResponseSchema = paginated(
  CollectionVisitReportEntryResponseSchema,
)
  .extend({
    range: z
      .object({
        from: z.iso.date().meta({ description: 'Primera fecha consultada.' }),
        to: z.iso.date().meta({ description: 'Última fecha consultada.' }),
      })
      .meta({
        id: 'CollectionVisitReportRange',
        description: 'El rango resuelto: hoy si la petición no traía uno.',
      }),
  })
  .meta({ id: 'CollectionVisitReportResponse' });

/**
 * @param result - La página, tal como la devuelve el caso de uso.
 * @param query - La paginación pedida.
 */
export function toCollectionVisitReportResponse(
  result: CollectionVisitReportResult,
  query: { readonly page: number; readonly pageSize: number },
): z.output<typeof CollectionVisitReportResponseSchema> {
  return {
    data: result.items.map((entry) => ({
      visitId: entry.visitId,
      occurredAt: entry.occurredAt.toISOString(),
      outcome: entry.outcome,
      expectedAmount: entry.expectedAmount,
      promisedDate: entry.promisedDate,
      loan: entry.loan,
      client: entry.client,
      collector: entry.collector,
      payment: entry.payment,
    })),
    meta: { page: query.page, pageSize: query.pageSize, total: result.total },
    range: { from: result.from, to: result.to },
  };
}
