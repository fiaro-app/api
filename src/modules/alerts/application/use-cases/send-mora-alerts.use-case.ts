import { Injectable, Logger } from '@nestjs/common';
import {
  MORA_NOTIFICATION_TITLE,
  moraNotificationBody,
} from '@/modules/alerts/domain/mora/mora-notification.js';
import type { MoraAlertsResult } from '@/modules/alerts/domain/mora/mora-alerts-result.js';
import {
  type LoanOverdue,
  type MoraTally,
  tallyMora,
} from '@/modules/alerts/domain/mora/mora-tally.js';
import { GetLoanBalanceUseCase } from '@/modules/collections/application/use-cases/get-loan-balance.use-case.js';
import { ListLenderIdsWithActiveLoansUseCase } from '@/modules/loans/application/use-cases/list-lender-ids-with-active-loans.use-case.js';
import { ListLoansUseCase } from '@/modules/loans/application/use-cases/list-loans.use-case.js';
import { ListActiveMembershipsByRolesUseCase } from '@/modules/memberships/application/use-cases/list-active-memberships-by-roles.use-case.js';
import { CreateNotificationUseCase } from '@/modules/notifications/application/use-cases/create-notification.use-case.js';

/** Roles que administran el prestamista y reciben el aviso, igual que con los cuadres (PRODUCT.md §5). */
const REVIEWER_ROLES = ['OWNER', 'LENDER'] as const;

/** Tamaño de página al recorrer los préstamos activos de un prestamista. */
const PAGE_SIZE = 100;

/**
 * Por cada prestamista con préstamos activos, suma lo que tiene en mora y avisa a quien lo administra
 * si hay algo (D-96). Un prestamista sin mora no recibe nada.
 *
 * @remarks
 * No corre con una sesión, así que no pasa por `LenderScopeGuard`: cada lectura lleva el `lenderId`
 * del prestamista que se está revisando, igual que cualquier otra. Si el cálculo de uno falla, se
 * escribe en el log con su id y se sigue con los demás: un prestamista no debe dejar sin aviso a los
 * otros.
 */
@Injectable()
export class SendMoraAlertsUseCase {
  private readonly logger = new Logger(SendMoraAlertsUseCase.name);

  constructor(
    private readonly listLenderIds: ListLenderIdsWithActiveLoansUseCase,
    private readonly listLoans: ListLoansUseCase,
    private readonly getLoanBalance: GetLoanBalanceUseCase,
    private readonly listReviewers: ListActiveMembershipsByRolesUseCase,
    private readonly createNotification: CreateNotificationUseCase,
  ) {}

  /** @returns A cuántos prestamistas se les avisó y cuántos préstamos hay en mora en total. */
  async execute(): Promise<MoraAlertsResult> {
    let lendersNotified = 0;
    let loansInMora = 0;
    for (const lenderId of await this.listLenderIds.execute()) {
      try {
        const tally = await this.tallyLender(lenderId);
        loansInMora += tally.loansInMora;
        if (tally.loansInMora > 0) {
          await this.notifyReviewers(lenderId, tally);
          lendersNotified += 1;
        }
      } catch (error) {
        this.logger.error(
          `No se pudo calcular la mora del prestamista ${lenderId}: ${String(error)}.`,
        );
      }
    }
    return { lendersNotified, loansInMora };
  }

  /**
   * Lo que el prestamista tiene en mora hoy, préstamo por préstamo.
   *
   * @param lenderId - El prestamista.
   */
  private async tallyLender(lenderId: string): Promise<MoraTally> {
    const balances: LoanOverdue[] = [];
    for (const loanId of await this.activeLoanIds(lenderId)) {
      balances.push(await this.getLoanBalance.execute(loanId, lenderId));
    }
    return tallyMora(balances);
  }

  /**
   * Los ids de todos los préstamos activos del prestamista, recorriendo sus páginas.
   *
   * @param lenderId - El prestamista.
   */
  private async activeLoanIds(lenderId: string): Promise<string[]> {
    const ids: string[] = [];
    let page = 1;
    let fetched: { readonly ids: string[]; readonly total: number };
    do {
      fetched = await this.activeLoanIdsPage(lenderId, page);
      ids.push(...fetched.ids);
      page += 1;
    } while (fetched.ids.length > 0 && ids.length < fetched.total);
    return ids;
  }

  /**
   * Una página de los préstamos activos del prestamista.
   *
   * @param lenderId - El prestamista.
   * @param page - La página, desde 1.
   */
  private async activeLoanIdsPage(
    lenderId: string,
    page: number,
  ): Promise<{ readonly ids: string[]; readonly total: number }> {
    const result = await this.listLoans.execute({
      lenderId,
      status: 'ACTIVE',
      page,
      pageSize: PAGE_SIZE,
    });
    return {
      ids: result.items.map((loan) => loan.id),
      total: result.total,
    };
  }

  /**
   * Le escribe el aviso a quien administra el prestamista.
   *
   * @param lenderId - El prestamista.
   * @param tally - Lo que tiene en mora, para el texto del aviso.
   */
  private async notifyReviewers(
    lenderId: string,
    tally: MoraTally,
  ): Promise<void> {
    const reviewers = await this.listReviewers.execute(
      lenderId,
      REVIEWER_ROLES,
    );
    await Promise.all(
      reviewers.map((reviewer) =>
        this.createNotification.execute({
          recipientUserId: reviewer.userId,
          lenderId,
          severity: 'WARNING',
          title: MORA_NOTIFICATION_TITLE,
          body: moraNotificationBody(tally),
          relatedEntityType: null,
          relatedEntityId: null,
        }),
      ),
    );
  }
}
