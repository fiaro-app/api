import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  Get,
  HttpStatus,
  Param,
  Post,
  QueryMethod,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ApproveLoanRequestUseCase } from '@/modules/loan-requests/application/use-cases/approve-loan-request.use-case.js';
import { CreateLoanRequestUseCase } from '@/modules/loan-requests/application/use-cases/create-loan-request.use-case.js';
import { FindClientIdByNationalIdUseCase } from '@/modules/loan-requests/application/use-cases/find-client-id-by-national-id.use-case.js';
import { GetLoanRequestUseCase } from '@/modules/loan-requests/application/use-cases/get-loan-request.use-case.js';
import { ListLoanRequestsUseCase } from '@/modules/loan-requests/application/use-cases/list-loan-requests.use-case.js';
import { RejectLoanRequestUseCase } from '@/modules/loan-requests/application/use-cases/reject-loan-request.use-case.js';
import {
  ApiApproveLoanRequest,
  ApiCreateLoanRequest,
  ApiGetLoanRequest,
  ApiListLoanRequests,
  ApiLookupClient,
  ApiRejectLoanRequest,
} from '@/modules/loan-requests/infrastructure/controllers/docs/loan-request-routes.docs.js';
import {
  ApproveLoanRequestRequestSchema,
  ClientLookupRequestSchema,
  CreateLoanRequestRequestSchema,
  ListLoanRequestsRequestSchema,
  RejectLoanRequestRequestSchema,
} from '@/modules/loan-requests/infrastructure/controllers/schemas/loan-request-requests.schema.js';
import {
  toLoanRequestResponse,
  toLoanRequestsPageResponse,
  type ClientLookupResponseSchema,
  type LoanRequestResponseSchema,
  type LoanRequestsPageResponseSchema,
} from '@/modules/loan-requests/infrastructure/controllers/schemas/loan-request-responses.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import { hasAnyRole } from '@/shared/application/security/has-any-role.js';
import { AllowWhenReadOnly } from '@/shared/infrastructure/http/allow-when-read-only.decorator.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/** Roles que resuelven una solicitud y las ven todas: quienes administran el negocio. */
const ADMIN_ROLES = ['OWNER', 'LENDER'];

/** Rol que hace solicitudes: el cobrador. */
const REQUESTER_ROLES = ['COLLECTOR'];

const LoanRequestIdParamSchema = z.uuid();

/**
 * Solicitudes de préstamo que un cobrador le hace al administrador. Exige `LenderScopeGuard`.
 *
 * @remarks
 * El cobrador no ve el riesgo de nadie ni los datos de un cliente que no conoce: consulta si la
 * cédula existe (`client-lookup`, solo `exists`) y, si no existe, manda los datos del cliente
 * nuevo. Quien resuelve (aceptar o rechazar) es un administrador. Sin auditoría propia todavía.
 */
@ApiTags(API_TAGS.loanRequest.name)
@Controller('loan-requests')
@UseGuards(LenderScopeGuard)
export class LoanRequestController {
  constructor(
    private readonly findClientId: FindClientIdByNationalIdUseCase,
    private readonly createLoanRequest: CreateLoanRequestUseCase,
    private readonly getLoanRequest: GetLoanRequestUseCase,
    private readonly listLoanRequests: ListLoanRequestsUseCase,
    private readonly approveLoanRequest: ApproveLoanRequestUseCase,
    private readonly rejectLoanRequest: RejectLoanRequestUseCase,
  ) {}

  /**
   * @param body - La cédula, ya normalizada.
   * @param scope - El Lender con el que opera la sesión.
   */
  @AllowWhenReadOnly()
  @Post('client-lookup')
  @HttpCode(HttpStatus.OK)
  @ApiLookupClient()
  async lookupClient(
    @Body({ schema: ClientLookupRequestSchema })
    body: z.output<typeof ClientLookupRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof ClientLookupResponseSchema>> {
    const clientId = await this.findClientId.execute(
      scope.lenderId,
      body.nationalId,
    );
    return { exists: clientId !== null };
  }

  /**
   * @param body - La cédula, el cliente si es nuevo y las condiciones, ya validados.
   * @param scope - El Lender y la membresía con la que opera la sesión.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateLoanRequest()
  async createRequest(
    @Body({ schema: CreateLoanRequestRequestSchema })
    body: z.output<typeof CreateLoanRequestRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof LoanRequestResponseSchema>> {
    if (!hasAnyRole(scope.roles, REQUESTER_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return toLoanRequestResponse(
      await this.createLoanRequest.execute({
        lenderId: scope.lenderId,
        membershipId: scope.membershipId,
        ...body,
      }),
    );
  }

  /**
   * @param query - Página, tamaño y estado, ya validados.
   * @param scope - El Lender y la membresía con la que opera la sesión.
   */
  @QueryMethod()
  @HttpCode(HttpStatus.OK)
  @ApiListLoanRequests()
  async list(
    @Body({ schema: ListLoanRequestsRequestSchema })
    query: z.output<typeof ListLoanRequestsRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof LoanRequestsPageResponseSchema>> {
    const isAdmin = hasAnyRole(scope.roles, ADMIN_ROLES);
    const page = await this.listLoanRequests.execute({
      lenderId: scope.lenderId,
      ...query,
      ...(isAdmin ? {} : { requestedByMembershipId: scope.membershipId }),
    });
    return toLoanRequestsPageResponse(page, query);
  }

  /**
   * @param id - La solicitud.
   * @param scope - El Lender y la membresía con la que opera la sesión.
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiGetLoanRequest()
  async get(
    @Param('id', { schema: LoanRequestIdParamSchema }) id: string,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof LoanRequestResponseSchema>> {
    const isAdmin = hasAnyRole(scope.roles, ADMIN_ROLES);
    return toLoanRequestResponse(
      await this.getLoanRequest.execute(
        id,
        scope.lenderId,
        isAdmin ? undefined : scope.membershipId,
      ),
    );
  }

  /**
   * @param id - La solicitud.
   * @param body - Los ajustes opcionales, ya validados.
   * @param scope - El Lender y la membresía con la que opera la sesión.
   */
  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiApproveLoanRequest()
  async approve(
    @Param('id', { schema: LoanRequestIdParamSchema }) id: string,
    @Body({ schema: ApproveLoanRequestRequestSchema })
    body: z.output<typeof ApproveLoanRequestRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof LoanRequestResponseSchema>> {
    if (!hasAnyRole(scope.roles, ADMIN_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return toLoanRequestResponse(
      await this.approveLoanRequest.execute({
        id,
        lenderId: scope.lenderId,
        membershipId: scope.membershipId,
        ...body,
      }),
    );
  }

  /**
   * @param id - La solicitud.
   * @param body - El motivo opcional, ya validado.
   * @param scope - El Lender y la membresía con la que opera la sesión.
   */
  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiRejectLoanRequest()
  async reject(
    @Param('id', { schema: LoanRequestIdParamSchema }) id: string,
    @Body({ schema: RejectLoanRequestRequestSchema })
    body: z.output<typeof RejectLoanRequestRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof LoanRequestResponseSchema>> {
    if (!hasAnyRole(scope.roles, ADMIN_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return toLoanRequestResponse(
      await this.rejectLoanRequest.execute({
        id,
        lenderId: scope.lenderId,
        membershipId: scope.membershipId,
        reason: body.reason,
      }),
    );
  }
}
