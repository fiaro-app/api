import { WeekdaySchema } from '@fiaro-app/contracts';
import { z } from 'zod';
import type { LenderDetails } from '@/modules/lenders/application/dtos/lender-details.dto.js';

/** Respuesta de `GET /lender` y `PATCH /lender`: los datos públicos del prestamista. */
export const LenderResponseSchema = z
  .object({
    id: z.uuid().meta({ description: 'Identificador del prestamista.' }),
    tenantId: z
      .uuid()
      .meta({ description: 'El Tenant dueño de este prestamista.' }),
    name: z.string().meta({ description: 'Nombre del negocio.' }),
    logoUrl: z.url().nullable().meta({
      description: 'URL del logo, o `null` si no tiene uno.',
    }),
    brandColor: z.string().nullable().meta({
      description:
        'Color de marca del negocio, `#RRGGBB` en mayúsculas, con el que la web tematiza la interfaz; `null` para el de Fiaro.',
      example: '#FF8800',
    }),
    nonWorkingWeekdays: z.array(WeekdaySchema).meta({
      description: 'Días de la semana en que no se cobra.',
    }),
    skipNationalHolidays: z.boolean().meta({
      description:
        'Si los festivos nacionales de Colombia tampoco cuentan como días de cobro.',
    }),
    createdAt: z.iso.datetime({ offset: true }).meta({
      description: 'Cuándo se dio de alta.',
    }),
  })
  .meta({ id: 'LenderResponse' });

/** @param details - Los datos del prestamista, tal como los devuelve el caso de uso. */
export function toLenderResponse(
  details: LenderDetails,
): z.output<typeof LenderResponseSchema> {
  return {
    id: details.id,
    tenantId: details.tenantId,
    name: details.name,
    logoUrl: details.logoUrl,
    brandColor: details.brandColor,
    nonWorkingWeekdays: [...details.nonWorkingWeekdays],
    skipNationalHolidays: details.skipNationalHolidays,
    createdAt: details.createdAt.toISOString(),
  };
}
