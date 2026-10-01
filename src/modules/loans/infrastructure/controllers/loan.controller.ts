import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  QueryMethod,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CancelLoanUseCase } from '@/modules/loans/application/use-cases/cancel-loan.use-case.js';
import { CreateLoanUseCase } from '@/modules/loans/application/use-cases/create-loan.use-case.js';
import { GetLoanUseCase } from '@/modules/loans/application/use-cases/get-loan.use-case.js';
import { ListLoansUseCase } from '@/modules/loans/application/use-cases/list-loans.use-case.js';
import {
  ApiCancelLoan,
  ApiCreateLoan,
  ApiGetLoan,
  ApiListLoans,
} from '@/modules/loans/infrastructure/controllers/docs/loan-routes.docs.js';
import {
  CreateLoanRequestSchema,
  ListLoansRequestSchema,
} from '@/modules/loans/infrastructure/controllers/schemas/loan-requests.schema.js';
import {
  toLoanResponse,
  toLoansPageResponse,
  type LoanResponseSchema,
  type LoansPageResponseSchema,
} from '@/modules/loans/infrastructure/controllers/schemas/loan-responses.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import { hasAnyRole } from '@/shared/application/security/has-any-role.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/** Roles que pueden dar de alta un préstamo (PRODUCT.md §5: "solo el Lender crea préstamos"). */
const CREATOR_ROLES = ['OWNER', 'LENDER'];

const LoanIdParamSchema = z.uuid();

/**
 * Préstamos del prestamista con el que opera la sesión. Exige `LenderScopeGuard`, así que corre
 * después de `AuthGuard` y ya sabe con qué Lender operar sin leerlo del body ni del query.
 *
 * @remarks
 * Mismo patrón de guard de rol que `ClientController` (D-76): un `if` directo con `hasAnyRole`,
 * no una regla de autorización general todavía (`PERMISSIONS.md`, pendiente). Cancelar exige el
 * mismo rol que dar de alta (D-79). Sin auditoría propia todavía.
 */
@ApiTags(API_TAGS.loan.name)
@Controller('loans')
@UseGuards(LenderScopeGuard)
export class LoanController {
  constructor(
    private readonly createLoanUseCase: CreateLoanUseCase,
    private readonly getLoanUseCase: GetLoanUseCase,
    private readonly listLoansUseCase: ListLoansUseCase,
    private readonly cancelLoanUseCase: CancelLoanUseCase,
  ) {}

  /**
   * @param body - Los datos del préstamo, ya validados.
   * @param scope - El Lender y la membresía con la que opera la sesión.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateLoan()
  async createLoan(
    @Body({ schema: CreateLoanRequestSchema })
    body: z.output<typeof CreateLoanRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof LoanResponseSchema>> {
    if (!hasAnyRole(scope.roles, CREATOR_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return toLoanResponse(
      await this.createLoanUseCase.execute({
        lenderId: scope.lenderId,
        membershipId: scope.membershipId,
        ...body,
      }),
    );
  }

  /**
   * @param id - El préstamo.
   * @param scope - El Lender con el que opera la sesión.
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiGetLoan()
  async getLoan(
    @Param('id', { schema: LoanIdParamSchema }) id: string,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof LoanResponseSchema>> {
    return toLoanResponse(
      await this.getLoanUseCase.execute(id, scope.lenderId),
    );
  }

  /**
   * @param query - Página, tamaño y filtros opcionales, ya validados.
   * @param scope - El Lender con el que opera la sesión.
   */
  @QueryMethod()
  @HttpCode(HttpStatus.OK)
  @ApiListLoans()
  async listLoans(
    @Body({ schema: ListLoansRequestSchema })
    query: z.output<typeof ListLoansRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof LoansPageResponseSchema>> {
    const page = await this.listLoansUseCase.execute({
      lenderId: scope.lenderId,
      ...query,
    });
    return toLoansPageResponse(page, query);
  }

  /**
   * @param id - El préstamo.
   * @param scope - El Lender con el que opera la sesión.
   */
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiCancelLoan()
  async cancelLoan(
    @Param('id', { schema: LoanIdParamSchema }) id: string,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof LoanResponseSchema>> {
    if (!hasAnyRole(scope.roles, CREATOR_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return toLoanResponse(
      await this.cancelLoanUseCase.execute(id, scope.lenderId),
    );
  }
}
