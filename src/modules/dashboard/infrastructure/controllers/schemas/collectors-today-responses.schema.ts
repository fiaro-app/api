import { SettlementStatusSchema } from '@fiaro-app/contracts';
import { z } from 'zod';
import type { CollectorsToday } from '@/modules/dashboard/application/dtos/collectors-today.dto.js';

const RouteStatusSchema = z.enum([
  'NO_ROUTE',
  'NOT_STARTED',
  'IN_PROGRESS',
  'FINISHED',
]);

/** Cómo va la ruta de hoy de un cobrador. */
const CollectorTodaySchema = z
  .object({
    membershipId: z.uuid().meta({ description: 'La membresía del cobrador.' }),
    fullName: z.string().meta({ description: 'Nombre completo del cobrador.' }),
    status: RouteStatusSchema.meta({
      description:
        '`NO_ROUTE`: sin préstamos asignados; `NOT_STARTED`: ninguna visita todavía; `IN_PROGRESS`: en marcha; `FINISHED`: todos sus préstamos visitados.',
    }),
    routeLoans: z.int().nonnegative().meta({
      description: 'Préstamos en su ruta de hoy.',
    }),
    visitedLoans: z.int().nonnegative().meta({
      description: 'De esos, cuántos ya visitó.',
    }),
    pendingLoans: z.int().nonnegative().meta({
      description: 'Cuántos le faltan por visitar.',
    }),
    expectedAmount: z.int().nonnegative().meta({
      description: 'Lo que se esperaba cobrar hoy.',
    }),
    collectedAmount: z.int().nonnegative().meta({
      description: 'Lo que ya cobró hoy, sin los pagos reversados.',
    }),
    firstVisitAt: z.iso.datetime().nullable().meta({
      description: 'Su primera visita de hoy; null si no ha empezado.',
    }),
    lastVisitAt: z.iso.datetime().nullable().meta({
      description: 'Su última visita de hoy; null si no ha empezado.',
    }),
    settlementStatus: SettlementStatusSchema.nullable().meta({
      description:
        'Estado del cuadre que envió hoy; null si todavía no lo envía.',
    }),
  })
  .meta({ id: 'CollectorTodayProgress' });

/** Respuesta de `GET /lenders/me/collectors-today`. */
export const CollectorsTodayResponseSchema = z
  .object({
    date: z.iso.date().meta({ description: 'El día, en hora de Colombia.' }),
    counts: z
      .object({
        NO_ROUTE: z.int().nonnegative(),
        NOT_STARTED: z.int().nonnegative(),
        IN_PROGRESS: z.int().nonnegative(),
        FINISHED: z.int().nonnegative(),
      })
      .meta({ description: 'Cuántos cobradores activos hay en cada estado.' }),
    collectors: z.array(CollectorTodaySchema).meta({
      description:
        'Primero los que no han empezado, luego los que van en marcha (los que más les falta primero), los que terminaron y los que no tienen ruta.',
    }),
  })
  .meta({ id: 'CollectorsTodayResponse' });

/** @param today - El avance de hoy, tal como lo devuelve el caso de uso. */
export function toCollectorsTodayResponse(
  today: CollectorsToday,
): z.output<typeof CollectorsTodayResponseSchema> {
  return {
    date: today.date,
    counts: { ...today.counts },
    collectors: today.collectors.map((collector) => ({
      ...collector,
      firstVisitAt: collector.firstVisitAt?.toISOString() ?? null,
      lastVisitAt: collector.lastVisitAt?.toISOString() ?? null,
    })),
  };
}
