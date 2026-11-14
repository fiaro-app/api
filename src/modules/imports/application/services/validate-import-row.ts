import { normalizeNationalId, toColombianE164 } from '@fiaro-app/contracts';
import {
  validateClientData,
  type ValidClientData,
} from '@/modules/clients/application/services/client-data.validator.js';
import {
  validateLoanData,
  type ValidLoanData,
} from '@/modules/loans/application/services/loan-data.validator.js';
import type {
  ImportIssue,
  ImportRowInput,
} from '@/modules/imports/domain/import-row.js';
import { startDateForNextInstallment } from '@/modules/imports/domain/next-installment.js';
import { DomainError } from '@/shared/domain/errors/domain-error.js';

/** Una fila que pasó la validación, lista para crearse. */
export interface ValidImportRow {
  readonly client: ValidClientData;
  readonly loan: {
    readonly data: ValidLoanData;
    readonly collectorMembershipId: string | null;
  } | null;
}

/** El resultado de revisar una fila: sus datos si son válidos, o sus problemas. */
export type RowValidation =
  | { readonly valid: ValidImportRow; readonly issues: readonly [] }
  | { readonly valid: null; readonly issues: readonly ImportIssue[] };

/** Cómo se llama en la hoja cada campo del préstamo que reporta el contrato. */
const LOAN_FIELD_TO_ROW: Readonly<Record<string, string>> = {
  installmentCount: 'remainingInstallments',
  principalAmount: 'pendingCapital',
  startDate: 'nextInstallmentDate',
  totalPayable: 'installmentValue',
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** @param value - Un texto que debería ser una fecha `AAAA-MM-DD` real. */
function isCalendarDate(value: string): boolean {
  return (
    ISO_DATE.test(value) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}

/**
 * Convierte la falla de un validador en problemas de la fila.
 *
 * @param error - Lo que lanzó el validador.
 * @param rename - Cómo se llama en la hoja cada campo.
 */
function issuesOf(
  error: unknown,
  rename: Readonly<Record<string, string>> = {},
): ImportIssue[] {
  if (error instanceof DomainError && error.issues !== undefined) {
    return error.issues.map((issue) => {
      const field = String(issue.path[0] ?? 'row');
      return {
        field: rename[field] ?? field,
        message: issue.message,
        params: issue.params,
      };
    });
  }
  throw error;
}

/** El préstamo de la fila ya validado, o sus problemas. */
function validateLoan(
  row: NonNullable<ImportRowInput['loan']>,
  collectors: ReadonlyMap<string, string>,
): { data: ValidImportRow['loan']; issues: ImportIssue[] } {
  const issues: ImportIssue[] = [];
  let collectorMembershipId: string | null = null;
  if (row.collectorPhone) {
    const phone = toColombianE164(row.collectorPhone);
    collectorMembershipId =
      phone === null ? null : (collectors.get(phone) ?? null);
    if (collectorMembershipId === null) {
      issues.push({
        field: 'collectorPhone',
        message: 'No hay un cobrador activo con ese celular.',
      });
    }
  }
  if (!isCalendarDate(row.nextInstallmentDate)) {
    issues.push({
      field: 'nextInstallmentDate',
      message: 'La fecha de la próxima cuota debe ser AAAA-MM-DD.',
    });
    return { data: null, issues };
  }
  const totalPayable = row.remainingInstallments * row.installmentValue;
  try {
    const data = validateLoanData({
      principalAmount: row.pendingCapital ?? totalPayable,
      installmentCount: row.remainingInstallments,
      installmentValue: row.installmentValue,
      totalPayable,
      frequency: row.frequency,
      startDate: startDateForNextInstallment(
        row.nextInstallmentDate,
        row.frequency,
      ),
    });
    return { data: { data, collectorMembershipId }, issues };
  } catch (error) {
    return {
      data: null,
      issues: [...issues, ...issuesOf(error, LOAN_FIELD_TO_ROW)],
    };
  }
}

/**
 * Revisa una fila de la hoja: los datos del cliente con el mismo validador del alta, el celular
 * normalizado a E.164, y el préstamo en curso (que se crea con lo que falta, D-152) con el validador
 * del alta de préstamos.
 *
 * @param row - La fila, tal como llegó.
 * @param collectors - Los cobradores activos del negocio, por celular.
 */
export function validateImportRow(
  row: ImportRowInput,
  collectors: ReadonlyMap<string, string>,
): RowValidation {
  const issues: ImportIssue[] = [];
  let client: ValidClientData | null = null;
  try {
    client = validateClientData({
      nationalId: normalizeNationalId(row.nationalId),
      fullName: row.fullName,
      occupation: row.occupation,
      phone: toColombianE164(row.phone) ?? row.phone,
      address: row.address,
    });
  } catch (error) {
    issues.push(...issuesOf(error));
  }
  let loan: ValidImportRow['loan'] = null;
  if (row.loan) {
    const result = validateLoan(row.loan, collectors);
    loan = result.data;
    issues.push(...result.issues);
  }
  if (issues.length > 0 || client === null) {
    return { valid: null, issues };
  }
  return { valid: { client, loan }, issues: [] };
}
