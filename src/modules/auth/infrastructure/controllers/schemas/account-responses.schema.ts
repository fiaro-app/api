import { z } from 'zod';

/** Respuesta de `PATCH /account/profile`: el perfil después de actualizarlo. */
export const UpdateProfileResponseSchema = z
  .object({
    fullName: z.string().meta({ description: 'Nombre completo.' }),
    contactEmail: z.email().nullable().meta({
      description: 'Correo real de la persona, o `null` si no tiene.',
    }),
    contactEmailVerified: z.boolean().meta({
      description:
        'Si `contactEmail` sigue verificado: `false` si cambió o se quitó.',
    }),
  })
  .meta({ id: 'UpdateProfileResponse' });
