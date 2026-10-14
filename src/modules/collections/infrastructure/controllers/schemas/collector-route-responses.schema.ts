import { z } from 'zod';
import type { CollectorRouteEntry } from '@/modules/collections/application/dtos/collector-route-entry.dto.js';

/** Una fila de la ruta del día: un préstamo con su cliente y su estado financiero. */
export const CollectorRouteEntryResponseSchema = z
  .object({
    loanId: z.uuid().meta({ description: 'El préstamo a cobrar.' }),
    clientId: z.uuid().meta({ description: 'El cliente del préstamo.' }),
    clientFullName: z
      .string()
      .meta({ description: 'Nombre completo del cliente.' }),
    balance: z.int().meta({ description: 'Saldo pendiente del préstamo.' }),
    overdueAmount: z.int().meta({
      description: 'Cuánto de lo esperado hasta la fecha sigue sin pagar.',
    }),
    overdueDays: z.int().meta({
      description: 'Días desde la cuota impaga más antigua.',
    }),
    nextDueDate: z.iso.date().nullable().meta({
      description: 'Próxima fecha en la que se espera un pago, o null.',
    }),
  })
  .meta({ id: 'CollectorRouteEntryResponse' });

/** Respuesta de `QUERY /collectors/me/route`: la ruta del día, sin paginar. */
export const CollectorRouteResponseSchema = z
  .array(CollectorRouteEntryResponseSchema)
  .meta({ id: 'CollectorRouteResponse' });

/** @param entries - Las filas de la ruta, tal como las devuelve el caso de uso. */
export function toCollectorRouteResponse(
  entries: readonly CollectorRouteEntry[],
): z.output<typeof CollectorRouteResponseSchema> {
  return entries.map((entry) => ({
    loanId: entry.loanId,
    clientId: entry.clientId,
    clientFullName: entry.clientFullName,
    balance: entry.balance,
    overdueAmount: entry.overdueAmount,
    overdueDays: entry.overdueDays,
    nextDueDate: entry.nextDueDate,
  }));
}
