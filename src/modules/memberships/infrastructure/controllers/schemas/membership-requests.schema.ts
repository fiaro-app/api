import { MobilePhoneSchema, RoleSchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/**
 * Cuerpo de `POST /memberships`.
 *
 * @remarks
 * Solo el celular se valida estricto aquí (como en `RegisterOwnerRequestSchema`, D-78); el
 * resto lo valida `InviteMembershipUseCase`, porque lo que exige cada campo depende de datos que
 * la ruta todavía no conoce (si el celular ya tiene cuenta, si los roles incluyen `COLLECTOR`).
 */
export const InviteMembershipRequestSchema = z.strictObject({
  phone: MobilePhoneSchema.meta({
    description: 'Celular de la persona a invitar, en formato E.164.',
    example: '+573109998877',
  }),
  fullName: z.string().min(1).meta({
    description:
      'Nombre completo. Se ignora si el celular ya tiene cuenta: se usa el que ya tenía.',
    example: 'Luis Gómez',
  }),
  nationalId: z.string().min(1).optional().meta({
    description:
      'Cédula. Obligatoria si roles incluye COLLECTOR y el celular no tiene cuenta todavía.',
    example: '1030405060',
  }),
  contactEmail: z.email().optional().meta({
    description:
      'Correo real de la persona, opcional. Se ignora si el celular ya tiene cuenta.',
  }),
  roles: z
    .array(RoleSchema)
    .min(1)
    .meta({
      description: 'Sin repetidos y con al menos un rol.',
      example: ['COLLECTOR'],
    }),
  portfolioId: z.uuid().optional().meta({
    description:
      'Cartera del cobrador. Obligatoria si roles incluye COLLECTOR.',
  }),
});

/** Cuerpo de `PATCH /memberships/:id/roles`. */
export const ChangeMembershipRolesRequestSchema = z.strictObject({
  roles: z
    .array(RoleSchema)
    .min(1)
    .meta({
      description: 'Sin repetidos y con al menos un rol.',
      example: ['LENDER'],
    }),
  portfolioId: z.uuid().optional().meta({
    description:
      'Cartera del cobrador. Si no llega y los roles incluyen COLLECTOR, se conserva la que ya tenía.',
  }),
});
