import { toBusinessDate } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';
import { ListLoansUseCase } from '@/modules/loans/application/use-cases/list-loans.use-case.js';
import type {
  ListLoansWithBalanceInput,
  LoanListItem,
  LoansWithBalancePage,
} from '@/modules/collections/application/dtos/portfolio-list.dto.js';
import { calculateLoanBalance } from '@/modules/collections/application/services/calculate-loan-balance.js';
import { groupRecordsByLoan } from '@/modules/collections/application/services/group-records-by-loan.js';
import type { CollectionAssignmentRepository } from '@/modules/collections/domain/repositories/collection-assignment.repository.js';
import type { LoanPortfolioReadRepository } from '@/modules/collections/domain/repositories/loan-portfolio-read.repository.js';
import { COLLECTION_ASSIGNMENT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-assignment-repository.token.js';
import { LOAN_PORTFOLIO_READ_REPOSITORY } from '@/modules/collections/domain/tokens/loan-portfolio-read-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/**
 * Lista, paginados, los préstamos del prestamista de la sesión, cada uno con su saldo, su mora,
 * el nombre del cliente y el cobrador que lo tiene hoy (D-113, D-117). Cualquier rol puede verla,
 * igual que `GET /loans/:id`.
 *
 * @remarks
 * Hace una consulta por cada cosa para toda la página, nunca una por préstamo: los préstamos
 * (`ListLoansUseCase`), el prestamista una vez (`GetLenderUseCase`), y de
 * `LoanPortfolioReadRepository` las visitas con sus pagos, los cobradores de hoy y los nombres de
 * clientes y cobradores. Con `collectorMembershipId` primero lee los préstamos que ese cobrador
 * tiene asignados hoy y lista solo esos (lo usa la baja de un cobrador, D-97, sin traer toda la
 * cartera). El cálculo de cada saldo es el mismo de `GET /loans/:loanId/balance`
 * ({@link calculateLoanBalance}), así que ambas cifras nunca discrepan.
 */
@Injectable()
export class ListLoansWithBalanceUseCase {
  constructor(
    private readonly listLoans: ListLoansUseCase,
    private readonly getLender: GetLenderUseCase,
    @Inject(LOAN_PORTFOLIO_READ_REPOSITORY)
    private readonly readRepository: LoanPortfolioReadRepository,
    @Inject(COLLECTION_ASSIGNMENT_REPOSITORY)
    private readonly assignments: CollectionAssignmentRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param input - El prestamista, la página y los filtros.
   * @returns La página, con el total sin paginar.
   */
  async execute(
    input: ListLoansWithBalanceInput,
  ): Promise<LoansWithBalancePage> {
    const today = toBusinessDate(this.clock.now());
    const { collectorMembershipId, ...criteria } = input;
    const ids =
      collectorMembershipId === undefined
        ? undefined
        : await this.assignedLoanIds(collectorMembershipId, today);
    if (ids?.length === 0) {
      return { items: [], total: 0 };
    }
    const page = await this.listLoans.execute({ ...criteria, ids });
    if (page.items.length === 0) {
      return { items: [], total: page.total };
    }
    return {
      items: await this.withBalances(page.items, input.lenderId, today),
      total: page.total,
    };
  }

  /** Suma saldo, mora, nombre del cliente y cobrador de hoy a cada préstamo de la página. */
  private async withBalances(
    loans: readonly LoanDetails[],
    lenderId: string,
    today: string,
  ): Promise<LoanListItem[]> {
    const loanIds = loans.map((loan) => loan.id);
    const [lender, records, collectorIdByLoan, clientNames] = await Promise.all(
      [
        this.getLender.execute(lenderId),
        this.readRepository.listVisitRecordsByLoans(loanIds),
        this.readRepository.listCollectorsByLoans(loanIds, today),
        this.readRepository.listClientNames(
          [...new Set(loans.map((loan) => loan.clientId))],
          lenderId,
        ),
      ],
    );
    const collectorNames = await this.readRepository.listMembershipNames(
      [...new Set(collectorIdByLoan.values())],
      lenderId,
    );
    const recordsByLoan = groupRecordsByLoan(records);
    return loans.map((loan) => {
      const collectorId = collectorIdByLoan.get(loan.id);
      const collectorName =
        collectorId === undefined ? undefined : collectorNames.get(collectorId);
      return {
        loan,
        clientFullName: clientNames.get(loan.clientId) ?? '',
        ...calculateLoanBalance({
          loan,
          lender,
          records: recordsByLoan.get(loan.id) ?? [],
          today,
        }),
        collector:
          collectorId === undefined || collectorName === undefined
            ? null
            : { membershipId: collectorId, fullName: collectorName },
      };
    });
  }

  /** Los préstamos que el cobrador tiene asignados hoy. */
  private async assignedLoanIds(
    collectorMembershipId: string,
    today: string,
  ): Promise<string[]> {
    const assignments = await this.assignments.findActiveByCollectorAndDate(
      collectorMembershipId,
      today,
    );
    return assignments.map((assignment) => assignment.loanId);
  }
}
