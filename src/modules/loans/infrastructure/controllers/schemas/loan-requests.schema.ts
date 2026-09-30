import {
  BusinessDateSchema,
  IdSchema,
  LoanFrequencySchema,
  LoanStatusSchema,
  PageQuerySchema,
  PositiveCopAmountSchema,
} from '@fiaro-app/contracts';
import { z } from 'zod';

/** Cuerpo de `POST /loans`. */
export const CreateLoanRequestSchema = z.strictObject({
  clientId: IdSchema.meta({
    description: 'El cliente que solicita el préstamo.',
  }),
  principalAmount: PositiveCopAmountSchema.meta({
    description: 'Monto prestado, en pesos colombianos.',
    example: 500_000,
  }),
  installmentCount: z.int().min(1).meta({
    description: 'Número de cuotas pactadas.',
    example: 20,
  }),
  installmentValue: PositiveCopAmountSchema.meta({
    description: 'Valor de cada cuota, en pesos colombianos.',
    example: 30_000,
  }),
  totalPayable: PositiveCopAmountSchema.meta({
    description:
      'Lo pactado en total. La app sugiere installmentCount × installmentValue, pero se respeta lo acordado.',
    example: 600_000,
  }),
  frequency: LoanFrequencySchema.meta({
    description: 'Cada cuánto se cobra una cuota.',
    example: 'DAILY',
  }),
  startDate: BusinessDateSchema.meta({
    description: 'Fecha de calendario en que arranca el préstamo.',
    example: '2026-10-01',
  }),
});

/** Cuerpo de `QUERY /loans`: paginación y filtros opcionales. */
export const ListLoansRequestSchema = PageQuerySchema.extend({
  clientId: IdSchema.optional().meta({
    description:
      'Solo los préstamos de este cliente. Ausente para listar los de todos.',
  }),
  status: LoanStatusSchema.optional().meta({
    description:
      'Solo los préstamos en este estado. Ausente para listar todos.',
  }),
});
