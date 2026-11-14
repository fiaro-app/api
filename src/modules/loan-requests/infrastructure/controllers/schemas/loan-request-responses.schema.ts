import { LoanFrequencySchema, paginated } from '@fiaro-app/contracts';
import { z } from 'zod';
import type {
  LoanRequestDetails,
  LoanRequestsPageResult,
} from '@/modules/loan-requests/application/dtos/loan-request-details.dto.js';
import { LOAN_REQUEST_STATUSES } from '@/modules/loan-requests/domain/entities/loan-request-status.js';

/** Respuesta con los datos públicos de una solicitud de préstamo. */
export const LoanRequestResponseSchema = z
  .object({
    id: z.uuid().meta({ description: 'Identificador de la solicitud.' }),
    status: z.enum(LOAN_REQUEST_STATUSES).meta({
      description:
        'PENDING espera al administrador; APPROVED y REJECTED son finales.',
    }),
    requestedByMembershipId: z.uuid().meta({
      description: 'La membresía del cobrador que la hizo.',
    }),
    clientId: z.uuid().nullable().meta({
      description: 'El cliente existente, o null si propone uno nuevo.',
    }),
    nationalId: z.string().meta({ description: 'Cédula del cliente.' }),
    newClient: z
      .object({
        fullName: z.string(),
        occupation: z.string(),
        phone: z.string(),
        address: z.string(),
      })
      .nullable()
      .meta({ description: 'Datos del cliente nuevo, o null si ya existía.' }),
    principalAmount: z.int().meta({ description: 'Monto prestado, en pesos.' }),
    installmentCount: z.int().meta({ description: 'Número de cuotas.' }),
    installmentValue: z.int().meta({ description: 'Valor de cada cuota.' }),
    totalPayable: z.int().meta({ description: 'Lo pactado en total.' }),
    frequency: LoanFrequencySchema.meta({
      description: 'Cada cuánto se cobra una cuota.',
    }),
    startDate: z.iso.date().meta({ description: 'Fecha en que arranca.' }),
    resolvedAt: z.iso.datetime({ offset: true }).nullable().meta({
      description: 'Cuándo se resolvió, o null si está pendiente.',
    }),
    rejectionReason: z.string().nullable().meta({
      description: 'Motivo del rechazo, si el administrador lo escribió.',
    }),
    loanId: z.uuid().nullable().meta({
      description: 'El préstamo creado al aceptarla, o null.',
    }),
    createdAt: z.iso.datetime({ offset: true }).meta({
      description: 'Cuándo la hizo el cobrador.',
    }),
  })
  .meta({ id: 'LoanRequestResponse' });

/** Respuesta de `QUERY /loan-requests`: una página de solicitudes. */
export const LoanRequestsPageResponseSchema = paginated(
  LoanRequestResponseSchema,
).meta({ id: 'LoanRequestsPageResponse' });

/** Respuesta de `POST /loan-requests/client-lookup`. */
export const ClientLookupResponseSchema = z
  .object({
    exists: z.boolean().meta({
      description:
        'true si la cédula ya es de un cliente del negocio. No devuelve ningún dato del cliente.',
    }),
  })
  .meta({ id: 'ClientLookupResponse' });

/** @param details - La solicitud, tal como la devuelve el caso de uso. */
export function toLoanRequestResponse(
  details: LoanRequestDetails,
): z.output<typeof LoanRequestResponseSchema> {
  return {
    ...details,
    resolvedAt: details.resolvedAt?.toISOString() ?? null,
    createdAt: details.createdAt.toISOString(),
  };
}

/**
 * @param page - La página de solicitudes.
 * @param pageQuery - La página y el tamaño pedidos.
 */
export function toLoanRequestsPageResponse(
  page: LoanRequestsPageResult,
  pageQuery: { page: number; pageSize: number },
): z.output<typeof LoanRequestsPageResponseSchema> {
  return {
    data: page.items.map(toLoanRequestResponse),
    meta: {
      page: pageQuery.page,
      pageSize: pageQuery.pageSize,
      total: page.total,
    },
  };
}
