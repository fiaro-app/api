import { ErrorCodeSchema } from '@fiaro-app/contracts';
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  QueryMethod,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CreateClientUseCase } from '@/modules/clients/application/use-cases/create-client.use-case.js';
import { GetClientUseCase } from '@/modules/clients/application/use-cases/get-client.use-case.js';
import { ListClientsUseCase } from '@/modules/clients/application/use-cases/list-clients.use-case.js';
import { UpdateClientUseCase } from '@/modules/clients/application/use-cases/update-client.use-case.js';
import {
  ApiCreateClient,
  ApiGetClient,
  ApiListClients,
  ApiUpdateClient,
} from '@/modules/clients/infrastructure/controllers/docs/client-routes.docs.js';
import {
  CreateClientRequestSchema,
  ListClientsRequestSchema,
  UpdateClientRequestSchema,
} from '@/modules/clients/infrastructure/controllers/schemas/client-requests.schema.js';
import {
  toClientResponse,
  toClientsPageResponse,
  type ClientResponseSchema,
  type ClientsPageResponseSchema,
} from '@/modules/clients/infrastructure/controllers/schemas/client-responses.schema.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import { hasAnyRole } from '@/shared/application/security/has-any-role.js';
import { CurrentLenderScope } from '@/shared/infrastructure/http/current-lender-scope.decorator.js';
import { LenderScopeGuard } from '@/shared/infrastructure/http/lender-scope.guard.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/** Roles que pueden dar de alta o editar un cliente (PRODUCT.md §5: `LENDER` administra clientes). */
const EDITOR_ROLES = ['OWNER', 'LENDER'];

const ClientIdParamSchema = z.uuid();

/**
 * Clientes (personas deudoras) del prestamista con el que opera la sesión. Exige
 * `LenderScopeGuard`, así que corre después de `AuthGuard` y ya sabe con qué Lender operar sin
 * leerlo del body ni del query.
 *
 * @remarks
 * El chequeo de rol para crear y editar es uno de los puntos más sensibles del sistema
 * (PRODUCT.md §6): un cliente es la persona deudora de un negocio real, así que solo `OWNER` o
 * `LENDER` pueden darlo de alta o cambiarlo — un `COLLECTOR` puede verlo (lo necesita en campo)
 * pero nunca crearlo ni editarlo. Mismo patrón que `LenderController` (D-75): un `if` directo con
 * `hasAnyRole`, no una regla de autorización general todavía (`PERMISSIONS.md`, pendiente). Sin
 * auditoría propia todavía: `clients` no tiene su propio auditor, como tampoco lo tiene `lenders`.
 */
@ApiTags(API_TAGS.client.name)
@Controller('clients')
@UseGuards(LenderScopeGuard)
export class ClientController {
  constructor(
    private readonly createClientUseCase: CreateClientUseCase,
    private readonly getClientUseCase: GetClientUseCase,
    private readonly listClientsUseCase: ListClientsUseCase,
    private readonly updateClientUseCase: UpdateClientUseCase,
  ) {}

  /**
   * @param body - Los datos del cliente, ya validados.
   * @param scope - El Lender con el que opera la sesión.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateClient()
  async createClient(
    @Body({ schema: CreateClientRequestSchema })
    body: z.output<typeof CreateClientRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof ClientResponseSchema>> {
    if (!hasAnyRole(scope.roles, EDITOR_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return toClientResponse(
      await this.createClientUseCase.execute({
        lenderId: scope.lenderId,
        ...body,
      }),
    );
  }

  /**
   * @param id - El cliente.
   * @param scope - El Lender con el que opera la sesión.
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiGetClient()
  async getClient(
    @Param('id', { schema: ClientIdParamSchema }) id: string,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof ClientResponseSchema>> {
    return toClientResponse(
      await this.getClientUseCase.execute(id, scope.lenderId),
    );
  }

  /**
   * @param query - Página, tamaño y búsqueda opcional, ya validados.
   * @param scope - El Lender con el que opera la sesión.
   */
  @QueryMethod()
  @HttpCode(HttpStatus.OK)
  @ApiListClients()
  async listClients(
    @Body({ schema: ListClientsRequestSchema })
    query: z.output<typeof ListClientsRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof ClientsPageResponseSchema>> {
    const page = await this.listClientsUseCase.execute({
      lenderId: scope.lenderId,
      ...query,
    });
    return toClientsPageResponse(page, query);
  }

  /**
   * @param id - El cliente.
   * @param body - Los campos que cambian, ya validados.
   * @param scope - El Lender con el que opera la sesión.
   */
  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiUpdateClient()
  async updateClient(
    @Param('id', { schema: ClientIdParamSchema }) id: string,
    @Body({ schema: UpdateClientRequestSchema })
    body: z.output<typeof UpdateClientRequestSchema>,
    @CurrentLenderScope() scope: LenderScope,
  ): Promise<z.output<typeof ClientResponseSchema>> {
    if (!hasAnyRole(scope.roles, EDITOR_ROLES)) {
      throw new ForbiddenException({ code: ErrorCodeSchema.enum.FORBIDDEN });
    }
    return toClientResponse(
      await this.updateClientUseCase.execute({
        clientId: id,
        lenderId: scope.lenderId,
        ...body,
      }),
    );
  }
}
