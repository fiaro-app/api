import { z } from 'zod';
import {
  MAX_RISK_CLIENTS,
  type ClientRiskEntry,
} from '@/modules/dashboard/application/dtos/clients-risk.dto.js';

/** Cuerpo de `QUERY /lenders/me/clients/risk`. */
export const GetClientsRiskRequestSchema = z.strictObject({
  clientIds: z
    .array(z.uuid())
    .min(1)
    .max(MAX_RISK_CLIENTS)
    .meta({
      description: `Los clientes a puntuar (hasta ${String(MAX_RISK_CLIENTS)}).`,
    }),
});

/** Respuesta de `QUERY /lenders/me/clients/risk`: un puntaje por cliente pedido, en el mismo orden. */
export const ClientsRiskResponseSchema = z
  .object({
    data: z.array(
      z.object({
        clientId: z.uuid(),
        score: z
          .int()
          .min(0)
          .max(100)
          .meta({ description: 'De 0 (sin riesgo) a 100 (riesgo máximo).' }),
        level: z
          .enum(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'])
          .meta({ description: 'Bajo, medio, alto o muy alto.' }),
        loansCount: z.int().nonnegative().meta({
          description:
            'Préstamos del cliente en este negocio (sin cancelados); 0 si es nuevo.',
        }),
        factors: z.array(
          z.object({
            code: z.enum([
              'OVERDUE_DAYS',
              'OVERDUE_SHARE',
              'MULTIPLE_LOANS_IN_ARREARS',
              'PAID_LOANS',
            ]),
            points: z
              .int()
              .meta({ description: 'Lo que sumó o restó al puntaje.' }),
            value: z.int().nonnegative().meta({
              description:
                'El dato: días de atraso, % vencido, préstamos en mora o préstamos pagados.',
            }),
          }),
        ),
      }),
    ),
  })
  .meta({ id: 'ClientsRiskResponse' });

/** @param entries - El riesgo calculado de cada cliente. */
export function toClientsRiskResponse(
  entries: readonly ClientRiskEntry[],
): z.output<typeof ClientsRiskResponseSchema> {
  return {
    data: entries.map((entry) => ({ ...entry, factors: [...entry.factors] })),
  };
}
