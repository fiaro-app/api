import {
  CollectedByMethodSchema,
  paginated,
  SettlementStatusSchema,
} from '@fiaro-app/contracts';
import { z } from 'zod';
import type {
  SettlementDetails,
  SettlementsPageResult,
} from '@/modules/settlements/application/dtos/settlement-details.dto.js';

/** Respuesta con los datos públicos de un cuadre diario. */
export const SettlementResponseSchema = z
  .object({
    id: z.uuid().meta({ description: 'Identificador del cuadre.' }),
    collectorMembershipId: z.uuid().meta({
      description: 'El cobrador dueño de este cuadre.',
    }),
    date: z.iso.date().meta({ description: 'Fecha de calendario del cuadre.' }),
    expectedAmount: z.int().meta({
      description: 'Lo esperado, declarado por el cobrador.',
    }),
    collectedAmount: z.int().meta({
      description: 'Lo cobrado, suma de collectedByMethod.',
    }),
    collectedByMethod: CollectedByMethodSchema.meta({
      description: 'Lo cobrado en el día, separado por medio de pago.',
    }),
    status: SettlementStatusSchema.meta({ description: 'Estado del cuadre.' }),
    collectorNote: z.string().nullable().meta({
      description:
        'Nota del cobrador; obligatoria cuando collectedAmount difiere de expectedAmount.',
    }),
    reviewNote: z.string().nullable().meta({
      description: 'Comentario del prestamista al revisar.',
    }),
    reviewedByMembershipId: z.uuid().nullable().meta({
      description: 'La membresía que lo revisó, o null mientras sigue PENDING.',
    }),
    reviewedAt: z.iso.datetime({ offset: true }).nullable().meta({
      description: 'Cuándo se revisó, o null mientras sigue PENDING.',
    }),
    submittedAt: z.iso.datetime({ offset: true }).meta({
      description: 'Último envío del cobrador.',
    }),
    createdAt: z.iso.datetime({ offset: true }).meta({
      description: 'Cuándo se creó la primera vez.',
    }),
  })
  .meta({ id: 'SettlementResponse' });

/** Respuesta de `QUERY /daily-settlements`: una página de cuadres. */
export const SettlementsPageResponseSchema = paginated(
  SettlementResponseSchema,
).meta({ id: 'SettlementsPageResponse' });

/** @param details - Los datos del cuadre, tal como los devuelve el caso de uso. */
export function toSettlementResponse(
  details: SettlementDetails,
): z.output<typeof SettlementResponseSchema> {
  return {
    id: details.id,
    collectorMembershipId: details.collectorMembershipId,
    date: details.date,
    expectedAmount: details.expectedAmount,
    collectedAmount: details.collectedAmount,
    collectedByMethod: {
      CASH: details.collectedCash,
      NEQUI: details.collectedNequi,
      TRANSFER: details.collectedTransfer,
    },
    status: details.status,
    collectorNote: details.collectorNote,
    reviewNote: details.reviewNote,
    reviewedByMembershipId: details.reviewedByMembershipId,
    reviewedAt: details.reviewedAt?.toISOString() ?? null,
    submittedAt: details.submittedAt.toISOString(),
    createdAt: details.createdAt.toISOString(),
  };
}

/**
 * @param page - La página de cuadres, tal como la devuelve el caso de uso.
 * @param pageQuery - La página y el tamaño pedidos.
 */
export function toSettlementsPageResponse(
  page: SettlementsPageResult,
  pageQuery: { page: number; pageSize: number },
): z.output<typeof SettlementsPageResponseSchema> {
  return {
    data: page.items.map(toSettlementResponse),
    meta: {
      page: pageQuery.page,
      pageSize: pageQuery.pageSize,
      total: page.total,
    },
  };
}
