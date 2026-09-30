import { RoleSchema } from '@fiaro-app/contracts';
import { z } from 'zod';
import type { RegisteredOwner } from '@/modules/tenants/application/dtos/register-owner.dto.js';

/** Respuesta de `POST /register`: la persona y el negocio recién creados. */
export const RegisterOwnerResponseSchema = z
  .object({
    user: z.object({
      id: z.uuid().meta({ description: 'Identificador de la persona.' }),
      phone: z.string().meta({ description: 'Celular en formato E.164.' }),
      fullName: z.string().meta({ description: 'Nombre completo.' }),
      contactEmail: z.string().nullable().meta({
        description: 'Correo real, o null si no lo dio.',
      }),
      nationalId: z.string().nullable().meta({
        description: 'Cédula de ciudadanía.',
      }),
      createdAt: z.iso.datetime({ offset: true }).meta({
        description: 'Cuándo se dio de alta.',
      }),
    }),
    tenant: z.object({
      id: z.uuid().meta({ description: 'Identificador del Tenant.' }),
      name: z.string().meta({ description: 'Nombre del negocio.' }),
      createdAt: z.iso.datetime({ offset: true }),
    }),
    lender: z.object({
      id: z.uuid().meta({ description: 'Identificador del prestamista.' }),
      name: z.string().meta({ description: 'Nombre del negocio.' }),
      createdAt: z.iso.datetime({ offset: true }),
    }),
    membership: z.object({
      id: z.uuid().meta({ description: 'Identificador de la membresía.' }),
      roles: z.array(RoleSchema).meta({
        description: 'Siempre los tres roles: OWNER, LENDER y COLLECTOR.',
      }),
      createdAt: z.iso.datetime({ offset: true }),
    }),
  })
  .meta({ id: 'RegisterOwnerResponse' });

/** @param registered - Lo que devuelve `RegisterOwnerUseCase`. */
export function toRegisterOwnerResponse(
  registered: RegisteredOwner,
): z.output<typeof RegisterOwnerResponseSchema> {
  const { user, tenant } = registered;
  return {
    user: {
      id: user.id,
      phone: user.phone,
      fullName: user.fullName,
      contactEmail: user.contactEmail,
      nationalId: user.nationalId,
      createdAt: user.createdAt.toISOString(),
    },
    tenant: {
      id: tenant.tenant.id,
      name: tenant.tenant.name,
      createdAt: tenant.tenant.createdAt.toISOString(),
    },
    lender: {
      id: tenant.lender.id,
      name: tenant.lender.name,
      createdAt: tenant.lender.createdAt.toISOString(),
    },
    membership: {
      id: tenant.ownerMembership.id,
      roles: [...tenant.ownerMembership.roles],
      createdAt: tenant.ownerMembership.createdAt.toISOString(),
    },
  };
}
