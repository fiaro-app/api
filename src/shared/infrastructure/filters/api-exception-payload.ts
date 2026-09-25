import { z } from 'zod';

const ParamsSchema = z.record(z.string(), z.union([z.string(), z.number()]));

/**
 * Un campo inválido tal como lo lanza el código. `message` es una clave del catálogo
 * (`validation.too_small.string`) o un texto ya escrito por el schema; `params` llena los
 * marcadores de la clave.
 */
export const IssuePayloadSchema = z.object({
  path: z.array(z.union([z.string(), z.number()])),
  message: z.string(),
  params: ParamsSchema.optional(),
});

/**
 * Lo que una excepción HTTP lleva en su respuesta sin escribir ningún texto: el filtro global lo
 * convierte en el error de la API, con el mensaje en el idioma de la petición.
 *
 * @example
 * ```ts
 * throw new UnauthorizedException({ code: 'UNAUTHENTICATED' });
 * ```
 */
export const ApiExceptionPayloadSchema = z.object({
  /** Código estable del error: la clave del texto es `errors.<code>`. */
  code: z.string().optional(),
  /** Valores para los marcadores del texto del error (`{minimum}`). */
  params: ParamsSchema.optional(),
  /** El detalle por campo de un `VALIDATION_FAILED`. */
  issues: z.array(IssuePayloadSchema).optional(),
});

/** Ver {@link ApiExceptionPayloadSchema}. */
export type ApiExceptionPayload = z.infer<typeof ApiExceptionPayloadSchema>;

/** Ver {@link IssuePayloadSchema}. */
export type IssuePayload = z.infer<typeof IssuePayloadSchema>;
