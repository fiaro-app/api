import type { Logger } from '@nestjs/common';
import type {
  ImportIssue,
  ImportOutcome,
  ImportRowResult,
} from '@/modules/imports/domain/import-row.js';
import { DomainError } from '@/shared/domain/errors/domain-error.js';

/** La falla de crear una fila, dicha de forma que la web pueda mostrarla. */
export function failureIssue(
  error: unknown,
  logger: Logger,
  row: number,
): ImportIssue {
  if (error instanceof DomainError) {
    return {
      field: 'row',
      message: `errors.${error.code}`,
      params: error.params,
    };
  }
  logger.error(`No se pudo importar la fila ${String(row)}: ${String(error)}.`);
  return {
    field: 'row',
    message: 'No se pudo importar esta fila. Inténtalo de nuevo.',
  };
}

/** @param dryRun - Si fue solo la vista previa.
 * @param rows - El resultado de cada fila.
 * @returns Las filas con sus conteos. */
export function summarizeImport(
  dryRun: boolean,
  rows: readonly ImportRowResult[],
): ImportOutcome {
  const count = (predicate: (row: ImportRowResult) => boolean) =>
    rows.filter(predicate).length;
  return {
    dryRun,
    rows,
    summary: {
      rows: rows.length,
      ok: count((row) => row.status === 'READY' || row.status === 'IMPORTED'),
      invalid: count((row) => row.status === 'INVALID'),
      failed: count((row) => row.status === 'FAILED'),
      newClients: count(
        (row) => row.client === 'NEW' && row.status !== 'FAILED',
      ),
      loans: count(
        (row) =>
          row.loan && (row.status === 'READY' || row.status === 'IMPORTED'),
      ),
    },
  };
}
