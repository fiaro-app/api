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

/** Una página de ids de préstamos, con el total que cumple el criterio (sin paginar). */
interface LoanIdsPage {
  readonly ids: readonly string[];
  readonly total: number;
}

/** Lo que deja el cálculo de un prestamista: cuánto está en mora, y si se le avisó. */
interface LenderOutcome {
  readonly loansInMora: number;
  readonly notified: boolean;
}

/**
 * Por cada prestamista con préstamos activos, suma lo que tiene en mora y avisa a quien lo administra
 * si hay algo (D-96). Un prestamista sin mora no recibe nada.
 *
 * @remarks
 * No corre con una sesión, así que no pasa por `LenderScopeGuard`: cada lectura lleva el `lenderId`
 * del prestamista que se está revisando, igual que cualquier otra. Los prestamistas, sus préstamos y
 * los administradores de cada uno se consultan en paralelo (`Promise.all`), no en un bucle secuencial:
 * son lecturas independientes entre sí. Si el cálculo de un prestamista falla, se escribe en el log
 * con su id y no afecta a los demás: la falla queda en `notified: false`, nunca se propaga.
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
    const lenderIds = await this.listLenderIds.execute();
    const outcomes = await Promise.all(
      lenderIds.map((lenderId) => this.processLender(lenderId)),
    );
    return outcomes.reduce<MoraAlertsResult>(
      (result, outcome) => ({
        lendersNotified: result.lendersNotified + (outcome.notified ? 1 : 0),
        loansInMora: result.loansInMora + outcome.loansInMora,
      }),
      { lendersNotified: 0, loansInMora: 0 },
    );
  }

  /**
   * Calcula la mora de un prestamista y, si hay alguna, avisa a quien lo administra.
   *
   * @param lenderId - El prestamista.
   */
  private async processLender(lenderId: string): Promise<LenderOutcome> {
    let tally: MoraTally;
    try {
      tally = await this.tallyLender(lenderId);
    } catch (error) {
      this.logger.error(
        `No se pudo calcular la mora del prestamista ${lenderId}: ${String(error)}.`,
      );
      return { loansInMora: 0, notified: false };
    }
    if (tally.loansInMora === 0) {
      return { loansInMora: 0, notified: false };
    }
    try {
      await this.notifyReviewers(lenderId, tally);
      return { loansInMora: tally.loansInMora, notified: true };
    } catch (error) {
      this.logger.error(
        `No se pudo avisar al prestamista ${lenderId}: ${String(error)}.`,
      );
      return { loansInMora: tally.loansInMora, notified: false };
    }
  }

  /**
   * Lo que el prestamista tiene en mora hoy, préstamo por préstamo.
   *
   * @param lenderId - El prestamista.
   */
  private async tallyLender(lenderId: string): Promise<MoraTally> {
    const loanIds = await this.activeLoanIds(lenderId);
    const balances: LoanOverdue[] = await Promise.all(
      loanIds.map((loanId) => this.getLoanBalance.execute(loanId, lenderId)),
    );
    return tallyMora(balances);
  }

  /**
   * Los ids de todos los préstamos activos del prestamista. Pide la primera página para saber
   * cuántas hay en total, y si hace falta más de una, pide el resto en paralelo: cada página es una
   * lectura independiente una vez que se sabe cuántas existen.
   *
   * @param lenderId - El prestamista.
   */
  private async activeLoanIds(lenderId: string): Promise<string[]> {
    const first = await this.activeLoanIdsPage(lenderId, 1);
    if (first.ids.length >= first.total) {
      return [...first.ids];
    }
    const remainingPages = Math.ceil(first.total / PAGE_SIZE) - 1;
    const rest = await Promise.all(
      Array.from({ length: remainingPages }, (_, index) =>
        this.activeLoanIdsPage(lenderId, index + 2),
      ),
    );
    return [...first.ids, ...rest.flatMap((page) => page.ids)];
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
  ): Promise<LoanIdsPage> {
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
