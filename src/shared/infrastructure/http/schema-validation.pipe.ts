import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  BadRequestException,
  StandardSchemaValidationPipe,
  type ArgumentMetadata,
} from '@nestjs/common';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { zodIssueParams } from '@/shared/application/validation/zod-issue-params.js';
import type { ApiExceptionPayload } from '@/shared/infrastructure/filters/api-exception-payload.js';

function toPathSegment(
  segment: PropertyKey | StandardSchemaV1.PathSegment,
): string | number {
  const key = typeof segment === 'object' ? segment.key : segment;
  return typeof key === 'symbol' ? key.toString() : key;
}

/**
 * Traduce los errores de un schema al `400 VALIDATION_FAILED` del contrato de errores.
 *
 * @remarks
 * No escribe ningún texto: cada error lleva su `message` (una clave del catálogo, si el schema
 * no puso el suyo) y los `params` de la falla de Zod (`minimum`, `keys`...), y el filtro global
 * los traduce al idioma de la petición. El resto de los datos de cada error no sale en la
 * respuesta.
 *
 * @param issues - Errores que devolvió el schema.
 */
export function toValidationException(
  issues: readonly StandardSchemaV1.Issue[],
): BadRequestException {
  const payload: ApiExceptionPayload = {
    code: ErrorCodeSchema.enum.VALIDATION_FAILED,
    issues: issues.map((issue) => ({
      path: (issue.path ?? []).map(toPathSegment),
      message: issue.message,
      params: zodIssueParams(issue),
    })),
  };
  return new BadRequestException(payload);
}

/**
 * Pipe global que valida cada parámetro contra el schema declarado en la ruta, por ejemplo
 * `@Body({ schema: CreateLoanSchema })`.
 *
 * @remarks
 * Falla cerrado: un `@Body()` o `@Query()` sin schema lanza un error de programación (500) en
 * lugar de dejar pasar el dato sin validar, como hace el `StandardSchemaValidationPipe` de Nest.
 */
export class SchemaValidationPipe extends StandardSchemaValidationPipe {
  constructor() {
    super({ exceptionFactory: toValidationException });
  }

  /**
   * @param value - Dato de la petición que se valida.
   * @param metadata - Dónde está el dato (body, query...) y el schema que declara la ruta.
   * @returns El dato validado, con los valores por defecto aplicados.
   * @throws {@link BadRequestException} Si el dato no cumple el schema (`VALIDATION_FAILED`).
   * @throws Un error de programación (500) si un `@Body()` o `@Query()` no declara schema.
   */
  override async transform<T>(
    value: T,
    metadata: ArgumentMetadata,
  ): Promise<T> {
    if (
      metadata.schema === undefined &&
      (metadata.type === 'body' || metadata.type === 'query')
    ) {
      const decorator = metadata.type === 'body' ? 'Body' : 'Query';
      throw new Error(
        `Una ruta usa @${decorator}() sin schema, así que ese dato no se validaría. Pásalo con @${decorator}({ schema }).`,
      );
    }
    return await super.transform(value, metadata);
  }
}
