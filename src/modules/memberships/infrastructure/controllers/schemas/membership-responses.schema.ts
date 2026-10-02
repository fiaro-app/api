import { paginated, RoleSchema } from '@fiaro-app/contracts';
import { z } from 'zod';
import type { InvitedMembership } from '@/modules/memberships/application/dtos/invite-membership.dto.js';
import type {
  MembershipListEntry,
  MembershipsPageResult,
} from '@/modules/memberships/application/dtos/membership-list-entry.dto.js';
import type { MembershipDetails } from '@/modules/memberships/application/dtos/membership-details.dto.js';

/** Respuesta con los datos públicos de una membresía. */
export const MembershipResponseSchema = z
  .object({
    id: z.uuid().meta({ description: 'Identificador de la membresía.' }),
    userId: z.uuid().meta({ description: 'La persona.' }),
    lenderId: z
      .uuid()
      .meta({ description: 'El prestamista con el que trabaja.' }),
    roles: z.array(RoleSchema).meta({ description: 'Sus roles.' }),
    status: z.enum(['ACTIVE', 'INACTIVE']).meta({
      description:
        '`INACTIVE` quita el acceso de inmediato, sin borrar el historial.',
    }),
    portfolioId: z.uuid().nullable().meta({
      description: 'Cartera del cobrador, o `null` si no tiene el rol.',
    }),
    createdAt: z.iso.datetime({ offset: true }).meta({
      description: 'Cuándo se creó.',
    }),
    deactivatedAt: z.iso.datetime({ offset: true }).nullable().meta({
      description: 'Cuándo se desactivó, o `null` si sigue activa.',
    }),
  })
  .meta({ id: 'MembershipResponse' });

/** Respuesta de `QUERY /memberships`: una membresía con el nombre y el celular de la persona. */
export const MembershipListEntryResponseSchema =
  MembershipResponseSchema.extend({
    fullName: z
      .string()
      .meta({ description: 'Nombre completo de la persona.' }),
    phone: z.string().meta({ description: 'Su celular, en formato E.164.' }),
  }).meta({ id: 'MembershipListEntryResponse' });

/** Respuesta de `QUERY /memberships`: una página de colaboradores. */
export const MembershipsPageResponseSchema = paginated(
  MembershipListEntryResponseSchema,
).meta({ id: 'MembershipsPageResponse' });

/** Respuesta de `POST /memberships/:id/reset-password`. */
export const ResetMembershipPasswordResponseSchema = z
  .object({
    tempPassword: z.string().meta({
      description:
        'Contraseña temporal en claro, para pasarla por WhatsApp. Se muestra una sola vez.',
    }),
  })
  .meta({ id: 'ResetMembershipPasswordResponse' });

/** Respuesta de `POST /memberships`: la membresía creada y, si la persona es nueva, su contraseña temporal. */
export const InvitedMembershipResponseSchema = z
  .object({
    membership: MembershipResponseSchema,
    tempPassword: z.string().nullable().meta({
      description:
        'Contraseña temporal en claro, para pasarla por WhatsApp. Se muestra una sola vez: `null` si el celular ya tenía cuenta.',
    }),
  })
  .meta({ id: 'InvitedMembershipResponse' });

/** @param details - Los datos de la membresía, tal como los devuelve el caso de uso. */
export function toMembershipResponse(
  details: MembershipDetails,
): z.output<typeof MembershipResponseSchema> {
  return {
    id: details.id,
    userId: details.userId,
    lenderId: details.lenderId,
    roles: [...details.roles],
    status: details.status,
    portfolioId: details.portfolioId,
    createdAt: details.createdAt.toISOString(),
    deactivatedAt: details.deactivatedAt?.toISOString() ?? null,
  };
}

/** @param invited - Lo que devuelve `InviteMembershipUseCase.execute`. */
export function toInvitedMembershipResponse(
  invited: InvitedMembership,
): z.output<typeof InvitedMembershipResponseSchema> {
  return {
    membership: toMembershipResponse(invited.membership),
    tempPassword: invited.tempPassword,
  };
}

/** @param entry - Una membresía con su persona, tal como la devuelve `ListMembershipsUseCase`. */
export function toMembershipListEntryResponse(
  entry: MembershipListEntry,
): z.output<typeof MembershipListEntryResponseSchema> {
  return {
    ...toMembershipResponse(entry),
    fullName: entry.fullName,
    phone: entry.phone,
  };
}

/**
 * @param page - La página de colaboradores, tal como la devuelve el caso de uso.
 * @param pageQuery - La página y el tamaño pedidos.
 */
export function toMembershipsPageResponse(
  page: MembershipsPageResult,
  pageQuery: { page: number; pageSize: number },
): z.output<typeof MembershipsPageResponseSchema> {
  return {
    data: page.items.map(toMembershipListEntryResponse),
    meta: {
      page: pageQuery.page,
      pageSize: pageQuery.pageSize,
      total: page.total,
    },
  };
}
