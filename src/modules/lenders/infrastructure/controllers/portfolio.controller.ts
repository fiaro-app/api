import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CreatePortfolioUseCase } from '@/modules/lenders/application/use-cases/create-portfolio.use-case.js';
import { DeletePortfolioUseCase } from '@/modules/lenders/application/use-cases/delete-portfolio.use-case.js';
import { ListPortfoliosUseCase } from '@/modules/lenders/application/use-cases/list-portfolios.use-case.js';
import { UpdatePortfolioUseCase } from '@/modules/lenders/application/use-cases/update-portfolio.use-case.js';
import {
  ApiCreatePortfolio,
  ApiDeletePortfolio,
  ApiListPortfolios,
  ApiUpdatePortfolio,
} from '@/modules/lenders/infrastructure/controllers/docs/portfolio-routes.docs.js';
import {
  CreatePortfolioRequestSchema,
  UpdatePortfolioRequestSchema,
} from '@/modules/lenders/infrastructure/controllers/schemas/portfolio-requests.schema.js';
import {
  toPortfolioResponse,
  toPortfoliosResponse,
  type PortfolioResponseSchema,
  type PortfoliosResponseSchema,
} from '@/modules/lenders/infrastructure/controllers/schemas/portfolio-responses.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import { hasAnyRole } from '@/shared/application/security/has-any-role.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/** Roles que pueden crear, renombrar y borrar carteras (mismo criterio que editar el prestamista, D-75). */
const EDITOR_ROLES = ['OWNER', 'LENDER'];

const PortfolioIdParamSchema = z.uuid();

/**
 * Carteras (zonas) del prestamista con el que opera la sesión. Exige `LenderScopeGuard`, así que
 * corre después de `AuthGuard` y ya sabe con qué Lender operar sin leerlo del body.
 *
 * @remarks
 * Renombrar (D-109) y borrar (D-109) exigen `OWNER` o `LENDER`, igual que crear. Asignar un
 * cobrador a una cartera sigue siendo trabajo de `Membership`, no de `lenders`. Sin auditoría
 * propia todavía.
 */
@ApiTags(API_TAGS.portfolio.name)
@Controller('portfolios')
@UseGuards(LenderScopeGuard)
export class PortfolioController {
  constructor(
    private readonly createPortfolioUseCase: CreatePortfolioUseCase,
    private readonly listPortfoliosUseCase: ListPortfoliosUseCase,
    private readonly updatePortfolioUseCase: UpdatePortfolioUseCase,
    private readonly deletePortfolioUseCase: DeletePortfolioUseCase,
  ) {}

  /**
   * @param body - El nombre de la cartera, ya validado.
   * @param scope - El Lender con el que opera la sesión.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatePortfolio()
  async createPortfolio(
    @Body({ schema: CreatePortfolioRequestSchema })
    body: z.output<typeof CreatePortfolioRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof PortfolioResponseSchema>> {
    if (!hasAnyRole(scope.roles, EDITOR_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return toPortfolioResponse(
      await this.createPortfolioUseCase.execute({
        lenderId: scope.lenderId,
        ...body,
      }),
    );
  }

  /** @param scope - El Lender con el que opera la sesión. */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiListPortfolios()
  async listPortfolios(
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof PortfoliosResponseSchema>> {
    return toPortfoliosResponse(
      await this.listPortfoliosUseCase.execute(scope.lenderId),
    );
  }

  /**
   * @param id - La cartera.
   * @param body - El nombre nuevo, ya validado.
   * @param scope - El Lender con el que opera la sesión.
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiUpdatePortfolio()
  async updatePortfolio(
    @Param('id', { schema: PortfolioIdParamSchema }) id: string,
    @Body({ schema: UpdatePortfolioRequestSchema })
    body: z.output<typeof UpdatePortfolioRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof PortfolioResponseSchema>> {
    if (!hasAnyRole(scope.roles, EDITOR_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return toPortfolioResponse(
      await this.updatePortfolioUseCase.execute({
        lenderId: scope.lenderId,
        portfolioId: id,
        name: body.name,
      }),
    );
  }

  /**
   * @param id - La cartera.
   * @param scope - El Lender con el que opera la sesión.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeletePortfolio()
  async deletePortfolio(
    @Param('id', { schema: PortfolioIdParamSchema }) id: string,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<void> {
    if (!hasAnyRole(scope.roles, EDITOR_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    await this.deletePortfolioUseCase.execute(id, scope.lenderId);
  }
}
