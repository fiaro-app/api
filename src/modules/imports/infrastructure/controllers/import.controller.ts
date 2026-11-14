import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { z } from 'zod';
import { ImportRowsUseCase } from '@/modules/imports/application/use-cases/import-rows.use-case.js';
import { ApiImportRows } from '@/modules/imports/infrastructure/controllers/docs/import-routes.docs.js';
import { ImportRequestSchema } from '@/modules/imports/infrastructure/controllers/schemas/import-requests.schema.js';
import {
  toImportResponse,
  type ImportResponseSchema,
} from '@/modules/imports/infrastructure/controllers/schemas/import-responses.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import { hasAnyRole } from '@/shared/application/security/has-any-role.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { RequiresPlanFeature } from '@/shared/infrastructure/http/requires-plan-feature.decorator.js';
import { TranslationService } from '@/shared/infrastructure/i18n/translation.service.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

const IMPORTER_ROLES = ['OWNER', 'LENDER'];

/**
 * Importar clientes y préstamos en curso desde una hoja (D-152). Solo planes con `EXCEL_IMPORT`;
 * la web lee el archivo y manda las filas en tandas de hasta 200.
 */
@ApiTags(API_TAGS.import.name)
@Controller('imports')
@UseGuards(LenderScopeGuard)
export class ImportController {
  constructor(
    private readonly importRows: ImportRowsUseCase,
    private readonly translator: TranslationService,
  ) {}

  /**
   * @param body - Las filas y si es solo la vista previa.
   * @param scope - El Lender y la membresía con la que opera la sesión.
   */
  @Post()
  @RequiresPlanFeature('EXCEL_IMPORT')
  @HttpCode(HttpStatus.OK)
  @ApiImportRows()
  async import(
    @Body({ schema: ImportRequestSchema })
    body: z.output<typeof ImportRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof ImportResponseSchema>> {
    if (!hasAnyRole(scope.roles, IMPORTER_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    const outcome = await this.importRows.execute({
      lenderId: scope.lenderId,
      membershipId: scope.membershipId,
      dryRun: body.dryRun,
      rows: body.rows,
    });
    return toImportResponse(
      outcome,
      (message, params) => this.translator.find(message, params) ?? message,
    );
  }
}
