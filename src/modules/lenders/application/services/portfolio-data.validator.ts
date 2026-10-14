import { PortfolioSchema } from '@fiaro-app/contracts';
import { InvalidPortfolioDataError } from '@/modules/lenders/domain/errors/invalid-portfolio-data.error.js';
import {
  toIssuePath,
  zodIssueParams,
} from '@/shared/application/validation/zod-issue-params.js';

const PortfolioDataSchema = PortfolioSchema.pick({ name: true });

/** Datos de la cartera tal como los recibe el alta. */
export interface PortfolioDataInput {
  /** Nombre de la cartera, con los espacios sobrantes que traiga. */
  readonly name: string;
}

/** Datos de la cartera ya validados y normalizados. */
export interface ValidPortfolioData {
  /** Nombre de la cartera, sin espacios sobrantes. */
  readonly name: string;
}

/**
 * Valida el nombre de la cartera con el contrato compartido (`PortfolioSchema`).
 *
 * @param input - Datos de la cartera.
 * @returns El nombre normalizado, sin espacios sobrantes.
 * @throws {@link InvalidPortfolioDataError} Con un `issue` por cada campo que no cumple el
 * contrato, con los valores de la falla (`params`) para llenar los marcadores de su mensaje.
 */
export function validatePortfolioData(
  input: PortfolioDataInput,
): ValidPortfolioData {
  const result = PortfolioDataSchema.safeParse({ name: input.name });
  if (!result.success) {
    throw new InvalidPortfolioDataError(
      result.error.issues.map((issue) => ({
        path: toIssuePath(issue.path),
        message: issue.message,
        params: zodIssueParams(issue),
      })),
    );
  }
  return { name: result.data.name };
}
