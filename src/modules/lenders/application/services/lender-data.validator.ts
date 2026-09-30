import { LenderSchema } from '@fiaro-app/contracts';
import { InvalidLenderDataError } from '@/modules/lenders/domain/errors/invalid-lender-data.error.js';
import {
  toIssuePath,
  zodIssueParams,
} from '@/shared/application/validation/zod-issue-params.js';

const LenderDataSchema = LenderSchema.pick({ name: true });

/** Datos del prestamista tal como los recibe el alta. */
export interface LenderDataInput {
  /** Nombre del negocio, con los espacios sobrantes que traiga. */
  readonly name: string;
}

/** Datos del prestamista ya validados y normalizados. */
export interface ValidLenderData {
  /** Nombre del negocio, sin espacios sobrantes. */
  readonly name: string;
}

/**
 * Valida el nombre del prestamista con el contrato compartido (`LenderSchema`).
 *
 * @param input - Datos del prestamista.
 * @returns El nombre normalizado, sin espacios sobrantes.
 * @throws {@link InvalidLenderDataError} Con un `issue` por cada campo que no cumple el contrato,
 * con los valores de la falla (`params`) para llenar los marcadores de su mensaje.
 */
export function validateLenderData(input: LenderDataInput): ValidLenderData {
  const result = LenderDataSchema.safeParse({ name: input.name });
  if (!result.success) {
    throw new InvalidLenderDataError(
      result.error.issues.map((issue) => ({
        path: toIssuePath(issue.path),
        message: issue.message,
        params: zodIssueParams(issue),
      })),
    );
  }
  return { name: result.data.name };
}
