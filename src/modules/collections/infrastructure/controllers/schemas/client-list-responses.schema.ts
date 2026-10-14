import { paginated } from '@fiaro-app/contracts';
import { z } from 'zod';
import type { ClientsWithBalancePage } from '@/modules/collections/application/dtos/portfolio-list.dto.js';

/** Un cliente de la lista: sus datos públicos, más lo que debe y lo que tiene vencido. */
export const ClientListItemResponseSchema = z
  .object({
    id: z.uuid().meta({ description: 'Identificador del cliente.' }),
    nationalId: z
      .string()
      .meta({ description: 'Cédula de ciudadanía, sin separadores.' }),
    fullName: z.string().meta({ description: 'Nombre completo.' }),
    occupation: z.string().meta({ description: 'Oficio del cliente.' }),
    phone: z.string().meta({
      description: 'Celular o fijo colombiano en formato E.164.',
    }),
    address: z
      .string()
      .meta({ description: 'Dirección de residencia o de cobro.' }),
    createdAt: z.iso.datetime({ offset: true }).meta({
      description: 'Cuándo se dio de alta.',
    }),
    balance: z.int().nonnegative().meta({
      description:
        'Suma del saldo de sus préstamos activos; cero si no tiene ninguno.',
    }),
    overdueAmount: z.int().nonnegative().meta({
      description:
        'Suma de lo vencido y sin pagar entre sus préstamos activos.',
    }),
    overdueDays: z.int().nonnegative().meta({
      description:
        'El mayor de los días de mora entre sus préstamos activos; cero si está al día.',
    }),
    activeLoans: z.int().nonnegative().meta({
      description: 'Cuántos préstamos activos tiene.',
    }),
  })
  .meta({ id: 'ClientListItemResponse' });

/** Respuesta de `QUERY /clients`: una página de clientes con su saldo y su mora. */
export const ClientListResponseSchema = paginated(
  ClientListItemResponseSchema,
).meta({ id: 'ClientListResponse' });

/**
 * @param page - La página, tal como la devuelve el caso de uso.
 * @param pageQuery - La página y el tamaño pedidos.
 */
export function toClientListResponse(
  page: ClientsWithBalancePage,
  pageQuery: { page: number; pageSize: number },
): z.output<typeof ClientListResponseSchema> {
  return {
    data: page.items.map(({ client, ...totals }) => ({
      id: client.id,
      nationalId: client.nationalId,
      fullName: client.fullName,
      occupation: client.occupation,
      phone: client.phone,
      address: client.address,
      createdAt: client.createdAt.toISOString(),
      balance: totals.balance,
      overdueAmount: totals.overdueAmount,
      overdueDays: totals.overdueDays,
      activeLoans: totals.activeLoans,
    })),
    meta: {
      page: pageQuery.page,
      pageSize: pageQuery.pageSize,
      total: page.total,
    },
  };
}
