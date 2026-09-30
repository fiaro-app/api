import { LenderSchema, type Weekday } from '@fiaro-app/contracts';
import { InvalidLenderDataError } from '@/modules/lenders/domain/errors/invalid-lender-data.error.js';
import {
  toIssuePath,
  zodIssueParams,
} from '@/shared/application/validation/zod-issue-params.js';

const LenderDataSchema = LenderSchema.pick({
  name: true,
  logoUrl: true,
  nonWorkingWeekdays: true,
  skipNationalHolidays: true,
});

/**
 * Datos del prestamista, tal como los recibe el alta (con los tres últimos fijos: sin logo, con
 * los días sin cobro por defecto) o la actualización (los que cambian, más los que ya tenía).
 */
export interface LenderDataInput {
  /** Nombre del negocio, con los espacios sobrantes que traiga. */
  readonly name: string;
  /** URL del logo, o `null` si no tiene uno. */
  readonly logoUrl: string | null;
  /** Días de la semana en que no se cobra. */
  readonly nonWorkingWeekdays: readonly Weekday[];
  /** Si los festivos nacionales de Colombia tampoco cuentan como días de cobro. */
  readonly skipNationalHolidays: boolean;
}

/** Datos del prestamista ya validados y normalizados. */
export interface ValidLenderData {
  /** Nombre del negocio, sin espacios sobrantes. */
  readonly name: string;
  /** URL del logo, o `null`. */
  readonly logoUrl: string | null;
  /** Días de la semana en que no se cobra. */
  readonly nonWorkingWeekdays: readonly Weekday[];
  /** Si los festivos nacionales de Colombia tampoco cuentan como días de cobro. */
  readonly skipNationalHolidays: boolean;
}

/**
 * Valida los datos del prestamista con el contrato compartido (`LenderSchema`). La usan tanto el
 * alta (`CreateLenderUseCase`, con los valores por defecto ya puestos) como la actualización
 * (`UpdateLenderUseCase`, con el dato completo ya combinado): así el prestamista nunca queda en
 * un estado que el contrato no aceptaría, sea cual sea el camino que lo cambió.
 *
 * @param input - Datos del prestamista, completos.
 * @returns Los datos normalizados: el nombre sin espacios sobrantes.
 * @throws {@link InvalidLenderDataError} Con un `issue` por cada campo que no cumple el contrato,
 * con los valores de la falla (`params`) para llenar los marcadores de su mensaje.
 */
export function validateLenderData(input: LenderDataInput): ValidLenderData {
  const result = LenderDataSchema.safeParse(input);
  if (!result.success) {
    throw new InvalidLenderDataError(
      result.error.issues.map((issue) => ({
        path: toIssuePath(issue.path),
        message: issue.message,
        params: zodIssueParams(issue),
      })),
    );
  }
  return result.data;
}
