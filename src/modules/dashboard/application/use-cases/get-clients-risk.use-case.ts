import { toBusinessDate } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import type {
  ClientRiskEntry,
  GetClientsRiskInput,
} from '@/modules/dashboard/application/dtos/clients-risk.dto.js';
import { fetchAllPages } from '@/modules/dashboard/application/services/fetch-all-pages.js';
import { assessClientRisk } from '@/modules/dashboard/domain/client-risk.js';
import { ListLoanBalancesUseCase } from '@/modules/collections/application/use-cases/list-loan-balances.use-case.js';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';
import { ListLoansUseCase } from '@/modules/loans/application/use-cases/list-loans.use-case.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

const PAGE_SIZE = 100;

/**
 * El riesgo de varios clientes del negocio (D-137), con el historial que el prestamista tiene de
 * cada uno y nada de otros negocios: sus préstamos (`ListLoansUseCase`) y la mora de hoy de los
 * activos (`ListLoanBalancesUseCase`, en lote).
 *
 * @remarks
 * Un id que no es de un cliente de este prestamista no falla: no tiene préstamos aquí y sale sin
 * historial, igual que un cliente nuevo, así que la ruta no revela si el id existe en otro negocio.
 */
@Injectable()
export class GetClientsRiskUseCase {
  constructor(
    private readonly listLoans: ListLoansUseCase,
    private readonly listLoanBalances: ListLoanBalancesUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** @param input - El prestamista y los clientes a puntuar. */
  async execute(input: GetClientsRiskInput): Promise<ClientRiskEntry[]> {
    const loansByClient = await Promise.all(
      input.clientIds.map((clientId) => this.loansOf(input.lenderId, clientId)),
    );
    const active = loansByClient
      .flat()
      .filter((loan) => loan.status === 'ACTIVE');
    const balances = await this.listLoanBalances.execute({
      lenderId: input.lenderId,
      loans: active,
      day: toBusinessDate(this.clock.now()),
    });
    return input.clientIds.map((clientId, index) => {
      const loans = (loansByClient[index] ?? []).filter(
        (loan) => loan.status !== 'CANCELED',
      );
      const mine = loans
        .filter((loan) => loan.status === 'ACTIVE')
        .map((loan) => balances.get(loan.id));
      const inArrears = mine.filter(
        (balance) => (balance?.overdueAmount ?? 0) > 0,
      );
      const risk = assessClientRisk({
        paidOffLoans: loans.filter((loan) => loan.status === 'PAID_OFF').length,
        loansInArrears: inArrears.length,
        maxOverdueDays: Math.max(
          0,
          ...inArrears.map((b) => b?.overdueDays ?? 0),
        ),
        overdueAmount: inArrears.reduce(
          (sum, b) => sum + (b?.overdueAmount ?? 0),
          0,
        ),
        balance: mine.reduce((sum, b) => sum + (b?.balance ?? 0), 0),
      });
      return { clientId, loansCount: loans.length, ...risk };
    });
  }

  private loansOf(lenderId: string, clientId: string): Promise<LoanDetails[]> {
    return fetchAllPages<LoanDetails>(PAGE_SIZE, (page) =>
      this.listLoans.execute({ lenderId, clientId, page, pageSize: PAGE_SIZE }),
    );
  }
}
