import {
  CollectedByMethodSchema,
  SettlementStatusSchema,
} from '@fiaro-app/contracts';
import { z } from 'zod';
import type { LenderDashboard } from '@/modules/dashboard/application/dtos/lender-dashboard.dto.js';

/**
 * Un cuadre `PENDING`, tal como lo embebe el resumen del Lender. Repite el mismo conjunto de
 * campos que `SettlementResponseSchema` (`settlements`), pero como definición propia: una regla
 * de `boundaries/dependencies` le impide a `infrastructure` importar `infrastructure` de otro
 * módulo, así que cada módulo define su propio contrato de salida aunque el de entrada
 * (`SettlementDetails`, D-99) sea el mismo.
 */
const DashboardSettlementSchema = z
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
  })
  .meta({ id: 'DashboardSettlement' });

/** Respuesta de `GET /lenders/me/dashboard`. */
export const LenderDashboardResponseSchema = z
  .object({
    totalPortfolio: z.int().nonnegative().meta({
      description: 'Suma del saldo pendiente de los préstamos activos.',
    }),
    collectedToday: z.int().nonnegative().meta({
      description: 'Lo cobrado hoy, sumado entre todos los cobradores.',
    }),
    activeCollectors: z.int().nonnegative().meta({
      description: 'Membresías COLLECTOR activas.',
    }),
    totalCollectors: z.int().nonnegative().meta({
      description: 'Membresías COLLECTOR, activas o no.',
    }),
    effectivenessToday: z.number().min(0).nullable().meta({
      description:
        'collectedToday sobre lo esperado hoy. null si no había nada esperado.',
    }),
    clientsInArrears: z.int().nonnegative().meta({
      description: 'Clientes distintos con al menos un préstamo en mora hoy.',
    }),
    alerts: z.array(z.string()).meta({
      description: 'Alertas de texto ya armadas; vacío si ninguna aplica.',
    }),
    pendingSettlements: z.array(DashboardSettlementSchema).meta({
      description: 'Los cuadres PENDING del Lender, para revisar.',
    }),
  })
  .meta({ id: 'LenderDashboardResponse' });

/** @param dashboard - El resumen, tal como lo devuelve el caso de uso. */
export function toLenderDashboardResponse(
  dashboard: LenderDashboard,
): z.output<typeof LenderDashboardResponseSchema> {
  return {
    totalPortfolio: dashboard.totalPortfolio,
    collectedToday: dashboard.collectedToday,
    activeCollectors: dashboard.activeCollectors,
    totalCollectors: dashboard.totalCollectors,
    effectivenessToday: dashboard.effectivenessToday,
    clientsInArrears: dashboard.clientsInArrears,
    alerts: [...dashboard.alerts],
    pendingSettlements: dashboard.pendingSettlements.map((settlement) => ({
      id: settlement.id,
      collectorMembershipId: settlement.collectorMembershipId,
      date: settlement.date,
      expectedAmount: settlement.expectedAmount,
      collectedAmount: settlement.collectedAmount,
      collectedByMethod: {
        CASH: settlement.collectedCash,
        NEQUI: settlement.collectedNequi,
        TRANSFER: settlement.collectedTransfer,
      },
      status: settlement.status,
      collectorNote: settlement.collectorNote,
    })),
  };
}
