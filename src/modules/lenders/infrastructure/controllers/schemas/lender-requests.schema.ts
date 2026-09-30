import { WeekdaySchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/**
 * Cuerpo de `PATCH /lender`.
 *
 * @remarks
 * Un campo ausente no se toca. Al menos uno tiene que venir: un cuerpo vacío no tiene sentido.
 */
export const UpdateLenderRequestSchema = z
  .strictObject({
    name: z.string().min(1).optional().meta({
      description: 'Nombre del negocio nuevo. Ausente si no cambia.',
      example: 'Financiera Buen Vecino',
    }),
    logoUrl: z.url().nullable().optional().meta({
      description: 'URL del logo nueva; `null` la quita. Ausente si no cambia.',
      example: 'https://cdn.fiaro.co/logos/buen-vecino.png',
    }),
    nonWorkingWeekdays: z
      .array(WeekdaySchema)
      .optional()
      .meta({
        description:
          'Días de la semana en que no se cobra. Ausente si no cambian.',
        example: ['SUNDAY'],
      }),
    skipNationalHolidays: z.boolean().optional().meta({
      description:
        'Si `true`, los festivos nacionales de Colombia tampoco cuentan como días de cobro. Ausente si no cambia.',
    }),
  })
  .refine(
    (body) =>
      body.name !== undefined ||
      body.logoUrl !== undefined ||
      body.nonWorkingWeekdays !== undefined ||
      body.skipNationalHolidays !== undefined,
    { message: 'Debes enviar al menos un campo para actualizar.' },
  );
