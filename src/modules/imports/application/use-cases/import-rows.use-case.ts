import { normalizeNationalId } from '@fiaro-app/contracts';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { CreateClientUseCase } from '@/modules/clients/application/use-cases/create-client.use-case.js';
import { CreateCollectionAssignmentUseCase } from '@/modules/collections/application/use-cases/create-collection-assignment.use-case.js';
import type { ImportLookups } from '@/modules/imports/application/ports/import-lookups.port.js';
import { IMPORT_LOOKUPS } from '@/modules/imports/application/ports/import-lookups.token.js';
import {
  validateImportRow,
  type ValidImportRow,
} from '@/modules/imports/application/services/validate-import-row.js';
import type {
  ImportIssue,
  ImportOutcome,
  ImportRowInput,
  ImportRowResult,
} from '@/modules/imports/domain/import-row.js';
import { CreateLoanUseCase } from '@/modules/loans/application/use-cases/create-loan.use-case.js';
import type { AuditLog } from '@/shared/application/audit/audit-log.port.js';
import { AUDIT_LOG } from '@/shared/application/audit/audit-log.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import {
  failureIssue,
  summarizeImport,
} from '@/modules/imports/application/services/import-outcome.js';

/** Quién importa y qué. */
export interface ImportRowsInput {
  /** El prestamista de la sesión. */
  readonly lenderId: string;
  /** La membresía de quien importa: queda como quien creó los préstamos. */
  readonly membershipId: string;
  readonly rows: readonly ImportRowInput[];
  /** `true`: solo revisa y cuenta (vista previa); `false`: crea. */
  readonly dryRun: boolean;
}

/** Una fila revisada y, en la confirmación, lo que se hizo con ella. */
interface Reviewed {
  readonly valid: ValidImportRow | null;
  readonly issues: readonly ImportIssue[];
  /** El cliente ya existe (en el negocio o por una fila anterior de la hoja). */
  existing: boolean;
}

/**
 * Importa clientes y préstamos en curso desde las filas de una hoja (D-152): primero se revisa todo
 * (`dryRun`) y recién después se confirma. Cada fila trae un cliente y, si lo tiene, su préstamo con lo
 * que falta: las cuotas que quedan, el valor de cada una y la fecha de la próxima. Un cliente que ya
 * existe (o que ya creó una fila anterior de la hoja) se reutiliza, así una hoja con un préstamo por
 * fila puede repetir al mismo cliente.
 *
 * @remarks
 * Las filas se crean una a una, sin una transacción que las abarque: una que falla no deshace las
 * demás y se reporta aparte. Pasa por los mismos casos de uso que el alta a mano (`CreateClient`,
 * `CreateLoan` con su tope del plan y `CreateCollectionAssignment`), así no hay otra regla que
 * mantener. La asignación no avisa al cobrador: sería un aviso por préstamo importado.
 */
@Injectable()
export class ImportRowsUseCase {
  private readonly logger = new Logger(ImportRowsUseCase.name);

  constructor(
    @Inject(IMPORT_LOOKUPS) private readonly lookups: ImportLookups,
    private readonly createClient: CreateClientUseCase,
    private readonly createLoan: CreateLoanUseCase,
    private readonly createAssignment: CreateCollectionAssignmentUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(AUDIT_LOG) private readonly audit: AuditLog,
  ) {}

  /** @param input - Quién importa, las filas y si es solo la vista previa. */
  async execute(input: ImportRowsInput): Promise<ImportOutcome> {
    const reviewed = await this.review(input);
    const results = input.dryRun
      ? reviewed.map((entry, index) => this.preview(entry, index + 1))
      : await this.commit(input, reviewed);
    const outcome = summarizeImport(input.dryRun, results);
    if (!input.dryRun) {
      this.audit.record({
        action: 'imports.batch.completed',
        outcome:
          outcome.summary.failed + outcome.summary.invalid === 0
            ? 'SUCCESS'
            : 'FAILURE',
        occurredAt: this.clock.now(),
        details: {
          lenderId: input.lenderId,
          rows: outcome.summary.rows,
          imported: outcome.summary.ok,
          invalid: outcome.summary.invalid,
          failed: outcome.summary.failed,
          newClients: outcome.summary.newClients,
          loans: outcome.summary.loans,
        },
      });
    }
    return outcome;
  }

  /** Revisa todas las filas contra el negocio y entre sí. */
  private async review(input: ImportRowsInput): Promise<Reviewed[]> {
    const nationalIds = input.rows.map((row) =>
      normalizeNationalId(row.nationalId),
    );
    const [existing, collectors] = await Promise.all([
      this.lookups.existingClients(input.lenderId, nationalIds),
      this.lookups.activeCollectors(input.lenderId),
    ]);
    const seen = new Set<string>();
    return input.rows.map((row) => {
      const checked = validateImportRow(row, collectors);
      const nationalId = normalizeNationalId(row.nationalId);
      const repeated = seen.has(nationalId);
      if (checked.valid !== null) {
        seen.add(nationalId);
      }
      return {
        valid: checked.valid,
        issues: checked.issues,
        existing: existing.has(nationalId) || repeated,
      };
    });
  }

  private preview(entry: Reviewed, row: number): ImportRowResult {
    return entry.valid === null
      ? {
          row,
          status: 'INVALID',
          client: null,
          loan: false,
          issues: entry.issues,
        }
      : {
          row,
          status: 'READY',
          client: entry.existing ? 'EXISTING' : 'NEW',
          loan: entry.valid.loan !== null,
          issues: [],
        };
  }

  /** Crea, en orden, las filas válidas. */
  private async commit(
    input: ImportRowsInput,
    reviewed: readonly Reviewed[],
  ): Promise<ImportRowResult[]> {
    const clientIds = new Map<string, string>();
    return reviewed.reduce<Promise<ImportRowResult[]>>(
      (previous, entry, index) =>
        previous.then(async (results) => {
          const row = index + 1;
          results.push(
            entry.valid === null
              ? this.preview(entry, row)
              : await this.create(input, entry.valid, row, clientIds),
          );
          return results;
        }),
      Promise.resolve([]),
    );
  }

  private async create(
    input: ImportRowsInput,
    valid: ValidImportRow,
    row: number,
    clientIds: Map<string, string>,
  ): Promise<ImportRowResult> {
    let created = false;
    try {
      let clientId = clientIds.get(valid.client.nationalId);
      if (clientId === undefined) {
        const existing = await this.lookups.existingClients(input.lenderId, [
          valid.client.nationalId,
        ]);
        clientId = existing.get(valid.client.nationalId);
        if (clientId === undefined) {
          clientId = (
            await this.createClient.execute({
              lenderId: input.lenderId,
              ...valid.client,
            })
          ).id;
          created = true;
        }
        clientIds.set(valid.client.nationalId, clientId);
      }
      if (valid.loan !== null) {
        await this.createLoanFor(input, clientId, valid.loan);
      }
      return {
        row,
        status: 'IMPORTED',
        client: created ? 'NEW' : 'EXISTING',
        loan: valid.loan !== null,
        issues: [],
      };
    } catch (error) {
      return {
        row,
        status: 'FAILED',
        client: created ? 'NEW' : null,
        loan: false,
        issues: [failureIssue(error, this.logger, row)],
      };
    }
  }

  private async createLoanFor(
    input: ImportRowsInput,
    clientId: string,
    loan: NonNullable<ValidImportRow['loan']>,
  ): Promise<void> {
    const created = await this.createLoan.execute({
      lenderId: input.lenderId,
      membershipId: input.membershipId,
      clientId,
      ...loan.data,
    });
    if (loan.collectorMembershipId !== null) {
      await this.createAssignment.execute({
        lenderId: input.lenderId,
        loanId: created.id,
        collectorMembershipId: loan.collectorMembershipId,
        effectiveFrom: loan.data.startDate,
        notify: false,
      });
    }
  }
}
