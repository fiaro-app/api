import { z } from 'zod';
import type { LoanBalanceDetails } from '@/modules/collections/application/dtos/loan-balance.dto.js';

/** Respuesta con el estado financiero de un préstamo. */
export const LoanBalanceResponseSchema = z
  .object({
    loanId: z.uuid().meta({ description: 'El préstamo consultado.' }),
    asOf: z.iso.date().meta({
      description: 'Fecha con la que se calculó (hoy, en hora de Colombia).',
    }),
    balance: z.int().nonnegative().meta({
      description: 'Lo pactado menos lo pagado. Nunca baja de cero.',
    }),
    totalExpectedToDate: z.int().nonnegative().meta({
      description: 'Suma de las cuotas cuya fecha esperada ya llegó.',
    }),
    overdueAmount: z.int().nonnegative().meta({
      description:
        'Cuánto de lo esperado hasta hoy sigue sin pagar; cero si está al día.',
    }),
    overdueDays: z.int().nonnegative().meta({
      description:
        'Días desde la cuota impaga más antigua; cero si está al día o el préstamo ya cerró.',
    }),
    nextDueDate: z.iso.date().nullable().meta({
      description:
        'Próxima fecha esperada: la cuota impaga más antigua si hay mora, o la siguiente si está al día. null si el préstamo ya cerró o no le quedan cuotas.',
    }),
    firstOverdueDate: z.iso.date().nullable().meta({
      description: 'Fecha de la cuota impaga más antigua; null si no hay mora.',
    }),
  })
  .meta({ id: 'LoanBalanceResponse' });

/** @param details - El estado financiero, tal como lo devuelve el caso de uso. */
export function toLoanBalanceResponse(
  details: LoanBalanceDetails,
): z.output<typeof LoanBalanceResponseSchema> {
  return {
    loanId: details.loanId,
    asOf: details.asOf,
    balance: details.balance,
    totalExpectedToDate: details.totalExpectedToDate,
    overdueAmount: details.overdueAmount,
    overdueDays: details.overdueDays,
    nextDueDate: details.nextDueDate,
    firstOverdueDate: details.firstOverdueDate,
  };
}
