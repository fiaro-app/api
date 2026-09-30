import { Inject, Injectable } from '@nestjs/common';
import type {
  ClientDetails,
  CreateClientInput,
} from '@/modules/clients/application/dtos/client-details.dto.js';
import { toClientDetails } from '@/modules/clients/application/dtos/client-details.mapper.js';
import { validateClientData } from '@/modules/clients/application/services/client-data.validator.js';
import { Client } from '@/modules/clients/domain/entities/client.entity.js';
import type { ClientRepository } from '@/modules/clients/domain/repositories/client.repository.js';
import { CLIENT_REPOSITORY } from '@/modules/clients/domain/tokens/client-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';

/**
 * Da de alta a un cliente para el prestamista de la sesión. Quién puede llamarlo lo decide el
 * controller (`hasAnyRole`, `OWNER`/`LENDER`): este caso de uso confía en el `lenderId` que
 * recibe, tal como lo resolvió `LenderScopeGuard`.
 */
@Injectable()
export class CreateClientUseCase {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param input - El prestamista dueño y los datos del cliente.
   * @returns El cliente creado.
   * @throws {@link InvalidClientDataError} Si algún dato no cumple el contrato.
   * @throws {@link ClientNationalIdTakenError} Si ya existe un cliente con esa cédula para el
   * mismo prestamista.
   */
  async execute(input: CreateClientInput): Promise<ClientDetails> {
    const data = validateClientData(input);
    const client = Client.create({
      id: this.ids.next(),
      lenderId: input.lenderId,
      ...data,
      createdAt: this.clock.now(),
    });
    await this.clients.create(client);
    return toClientDetails(client);
  }
}
