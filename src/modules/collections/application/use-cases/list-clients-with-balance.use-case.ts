import { toBusinessDate } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import type { ListClientsInput } from '@/modules/clients/application/dtos/client-details.dto.js';
import { ListClientsUseCase } from '@/modules/clients/application/use-cases/list-clients.use-case.js';
import { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import { ListActiveLoansByClientsUseCase } from '@/modules/loans/application/use-cases/list-active-loans-by-clients.use-case.js';
import type {
  ClientListItem,
  ClientsWithBalancePage,
} from '@/modules/collections/application/dtos/portfolio-list.dto.js';
import { calculateLoanBalance } from '@/modules/collections/application/services/calculate-loan-balance.js';
import { groupRecordsByLoan } from '@/modules/collections/application/services/group-records-by-loan.js';
import type { LoanPortfolioReadRepository } from '@/modules/collections/domain/repositories/loan-portfolio-read.repository.js';
import { LOAN_PORTFOLIO_READ_REPOSITORY } from '@/modules/collections/domain/tokens/loan-portfolio-read-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/** Lo que se acumula de los préstamos activos de un cliente. */
interface ClientTotals {
  balance: number;
  overdueAmount: number;
  overdueDays: number;
  activeLoans: number;
}

/**
 * Lista, paginados, los clientes del prestamista de la sesión, cada uno con lo que debe y lo que
 * tiene vencido entre sus préstamos activos (D-113). Cualquier rol puede verla.
 *
 * @remarks
 * Una consulta por cada cosa para toda la página: los clientes (`ListClientsUseCase`), los
 * préstamos `ACTIVE` de todos ellos (`ListActiveLoansByClientsUseCase`), el prestamista una vez, y
 * las visitas con sus pagos de esos préstamos (`LoanPortfolioReadRepository`). Cada saldo sale del
 * mismo cálculo que `GET /loans/:loanId/balance` ({@link calculateLoanBalance}). Los préstamos ya
 * cerrados no suman: un cliente sin préstamos activos tiene saldo y mora en cero.
 */
@Injectable()
export class ListClientsWithBalanceUseCase {
  constructor(
    private readonly listClients: ListClientsUseCase,
    private readonly listActiveLoansByClients: ListActiveLoansByClientsUseCase,
    private readonly getLender: GetLenderUseCase,
    @Inject(LOAN_PORTFOLIO_READ_REPOSITORY)
    private readonly readRepository: LoanPortfolioReadRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** @param input - El prestamista dueño, la paginación y la búsqueda opcional. */
  async execute(input: ListClientsInput): Promise<ClientsWithBalancePage> {
    const page = await this.listClients.execute(input);
    if (page.items.length === 0) {
      return { items: [], total: page.total };
    }
    const loans = await this.listActiveLoansByClients.execute(
      input.lenderId,
      page.items.map((client) => client.id),
    );
    const [lender, records] = await Promise.all([
      this.getLender.execute(input.lenderId),
      this.readRepository.listVisitRecordsByLoans(loans.map((l) => l.id)),
    ]);
    const today = toBusinessDate(this.clock.now());
    const recordsByLoan = groupRecordsByLoan(records);

    const totalsByClient = new Map<string, ClientTotals>();
    for (const loan of loans) {
      const balance = calculateLoanBalance({
        loan,
        lender,
        records: recordsByLoan.get(loan.id) ?? [],
        today,
      });
      const totals = totalsByClient.get(loan.clientId) ?? emptyTotals();
      totals.balance += balance.balance;
      totals.overdueAmount += balance.overdueAmount;
      totals.overdueDays = Math.max(totals.overdueDays, balance.overdueDays);
      totals.activeLoans += 1;
      totalsByClient.set(loan.clientId, totals);
    }

    const items = page.items.map((client): ClientListItem => ({
      client,
      ...(totalsByClient.get(client.id) ?? emptyTotals()),
    }));
    return { items, total: page.total };
  }
}

function emptyTotals(): ClientTotals {
  return { balance: 0, overdueAmount: 0, overdueDays: 0, activeLoans: 0 };
}
