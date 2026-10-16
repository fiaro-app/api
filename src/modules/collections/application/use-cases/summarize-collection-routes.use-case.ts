import { toBusinessDate } from '@fiaro-app/contracts';
import { Inject, Injectable } from '@nestjs/common';
import type {
  CollectionRoutesResult,
  SummarizeCollectionRoutesInput,
} from '@/modules/collections/application/dtos/collection-visit-report.dto.js';
import type { CollectionVisitReportRepository } from '@/modules/collections/domain/repositories/collection-visit-report.repository.js';
import { COLLECTION_VISIT_REPORT_REPOSITORY } from '@/modules/collections/domain/tokens/collection-visit-report-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/**
 * El registro de rutas (D-143): por cada cobrador y día, cuándo empezó y terminó la ruta, cuántas visitas
 * hizo, cuántas terminaron en pago y cuánto cobró. Solo para quien administra el negocio (`OWNER` o
 * `LENDER`, lo comprueba el controller).
 *
 * @remarks
 * La ruta «empieza» con la primera visita del día y «termina» con la última: la app no registra un botón de
 * inicio ni de fin, así que son las horas de las visitas. Sin rango, devuelve las de hoy (hora de Bogotá).
 * El resumen se arma con las visitas del rango (hasta 93 días) y se pagina en memoria.
 */
@Injectable()
export class SummarizeCollectionRoutesUseCase {
  constructor(
    @Inject(COLLECTION_VISIT_REPORT_REPOSITORY)
    private readonly report: CollectionVisitReportRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** @param input - Prestamista, rango opcional, filtros opcionales y paginación. */
  async execute(
    input: SummarizeCollectionRoutesInput,
  ): Promise<CollectionRoutesResult> {
    const today = toBusinessDate(this.clock.now());
    const from = input.from ?? today;
    const to = input.to ?? today;

    const days = await this.report.summarizeRoutes({
      lenderId: input.lenderId,
      from,
      to,
      collectorMembershipId: input.collectorMembershipId,
      portfolioId: input.portfolioId,
    });
    const start = (input.page - 1) * input.pageSize;

    return {
      from,
      to,
      total: days.length,
      items: days.slice(start, start + input.pageSize).map((day) => ({
        date: day.date,
        collector: {
          membershipId: day.collectorMembershipId,
          fullName: day.collectorFullName,
        },
        startedAt: day.startedAt,
        endedAt: day.endedAt,
        visitsCount: day.visitsCount,
        paidCount: day.paidCount,
        expectedAmount: day.expectedAmount,
        collectedAmount: day.collectedAmount,
      })),
    };
  }
}
