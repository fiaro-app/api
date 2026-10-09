import { toBusinessDate } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import type {
  CollectionVisitReportResult,
  SearchCollectionVisitsInput,
} from '@/modules/collections/application/dtos/collection-visit-report.dto.js';
import type { CollectionVisitReportRepository } from '@/modules/collections/domain/repositories/collection-visit-report.repository.js';
import { COLLECTION_VISIT_REPORT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-visit-report-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/**
 * Busca, paginadas, las visitas de cobro de todo el prestamista de la sesión en un rango de
 * fechas: la pantalla «Cobros del día». Solo para quien administra el negocio (`OWNER` o
 * `LENDER`, lo comprueba el controller).
 *
 * @remarks
 * Sin rango, devuelve las de hoy (hora de Bogotá). El aislamiento por prestamista lo hace el
 * propio criterio de lectura: un `collectorMembershipId` o un `portfolioId` de otro prestamista no
 * falla ni filtra nada ajeno, simplemente no encuentra visitas.
 */
@Injectable()
export class SearchCollectionVisitsUseCase {
  constructor(
    @Inject(COLLECTION_VISIT_REPORT_REPOSITORY)
    private readonly report: CollectionVisitReportRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** @param input - Prestamista, rango opcional, filtros opcionales y paginación. */
  async execute(
    input: SearchCollectionVisitsInput,
  ): Promise<CollectionVisitReportResult> {
    const today = toBusinessDate(this.clock.now());
    const from = input.from ?? today;
    const to = input.to ?? today;

    const page = await this.report.search({
      lenderId: input.lenderId,
      from,
      to,
      collectorMembershipId: input.collectorMembershipId,
      portfolioId: input.portfolioId,
      outcome: input.outcome,
      page: input.page,
      pageSize: input.pageSize,
    });

    return {
      from,
      to,
      total: page.total,
      items: page.items.map((row) => ({
        visitId: row.visitId,
        occurredAt: row.occurredAt,
        outcome: row.outcome,
        expectedAmount: row.expectedAmount,
        promisedDate: row.promisedDate,
        loan: { id: row.loanId },
        client: { id: row.clientId, fullName: row.clientFullName },
        collector: {
          membershipId: row.collectorMembershipId,
          fullName: row.collectorFullName,
        },
        payment: row.payment,
      })),
    };
  }
}
