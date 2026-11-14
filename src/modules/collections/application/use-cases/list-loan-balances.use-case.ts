import { toBusinessDate } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import type { LoanBalanceDetails } from '@/modules/collections/application/dtos/loan-balance.dto.js';
import { calculateLoanBalance } from '@/modules/collections/application/services/calculate-loan-balance.js';
import { groupRecordsByLoan } from '@/modules/collections/application/services/group-records-by-loan.js';
import type { LoanPortfolioReadRepository } from '@/modules/collections/domain/repositories/loan-portfolio-read.repository.js';
import { LOAN_PORTFOLIO_READ_REPOSITORY } from '@/modules/collections/domain/tokens/loan-portfolio-read-repository.token.js';
import { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/** Préstamos por consulta: acota el `IN (...)` y la memoria de cada tanda de visitas. */
const CHUNK_SIZE = 500;

/** El saldo de un préstamo y quién lo tenía asignado el día pedido. */
export interface LoanBalanceSnapshot extends LoanBalanceDetails {
  readonly collectorMembershipId: string | null;
}

/** Entrada de {@link ListLoanBalancesUseCase}. */
export interface ListLoanBalancesInput {
  readonly lenderId: string;
  readonly loans: readonly LoanDetails[];
  /** Día del cobrador asignado (`AAAA-MM-DD`): hoy, o el cierre de un período pasado. */
  readonly day: string;
  /** Fecha pasada a la que se mira el saldo; ausente para hoy (igual que `GetLoanBalanceUseCase`). */
  readonly asOf?: string;
}

/**
 * El saldo, la mora y el cobrador de muchos préstamos a la vez, con unas pocas consultas por cada
 * tanda de 500 (las visitas con sus pagos y los cobradores del día) en lugar de varias por préstamo.
 * El cálculo es el mismo de `GET /loans/:loanId/balance` ({@link calculateLoanBalance}).
 *
 * @remarks
 * Lo usan las estadísticas y el resumen del negocio y el desempeño de un cobrador: antes pedían
 * cada saldo por separado (`GetLoanBalanceUseCase`), y con unos miles de préstamos eso eran miles
 * de consultas por pantalla (medido en D-119).
 */
@Injectable()
export class ListLoanBalancesUseCase {
  constructor(
    private readonly getLender: GetLenderUseCase,
    @Inject(LOAN_PORTFOLIO_READ_REPOSITORY)
    private readonly readRepository: LoanPortfolioReadRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param input - Los préstamos (todos del prestamista), el día y, si aplica, la fecha pasada.
   * @returns Un saldo por préstamo, por id.
   */
  async execute(
    input: ListLoanBalancesInput,
  ): Promise<ReadonlyMap<string, LoanBalanceSnapshot>> {
    const result = new Map<string, LoanBalanceSnapshot>();
    if (input.loans.length === 0) {
      return result;
    }
    const today = toBusinessDate(this.clock.now());
    const lender = await this.getLender.execute(input.lenderId);
    const chunks: LoanDetails[][] = [];
    for (let start = 0; start < input.loans.length; start += CHUNK_SIZE) {
      chunks.push(input.loans.slice(start, start + CHUNK_SIZE));
    }
    const loaded = await Promise.all(
      chunks.map(async (chunk) => {
        const ids = chunk.map((loan) => loan.id);
        const [records, collectors] = await Promise.all([
          this.readRepository.listVisitRecordsByLoans(ids),
          this.readRepository.listCollectorsByLoans(ids, input.day),
        ]);
        return {
          chunk,
          recordsByLoan: groupRecordsByLoan(records),
          collectors,
        };
      }),
    );
    for (const { chunk, recordsByLoan, collectors } of loaded) {
      for (const loan of chunk) {
        result.set(loan.id, {
          ...calculateLoanBalance({
            loan,
            lender,
            records: recordsByLoan.get(loan.id) ?? [],
            today,
            asOf: input.asOf,
          }),
          collectorMembershipId: collectors.get(loan.id) ?? null,
        });
      }
    }
    return result;
  }
}
