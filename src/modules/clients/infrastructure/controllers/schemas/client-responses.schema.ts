import { paginated } from '@fiaro-app/contracts';
import { z } from 'zod';
import type {
  ClientDetails,
  ClientsPageResult,
} from '@/modules/clients/application/dtos/client-details.dto.js';

/** Respuesta con los datos públicos de un cliente. */
export const ClientResponseSchema = z
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
  })
  .meta({ id: 'ClientResponse' });

/** Respuesta de `QUERY /clients`: una página de clientes. */
export const ClientsPageResponseSchema = paginated(ClientResponseSchema).meta({
  id: 'ClientsPageResponse',
});

/** @param details - Los datos del cliente, tal como los devuelve el caso de uso. */
export function toClientResponse(
  details: ClientDetails,
): z.output<typeof ClientResponseSchema> {
  return {
    id: details.id,
    nationalId: details.nationalId,
    fullName: details.fullName,
    occupation: details.occupation,
    phone: details.phone,
    address: details.address,
    createdAt: details.createdAt.toISOString(),
  };
}

/**
 * @param page - La página de clientes, tal como la devuelve el caso de uso.
 * @param pageQuery - La página y el tamaño pedidos.
 */
export function toClientsPageResponse(
  page: ClientsPageResult,
  pageQuery: { page: number; pageSize: number },
): z.output<typeof ClientsPageResponseSchema> {
  return {
    data: page.items.map(toClientResponse),
    meta: {
      page: pageQuery.page,
      pageSize: pageQuery.pageSize,
      total: page.total,
    },
  };
}
