import { PageQuerySchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** Cuerpo de `POST /clients`. */
export const CreateClientRequestSchema = z.strictObject({
  nationalId: z.string().min(1).meta({
    description: 'Cédula de ciudadanía, con o sin separadores.',
    example: '1020304050',
  }),
  fullName: z.string().min(1).meta({
    description: 'Nombre completo.',
    example: 'Carlos Andrés Gómez',
  }),
  occupation: z.string().min(1).meta({
    description: 'Oficio del cliente.',
    example: 'Vendedor ambulante',
  }),
  phone: z.string().min(1).meta({
    description: 'Celular o fijo colombiano en formato E.164.',
    example: '+573001234567',
  }),
  address: z.string().min(1).meta({
    description: 'Dirección de residencia o de cobro.',
    example: 'Calle 45 # 12-30, Bogotá',
  }),
});

/**
 * Cuerpo de `PATCH /clients/:id`.
 *
 * @remarks
 * Un campo ausente no se toca. Al menos uno tiene que venir: un cuerpo vacío no tiene sentido.
 */
export const UpdateClientRequestSchema = z
  .strictObject({
    nationalId: z.string().min(1).optional().meta({
      description: 'Cédula nueva, con o sin separadores. Ausente si no cambia.',
      example: '1020304050',
    }),
    fullName: z.string().min(1).optional().meta({
      description: 'Nombre completo nuevo. Ausente si no cambia.',
      example: 'Carlos Andrés Gómez',
    }),
    occupation: z.string().min(1).optional().meta({
      description: 'Oficio nuevo. Ausente si no cambia.',
      example: 'Vendedor ambulante',
    }),
    phone: z.string().min(1).optional().meta({
      description:
        'Celular o fijo nuevo, en formato E.164. Ausente si no cambia.',
      example: '+573001234567',
    }),
    address: z.string().min(1).optional().meta({
      description: 'Dirección nueva. Ausente si no cambia.',
      example: 'Calle 45 # 12-30, Bogotá',
    }),
  })
  .refine(
    (body) =>
      body.nationalId !== undefined ||
      body.fullName !== undefined ||
      body.occupation !== undefined ||
      body.phone !== undefined ||
      body.address !== undefined,
    { message: 'Debes enviar al menos un campo para actualizar.' },
  );

/** Cuerpo de `QUERY /clients`: paginación y búsqueda opcional. */
export const ListClientsRequestSchema = PageQuerySchema.extend({
  search: z.string().trim().min(1).optional().meta({
    description:
      'Texto libre contra el nombre o la cédula. Ausente para listar todos.',
    example: 'Gómez',
  }),
});
