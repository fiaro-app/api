import { Injectable } from '@nestjs/common';
import { toBusinessDate } from '@fiaro-app/contracts';
import { GetLoanBalanceUseCase } from '@/modules/collections/application/use-cases/get-loan-balance.use-case.js';
import { ListCollectionAssignmentsUseCase } from '@/modules/collections/application/use-cases/list-collection-assignments.use-case.js';
import { fetchAllPages } from '@/modules/dashboard/application/services/fetch-all-pages.js';
import type { LoanDetails } from '@/modules/loans/application/dtos/loan-details.dto.js';
import { ListLoansUseCase } from '@/modules/loans/application/use-cases/list-loans.use-case.js';

const PAGE_SIZE = 100;

/** Un préstamo de la cartera en una fecha, con su saldo y quién lo tenía asignado entonces. */
export interface LoanStatsRecord {
  readonly clientId: string;
  readonly balance: number;
  readonly overdueAmount: number;
  readonly overdueDays: number;
  /** El cobrador que lo tenía asignado en la fecha, o `null` si ninguno. */
  readonly collectorMembershipId: string | null;
}

/**
 * La cartera de préstamos de un prestamista en una fecha: cada préstamo con su saldo, su mora y el
 * cobrador que lo tenía asignado ese día. La comparten las estadísticas de hoy y las del período
 * anterior (D-111), para que ambas midan exactamente lo mismo.
 */
@Injectable()
export class LoanPortfolioSnapshotService {
  constructor(
    private readonly listLoans: ListLoansUseCase,
    private readonly getLoanBalance: GetLoanBalanceUseCase,
    private readonly listCollectionAssignments: ListCollectionAssignmentsUseCase,
  ) {}

  /**
   * Hoy: los préstamos `ACTIVE`, con su saldo y su mora de este momento.
   *
   * @param lenderId - El prestamista dueño.
   * @param today - La fecha de hoy (`AAAA-MM-DD`).
   */
  async current(
    lenderId: string,
    today: string,
  ): Promise<readonly LoanStatsRecord[]> {
    const loans = await this.fetchLoans(lenderId, 'ACTIVE');
    return Promise.all(
      loans.map((loan) => this.toRecord(loan, lenderId, today, undefined)),
    );
  }

  /**
   * Una fecha pasada: los préstamos que ya existían ese día y todavía no se habían cerrado, con
   * el saldo y la mora que tenían entonces (D-111).
   *
   * @param lenderId - El prestamista dueño.
   * @param asOf - La fecha pasada (`AAAA-MM-DD`), hora de Bogotá.
   */
  async asOf(
    lenderId: string,
    asOf: string,
  ): Promise<readonly LoanStatsRecord[]> {
    const loans = (await this.fetchLoans(lenderId, undefined)).filter((loan) =>
      wasOpenOn(loan, asOf),
    );
    return Promise.all(
      loans.map((loan) => this.toRecord(loan, lenderId, asOf, asOf)),
    );
  }

  private async fetchLoans(
    lenderId: string,
    status: 'ACTIVE' | undefined,
  ): Promise<readonly LoanDetails[]> {
    return fetchAllPages<LoanDetails>(PAGE_SIZE, (page) =>
      this.listLoans.execute({ lenderId, status, page, pageSize: PAGE_SIZE }),
    );
  }

  private async toRecord(
    loan: LoanDetails,
    lenderId: string,
    day: string,
    balanceAsOf: string | undefined,
  ): Promise<LoanStatsRecord> {
    const [balance, assignments] = await Promise.all([
      this.getLoanBalance.execute(loan.id, lenderId, balanceAsOf),
      this.listCollectionAssignments.execute(loan.id, lenderId),
    ]);
    const current = assignments.find(
      (assignment) =>
        assignment.effectiveFrom <= day &&
        (assignment.effectiveTo === null || assignment.effectiveTo >= day),
    );
    return {
      clientId: loan.clientId,
      balance: balance.balance,
      overdueAmount: balance.overdueAmount,
      overdueDays: balance.overdueDays,
      collectorMembershipId: current?.collectorMembershipId ?? null,
    };
  }
}

/**
 * @param loan - El préstamo.
 * @param day - La fecha (`AAAA-MM-DD`).
 * @returns Si el préstamo ya se había dado de alta ese día y todavía no se había cerrado.
 */
function wasOpenOn(loan: LoanDetails, day: string): boolean {
  if (toBusinessDate(loan.createdAt) > day) {
    return false;
  }
  return loan.closedAt === null || toBusinessDate(loan.closedAt) > day;
}
