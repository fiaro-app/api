import { z } from 'zod';
import type { PortfolioDetails } from '@/modules/lenders/application/dtos/portfolio-details.dto.js';

/** Respuesta con los datos públicos de una cartera. */
export const PortfolioResponseSchema = z
  .object({
    id: z.uuid().meta({ description: 'Identificador de la cartera.' }),
    name: z.string().meta({ description: 'Nombre de la cartera.' }),
    isDefault: z.boolean().meta({
      description: 'La cartera por defecto no se puede eliminar.',
    }),
    createdAt: z.iso.datetime({ offset: true }).meta({
      description: 'Cuándo se dio de alta.',
    }),
  })
  .meta({ id: 'PortfolioResponse' });

/**
 * Respuesta de `GET /portfolios`: todas las carteras del prestamista, sin paginar (son pocas,
 * ver `ListPortfoliosUseCase`).
 */
export const PortfoliosResponseSchema = z
  .array(PortfolioResponseSchema)
  .meta({ id: 'PortfoliosResponse' });

/** @param details - Los datos de la cartera, tal como los devuelve el caso de uso. */
export function toPortfolioResponse(
  details: PortfolioDetails,
): z.output<typeof PortfolioResponseSchema> {
  return {
    id: details.id,
    name: details.name,
    isDefault: details.isDefault,
    createdAt: details.createdAt.toISOString(),
  };
}

/** @param list - Las carteras, tal como las devuelve el caso de uso. */
export function toPortfoliosResponse(
  list: readonly PortfolioDetails[],
): z.output<typeof PortfoliosResponseSchema> {
  return list.map(toPortfolioResponse);
}
