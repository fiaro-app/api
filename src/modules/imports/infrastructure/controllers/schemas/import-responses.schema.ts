import { z } from 'zod';
import type { ImportOutcome } from '@/modules/imports/domain/import-row.js';

const ImportIssueSchema = z.object({
  field: z.string().meta({ example: 'phone' }),
  message: z
    .string()
    .meta({ description: 'Ya traducido al idioma de la petición.' }),
});

const ImportRowResultSchema = z.object({
  row: z.int().meta({ description: 'Número de fila, desde 1.' }),
  status: z.enum(['READY', 'INVALID', 'IMPORTED', 'FAILED']),
  client: z.enum(['NEW', 'EXISTING']).nullable(),
  loan: z.boolean(),
  issues: z.array(ImportIssueSchema),
});

/** Respuesta de `POST /imports`. */
export const ImportResponseSchema = z
  .object({
    dryRun: z.boolean(),
    summary: z.object({
      rows: z.int(),
      ok: z.int(),
      invalid: z.int(),
      failed: z.int(),
      newClients: z.int(),
      loans: z.int(),
    }),
    rows: z.array(ImportRowResultSchema),
  })
  .meta({ id: 'ImportResponse' });

/**
 * @param outcome - El resultado del caso de uso.
 * @param translate - Traduce una clave o deja el texto como está.
 */
export function toImportResponse(
  outcome: ImportOutcome,
  translate: (
    message: string,
    params?: Readonly<Record<string, string | number>>,
  ) => string,
): z.output<typeof ImportResponseSchema> {
  return {
    ...outcome,
    rows: outcome.rows.map((row) => ({
      ...row,
      issues: row.issues.map((issue) => ({
        field: issue.field,
        message: translate(issue.message, issue.params),
      })),
    })),
  };
}
