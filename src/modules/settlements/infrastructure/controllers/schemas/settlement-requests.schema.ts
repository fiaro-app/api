import {
  CopAmountSchema,
  boundedDateRange,
  IdSchema,
  NoteSchema,
  PageQuerySchema,
  SettlementStatusSchema,
} from '@fiaro-app/contracts';
import { z } from 'zod';
import { DATE_RANGE_LIMITS } from '@/shared/infrastructure/http/schemas/date-range-limits.js';

/** Cuerpo de `POST /daily-settlements`. */
export const SubmitSettlementRequestSchema = z.strictObject({
  expectedAmount: CopAmountSchema.meta({
    description: 'Lo esperado hoy, declarado por el cobrador.',
    example: 100_000,
  }),
  collectedCash: CopAmountSchema.meta({
    description: 'Lo cobrado en efectivo.',
    example: 60_000,
  }),
  collectedNequi: CopAmountSchema.meta({
    description: 'Lo cobrado por Nequi.',
    example: 30_000,
  }),
  collectedTransfer: CopAmountSchema.meta({
    description: 'Lo cobrado por transferencia.',
    example: 0,
  }),
  collectorNote: NoteSchema.nullable().optional().meta({
    description:
      'Obligatoria cuando la suma de lo cobrado difiere de expectedAmount.',
  }),
});

/** Cuerpo de `POST /daily-settlements/:id/approve` y `.../reject`. */
export const ReviewSettlementRequestSchema = z.strictObject({
  reviewNote: NoteSchema.nullable().optional().meta({
    description: 'Comentario del prestamista, sobre todo al rechazar.',
  }),
});

/** Cuerpo de `QUERY /daily-settlements`: paginación y filtros opcionales. */
export const ListSettlementsRequestSchema = PageQuerySchema.extend({
  collectorMembershipId: IdSchema.optional().meta({
    description:
      'Solo los cuadres de este cobrador. Ausente para listar los de todos.',
  }),
  status: SettlementStatusSchema.optional().meta({
    description: 'Solo los cuadres en este estado. Ausente para listar todos.',
  }),
  portfolioId: IdSchema.optional().meta({
    description:
      'Solo los cuadres de los cobradores de esta cartera. Ausente para listar los de todas.',
  }),
  dateRange: boundedDateRange(DATE_RANGE_LIMITS.settlements).optional().meta({
    description:
      'Solo los cuadres de estas fechas (la fecha del cuadre, ambos extremos incluidos). Ausente para no acotar.',
  }),
});
