import { z } from 'zod';
import type { LoanInstallmentsDetails } from '@/modules/collections/application/dtos/loan-installments.dto.js';

/** Una cuota del calendario de un préstamo. */
export const LoanInstallmentResponseSchema = z
  .object({
    number: z
      .int()
      .positive()
      .meta({ description: 'Número de cuota, desde 1.' }),
    dueDate: z.iso
      .date()
      .meta({ description: 'Fecha en que se espera el pago.' }),
    expectedAmount: z
      .int()
      .positive()
      .meta({ description: 'Lo que debe pagarse en esta cuota.' }),
    paidAmount: z.int().nonnegative().meta({
      description:
        'Lo que ya se le imputó (los pagos se aplican de la cuota más antigua a la más nueva); nunca pasa de expectedAmount.',
    }),
    status: z.enum(['PAID', 'PARTIAL', 'OVERDUE', 'PENDING']).meta({
      description:
        'PAID (cubierta), PARTIAL (con algo pagado, pero no todo), OVERDUE (sin pagar y con fecha ya cumplida) o PENDING (sin pagar y aún no vence, o de un préstamo ya cerrado).',
    }),
  })
  .meta({ id: 'LoanInstallmentResponse' });

/** Respuesta con el calendario completo de cuotas de un préstamo. */
export const LoanInstallmentsResponseSchema = z
  .object({
    loanId: z.uuid().meta({ description: 'El préstamo consultado.' }),
    asOf: z.iso.date().meta({
      description: 'Fecha con la que se calculó (hoy, en hora de Colombia).',
    }),
    installments: z
      .array(LoanInstallmentResponseSchema)
      .meta({ description: 'Las cuotas, de la primera a la última.' }),
  })
  .meta({ id: 'LoanInstallmentsResponse' });

/** @param details - El calendario, tal como lo devuelve el caso de uso. */
export function toLoanInstallmentsResponse(
  details: LoanInstallmentsDetails,
): z.output<typeof LoanInstallmentsResponseSchema> {
  return {
    loanId: details.loanId,
    asOf: details.asOf,
    installments: details.installments.map((installment) => ({
      number: installment.number,
      dueDate: installment.dueDate,
      expectedAmount: installment.expectedAmount,
      paidAmount: installment.paidAmount,
      status: installment.status,
    })),
  };
}
