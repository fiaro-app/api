import { toBusinessDate } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import { ListActiveMembershipsByRolesUseCase } from '@/modules/memberships/application/use-cases/list-active-memberships-by-roles.use-case.js';
import { CreateNotificationUseCase } from '@/modules/notifications/application/use-cases/create-notification.use-case.js';
import type {
  SettlementDetails,
  SubmitSettlementInput,
} from '@/modules/settlements/application/dtos/settlement-details.dto.js';
import { toSettlementDetails } from '@/modules/settlements/application/dtos/settlement-details.mapper.js';
import { SettlementNoteRequiredError } from '@/modules/settlements/domain/errors/settlement-note-required.error.js';
import type { DailySettlementRepository } from '@/modules/settlements/domain/repositories/daily-settlement.repository.js';
import { DAILY_SETTLEMENT_REPOSITORY } from '@/modules/settlements/domain/tokens/daily-settlement-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';

/** Roles de un prestamista que deben enterarse de un cuadre nuevo (PRODUCT.md §5). */
const REVIEWER_ROLES = ['OWNER', 'LENDER'] as const;

/**
 * Cierra el día de un cobrador: crea su cuadre de hoy si no existía, o lo reemplaza y lo devuelve
 * a `PENDING` si ya lo había enviado (D-36). Siempre es el propio cuadre de quien llama
 * (`collectorMembershipId` sale de la sesión, nunca del body): quién puede llamarlo lo decide el
 * controller (rol `COLLECTOR`).
 *
 * @remarks
 * `expectedAmount` y lo cobrado son los que el cobrador declara, no un cálculo del servidor
 * contra sus visitas asignadas del día (PRODUCT.md §5: "los montos son los que declaró el
 * cobrador"); esa comparación queda para quien revisa. `collectedAmount` sí lo calcula este caso
 * de uso, como la suma de los tres medios de pago, para que nunca pueda divergir de su propio
 * desglose. Compone `ListActiveMembershipsByRolesUseCase` (`memberships/application`) y
 * `CreateNotificationUseCase` (`notifications/application`) para avisarle a quien administra el
 * prestamista que hay un cuadre por revisar (D-87, PRODUCT.md §5: "Lender recibe alertas de
 * cuadres"), sin conocer el dominio de ninguno de los dos módulos (regla de fronteras,
 * ARCHITECTURE.md §3).
 */
@Injectable()
export class SubmitSettlementUseCase {
  constructor(
    @Inject(DAILY_SETTLEMENT_REPOSITORY)
    private readonly settlements: DailySettlementRepository,
    private readonly listReviewers: ListActiveMembershipsByRolesUseCase,
    private readonly createNotification: CreateNotificationUseCase,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param input - El prestamista y el cobrador de la sesión, y los montos declarados.
   * @throws {@link SettlementNoteRequiredError} Si lo cobrado difiere de lo esperado y no vino
   * `collectorNote`.
   */
  async execute(input: SubmitSettlementInput): Promise<SettlementDetails> {
    const collectedAmount =
      input.collectedCash + input.collectedNequi + input.collectedTransfer;
    if (
      collectedAmount !== input.expectedAmount &&
      input.collectorNote === null
    ) {
      throw new SettlementNoteRequiredError();
    }

    const now = this.clock.now();
    const settlement = await this.settlements.upsert({
      id: this.ids.next(),
      collectorMembershipId: input.collectorMembershipId,
      date: toBusinessDate(now),
      expectedAmount: input.expectedAmount,
      collectedAmount,
      collectedCash: input.collectedCash,
      collectedNequi: input.collectedNequi,
      collectedTransfer: input.collectedTransfer,
      collectorNote: input.collectorNote,
      submittedAt: now,
    });

    const reviewers = await this.listReviewers.execute(
      input.lenderId,
      REVIEWER_ROLES,
    );
    await Promise.all(
      reviewers.map((reviewer) =>
        this.createNotification.execute({
          recipientUserId: reviewer.userId,
          lenderId: input.lenderId,
          severity: 'INFO',
          title: 'Cuadre por revisar',
          body: 'Un cobrador cerró su día y espera tu revisión.',
          relatedEntityType: 'DAILY_SETTLEMENT',
          relatedEntityId: settlement.id,
        }),
      ),
    );

    return toSettlementDetails(settlement);
  }
}
