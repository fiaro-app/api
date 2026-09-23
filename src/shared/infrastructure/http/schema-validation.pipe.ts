import { ErrorCodeSchema, type ValidationIssue } from '@fiaro-app/contracts';
import {
  BadRequestException,
  StandardSchemaValidationPipe,
  type ArgumentMetadata,
} from '@nestjs/common';
import type { StandardSchemaV1 } from '@standard-schema/spec';

function toPathSegment(
  segment: PropertyKey | StandardSchemaV1.PathSegment,
): string | number {
  const key = typeof segment === 'object' ? segment.key : segment;
  return typeof key === 'symbol' ? key.toString() : key;
}

/**
 * Traduce los errores de un schema al `400 VALIDATION_FAILED` del contrato de errores.
 * Solo copia `path` y `message`: el resto de los datos de cada error no sale en la respuesta.
 */
export function toValidationException(
  issues: readonly StandardSchemaV1.Issue[],
): BadRequestException {
  return new BadRequestException({
    code: ErrorCodeSchema.enum.VALIDATION_FAILED,
    message: 'Los datos enviados no son válidos.',
    issues: issues.map((issue): ValidationIssue => ({
      path: (issue.path ?? []).map(toPathSegment),
      message: issue.message,
    })),
  });
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
