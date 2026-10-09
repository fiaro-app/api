import { z } from 'zod';

/**
 * Cuerpo de `POST /leads`.
 *
 * @remarks
 * `website` es un cebo para robots: el formulario del sitio lo deja en una caja oculta que una
 * persona nunca llena, pero un robot que rellena todos los campos sí. Con él lleno la petición
 * se descarta sin guardar nada y sin avisar, y la respuesta es la misma de siempre.
 */
export const CreateLeadRequestSchema = z.strictObject({
  name: z.string().min(1).meta({
    description: 'Nombre de quien escribe.',
    example: 'Ana Pérez',
  }),
  phone: z.string().min(1).optional().meta({
    description:
      'Celular colombiano, con o sin indicativo ni separadores. Hace falta este o el correo.',
    example: '300 123 4567',
  }),
  email: z.string().min(1).optional().meta({
    description: 'Correo. Hace falta este o el celular.',
    example: 'ana@ejemplo.co',
  }),
  message: z.string().min(1).meta({
    description: 'Lo que quiere contar o preguntar.',
    example: 'Quiero probar Fiaro con mis 3 cobradores.',
  }),
  website: z.string().optional().meta({
    description:
      'Campo señuelo contra robots: debe viajar vacío o ausente. Con algo escrito, el contacto se descarta en silencio.',
  }),
});
