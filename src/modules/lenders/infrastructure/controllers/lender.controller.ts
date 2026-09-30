import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { z } from 'zod';
import { GetLenderUseCase } from '@/modules/lenders/application/use-cases/get-lender.use-case.js';
import { UpdateLenderUseCase } from '@/modules/lenders/application/use-cases/update-lender.use-case.js';
import {
  ApiGetLender,
  ApiUpdateLender,
} from '@/modules/lenders/infrastructure/controllers/docs/lender-routes.docs.js';
import { UpdateLenderRequestSchema } from '@/modules/lenders/infrastructure/controllers/schemas/lender-requests.schema.js';
import {
  toLenderResponse,
  type LenderResponseSchema,
} from '@/modules/lenders/infrastructure/controllers/schemas/lender-responses.schema.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/** Roles que pueden editar la configuración del prestamista (PRODUCT.md §5). */
const EDITOR_ROLES = ['OWNER', 'LENDER'];

/**
 * Configuración del prestamista con el que opera la sesión. Exige `LenderScopeGuard`, así que
 * corre después de `AuthGuard` (sesión) y ya sabe con qué Lender operar sin leerlo del body ni
 * del query.
 *
 * @remarks
 * Sin auditoría todavía: se agrega cuando `lenders` tenga su propio auditor, como `auth` tiene
 * `AuthAuditor`. Sin la matriz completa de permisos (PERMISSIONS.md, pendiente): el chequeo de
 * rol para editar es el mínimo que ya describen los roles en PRODUCT.md §5 (`LENDER` administra
 * el negocio, `COLLECTOR` solo cobra en campo), no una regla de autorización general todavía.
 */
@ApiTags(API_TAGS.lender.name)
@Controller('lender')
@UseGuards(LenderScopeGuard)
export class LenderController {
  constructor(
    private readonly getLenderUseCase: GetLenderUseCase,
    private readonly updateLenderUseCase: UpdateLenderUseCase,
  ) {}

  /** @param scope - El Lender con el que opera la sesión. */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiGetLender()
  async getLender(
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof LenderResponseSchema>> {
    return toLenderResponse(
      await this.getLenderUseCase.execute(scope.lenderId),
    );
  }

  /**
   * @param body - Los campos que cambian, ya validados.
   * @param scope - El Lender con el que opera la sesión.
   */
  @Patch()
  @HttpCode(HttpStatus.OK)
  @ApiUpdateLender()
  async updateLender(
    @Body({ schema: UpdateLenderRequestSchema })
    body: z.output<typeof UpdateLenderRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof LenderResponseSchema>> {
    if (!scope.roles.some((role) => EDITOR_ROLES.includes(role))) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return toLenderResponse(
      await this.updateLenderUseCase.execute({
        lenderId: scope.lenderId,
        ...body,
      }),
    );
  }
}
