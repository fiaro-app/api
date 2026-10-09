import { toBusinessDate } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import type { ListLoansInput } from '@/modules/loans/application/dtos/loan-details.dto.js';
import { ListLoansUseCase } from '@/modules/loans/application/use-cases/list-loans.use-case.js';
import { GetMembershipEntryUseCase } from '@/modules/memberships/application/use-cases/get-membership-entry.use-case.js';
import type {
  LoanListItem,
  LoansWithBalancePage,
} from '@/modules/collections/application/dtos/portfolio-list.dto.js';
import { calculateLoanBalance } from '@/modules/collections/application/services/calculate-loan-balance.js';
import { groupRecordsByLoan } from '@/modules/collections/application/services/group-records-by-loan.js';
import type { LoanPortfolioReadRepository } from '@/modules/collections/domain/repositories/loan-portfolio-read.repository.js';
import { LOAN_PORTFOLIO_READ_REPOSITORY } from '@/modules/collections/domain/tokens/loan-portfolio-read-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/**
 * Lista, paginados, los préstamos del prestamista de la sesión, cada uno con su saldo, su mora y
 * el cobrador que lo tiene hoy (D-113). Cualquier rol puede verla, igual que `GET /loans/:id`.
 *
 * @remarks
 * Hace una consulta por cada cosa para toda la página, no una por préstamo: los préstamos
 * (`ListLoansUseCase`), el prestamista una vez (`GetLenderUseCase`), las visitas con sus pagos de
 * todos los préstamos de la página y sus cobradores de hoy (`LoanPortfolioReadRepository`), y el
 * nombre de cada cobrador distinto (`GetMembershipEntryUseCase`: en una página suelen ser unos
 * pocos). El cálculo de cada saldo es el mismo de `GET /loans/:loanId/balance`
 * ({@link calculateLoanBalance}), así que ambas cifras nunca discrepan.
 */
@Injectable()
export class ListLoansWithBalanceUseCase {
  constructor(
    private readonly listLoans: ListLoansUseCase,
    private readonly getLender: GetLenderUseCase,
    private readonly getMembership: GetMembershipEntryUseCase,
    @Inject(LOAN_PORTFOLIO_READ_REPOSITORY)
    private readonly readRepository: LoanPortfolioReadRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** @param input - El prestamista dueño, la paginación y los filtros opcionales. */
  async execute(input: ListLoansInput): Promise<LoansWithBalancePage> {
    const page = await this.listLoans.execute(input);
    if (page.items.length === 0) {
      return { items: [], total: page.total };
    }
    const today = toBusinessDate(this.clock.now());
    const loanIds = page.items.map((loan) => loan.id);
    const [lender, records, collectorIdByLoan] = await Promise.all([
      this.getLender.execute(input.lenderId),
      this.readRepository.listVisitRecordsByLoans(loanIds),
      this.readRepository.listCollectorsByLoans(loanIds, today),
    ]);
    const collectors = await this.collectorNames(
      [...new Set(collectorIdByLoan.values())],
      input.lenderId,
    );
    const recordsByLoan = groupRecordsByLoan(records);

    const items = page.items.map((loan): LoanListItem => {
      const balance = calculateLoanBalance({
        loan,
        lender,
        records: recordsByLoan.get(loan.id) ?? [],
        today,
      });
      const collectorId = collectorIdByLoan.get(loan.id);
      const fullName =
        collectorId === undefined ? undefined : collectors.get(collectorId);
      return {
        loan,
        balance: balance.balance,
        overdueAmount: balance.overdueAmount,
        overdueDays: balance.overdueDays,
        nextDueDate: balance.nextDueDate,
        collector:
          collectorId === undefined || fullName === undefined
            ? null
            : { membershipId: collectorId, fullName },
      };
    });
    return { items, total: page.total };
  }

  /** @returns El nombre completo de cada cobrador de `membershipIds`, por id de membresía. */
  private async collectorNames(
    membershipIds: readonly string[],
    lenderId: string,
  ): Promise<ReadonlyMap<string, string>> {
    const entries = await Promise.all(
      membershipIds.map((id) => this.getMembership.execute(id, lenderId)),
    );
    return new Map(entries.map((entry) => [entry.id, entry.fullName]));
  }
}
