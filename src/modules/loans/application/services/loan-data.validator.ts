import { LoanSchema } from '@fiaro-app/contracts';
import type { LoanFrequency } from '@/modules/loans/domain/entities/loan-frequency.js';
import { InvalidLoanDataError } from '@/modules/loans/domain/errors/invalid-loan-data.error.js';
import {
  toIssuePath,
  zodIssueParams,
} from '@/shared/application/validation/zod-issue-params.js';

const LoanDataSchema = LoanSchema.pick({
  principalAmount: true,
  installmentCount: true,
  installmentValue: true,
  totalPayable: true,
  frequency: true,
  startDate: true,
});

/** Datos del préstamo tal como los recibe el alta. */
export interface LoanDataInput {
  /** Monto prestado, en pesos colombianos. */
  readonly principalAmount: number;
  /** Número de cuotas pactadas. */
  readonly installmentCount: number;
  /** Valor de cada cuota, en pesos colombianos. */
  readonly installmentValue: number;
  /** Lo pactado en total. */
  readonly totalPayable: number;
  /** Cada cuánto se cobra una cuota. */
  readonly frequency: LoanFrequency;
  /** Fecha de calendario en que arranca el préstamo (`AAAA-MM-DD`). */
  readonly startDate: string;
}

/** Datos del préstamo ya validados. */
export type ValidLoanData = LoanDataInput;

/**
 * Valida los datos del préstamo con el contrato compartido (`LoanSchema`).
 *
 * @remarks
 * No exige que `totalPayable` sea `installmentCount × installmentValue`: la UI lo sugiere, pero
 * se respeta lo pactado (PRODUCT.md §5).
 *
 * @param input - Datos del préstamo.
 * @returns Los datos, ya validados.
 * @throws {@link InvalidLoanDataError} Con un `issue` por cada campo que no cumple el contrato,
 * con los valores de la falla (`params`) para llenar los marcadores de su mensaje.
 */
export function validateLoanData(input: LoanDataInput): ValidLoanData {
  const result = LoanDataSchema.safeParse(input);
  if (!result.success) {
    throw new InvalidLoanDataError(
      result.error.issues.map((issue) => ({
        path: toIssuePath(issue.path),
        message: issue.message,
        params: zodIssueParams(issue),
      })),
    );
  }
  return result.data;
}
