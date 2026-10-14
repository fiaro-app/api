import { LoanFrequencySchema, LoanStatusSchema } from '@fiaro-app/contracts';
import { z } from 'zod';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';

/** Respuesta con los datos públicos de un préstamo. */
export const LoanResponseSchema = z
  .object({
    id: z.uuid().meta({ description: 'Identificador del préstamo.' }),
    clientId: z.uuid().meta({ description: 'El cliente que lo solicitó.' }),
    principalAmount: z.int().meta({
      description: 'Monto prestado, en pesos colombianos.',
    }),
    installmentCount: z
      .int()
      .meta({ description: 'Número de cuotas pactadas.' }),
    installmentValue: z.int().meta({
      description: 'Valor de cada cuota, en pesos colombianos.',
    }),
    totalPayable: z.int().meta({ description: 'Lo pactado en total.' }),
    frequency: LoanFrequencySchema.meta({
      description: 'Cada cuánto se cobra una cuota.',
    }),
    startDate: z.iso.date().meta({
      description: 'Fecha de calendario en que arranca el préstamo.',
    }),
    status: LoanStatusSchema.meta({ description: 'Estado del préstamo.' }),
    createdByMembershipId: z.uuid().meta({
      description: 'La membresía que lo dio de alta.',
    }),
    createdAt: z.iso.datetime({ offset: true }).meta({
      description: 'Cuándo se dio de alta.',
    }),
    closedAt: z.iso.datetime({ offset: true }).nullable().meta({
      description:
        'Cuándo pasó a PAID_OFF o CANCELED, o null mientras sigue ACTIVE.',
    }),
  })
  .meta({ id: 'LoanResponse' });

/** @param details - Los datos del préstamo, tal como los devuelve el caso de uso. */
export function toLoanResponse(
  details: LoanDetails,
): z.output<typeof LoanResponseSchema> {
  return {
    id: details.id,
    clientId: details.clientId,
    principalAmount: details.principalAmount,
    installmentCount: details.installmentCount,
    installmentValue: details.installmentValue,
    totalPayable: details.totalPayable,
    frequency: details.frequency,
    startDate: details.startDate,
    status: details.status,
    createdByMembershipId: details.createdByMembershipId,
    createdAt: details.createdAt.toISOString(),
    closedAt: details.closedAt?.toISOString() ?? null,
  };
}
