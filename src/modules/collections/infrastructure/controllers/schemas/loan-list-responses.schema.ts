import {
  LoanFrequencySchema,
  LoanStatusSchema,
  paginated,
} from '@fiaro-app/contracts';
import { z } from 'zod';
import type { LoansWithBalancePage } from '@/modules/collections/application/dtos/portfolio-list.dto.js';

/** Un préstamo de la lista: sus datos públicos, más su saldo, su mora y quién lo cobra hoy. */
export const LoanListItemResponseSchema = z
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
    balance: z.int().nonnegative().meta({
      description: 'Lo pactado menos lo pagado. Nunca baja de cero.',
    }),
    overdueAmount: z.int().nonnegative().meta({
      description:
        'Cuánto de lo esperado hasta hoy sigue sin pagar; cero si está al día o el préstamo cerró.',
    }),
    overdueDays: z.int().nonnegative().meta({
      description:
        'Días desde la cuota impaga más antigua; cero si está al día o el préstamo cerró.',
    }),
    nextDueDate: z.iso.date().nullable().meta({
      description:
        'Próxima fecha esperada de pago. null si el préstamo ya cerró o no le quedan cuotas.',
    }),
    collector: z
      .object({
        membershipId: z.uuid().meta({ description: 'La membresía que cobra.' }),
        fullName: z.string().meta({ description: 'Su nombre completo.' }),
      })
      .nullable()
      .meta({
        id: 'LoanListItemCollector',
        description: 'Quien lo cobra hoy, o null si ninguno lo tiene asignado.',
      }),
  })
  .meta({ id: 'LoanListItemResponse' });

/** Respuesta de `QUERY /loans`: una página de préstamos con su saldo. */
export const LoanListResponseSchema = paginated(
  LoanListItemResponseSchema,
).meta({ id: 'LoanListResponse' });

/**
 * @param page - La página, tal como la devuelve el caso de uso.
 * @param pageQuery - La página y el tamaño pedidos.
 */
export function toLoanListResponse(
  page: LoansWithBalancePage,
  pageQuery: { page: number; pageSize: number },
): z.output<typeof LoanListResponseSchema> {
  return {
    data: page.items.map(({ loan, collector, ...balance }) => ({
      id: loan.id,
      clientId: loan.clientId,
      principalAmount: loan.principalAmount,
      installmentCount: loan.installmentCount,
      installmentValue: loan.installmentValue,
      totalPayable: loan.totalPayable,
      frequency: loan.frequency,
      startDate: loan.startDate,
      status: loan.status,
      createdByMembershipId: loan.createdByMembershipId,
      createdAt: loan.createdAt.toISOString(),
      closedAt: loan.closedAt?.toISOString() ?? null,
      balance: balance.balance,
      overdueAmount: balance.overdueAmount,
      overdueDays: balance.overdueDays,
      nextDueDate: balance.nextDueDate,
      collector,
    })),
    meta: {
      page: pageQuery.page,
      pageSize: pageQuery.pageSize,
      total: page.total,
    },
  };
}
