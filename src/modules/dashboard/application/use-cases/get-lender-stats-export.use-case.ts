import { Inject, Injectable } from '@nestjs/common';
import type { GetLenderStatsInput } from '@/modules/dashboard/application/dtos/lender-stats.dto.js';
import type { LenderStatsExport } from '@/modules/dashboard/application/dtos/lender-stats-export.dto.js';
import type { LenderLogoReader } from '@/modules/dashboard/application/ports/lender-logo-reader.port.js';
import { LENDER_LOGO_READER } from '@/modules/dashboard/application/ports/lender-logo-reader.token.js';
import { GetLenderStatsUseCase } from '@/modules/dashboard/application/use-cases/get-lender-stats.use-case.js';
import { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';

/**
 * Las mismas estadísticas de D-100, con el nombre del prestamista para encabezar el PDF
 * (D-101). No repite ningún cálculo: compone `GetLenderStatsUseCase` y `GetLenderUseCase`
 * (`lenders`, ya exportado desde D-84) en paralelo, y le suma la marca del negocio: su color y su
 * logo (D-151).
 */
/** El PDF muestra más filas del ranking y del desempeño que la pantalla (que pagina). */
const EXPORT_LIST_SIZE = 10;

@Injectable()
export class GetLenderStatsExportUseCase {
  constructor(
    private readonly getLenderStats: GetLenderStatsUseCase,
    private readonly getLender: GetLenderUseCase,
    @Inject(LENDER_LOGO_READER) private readonly logos: LenderLogoReader,
  ) {}

  /** @param input - El prestamista, el período y los filtros, igual que `GetLenderStatsUseCase`. */
  async execute(input: GetLenderStatsInput): Promise<LenderStatsExport> {
    const [stats, lender] = await Promise.all([
      this.getLenderStats.execute(input, EXPORT_LIST_SIZE),
      this.getLender.execute(input.lenderId),
    ]);
    return {
      stats,
      lenderName: lender.name,
      brand: {
        color: lender.brandColor,
        logo: await this.logos.read(lender.logoUrl),
      },
    };
  }
}
