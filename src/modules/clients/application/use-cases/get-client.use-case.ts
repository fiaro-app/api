import { Inject, Injectable } from '@nestjs/common';
import type { ClientDetails } from '@/modules/clients/application/dtos/client-details.dto.js';
import { toClientDetails } from '@/modules/clients/application/dtos/client-details.mapper.js';
import { ClientNotFoundError } from '@/modules/clients/domain/errors/client-not-found.error.js';
import type { ClientRepository } from '@/modules/clients/domain/repositories/client.repository.js';
import { CLIENT_REPOSITORY } from '@/modules/clients/domain/tokens/client-repository.token.js';

/**
 * Consulta un cliente del prestamista de la sesión. Cualquier rol puede verlo (le sirve al
 * Collector para su trabajo en campo); solo el controller restringe crear y editar.
 */
@Injectable()
export class GetClientUseCase {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
  ) {}

  /**
   * @param id - El cliente.
   * @param lenderId - El prestamista dueño, tal como lo resolvió `LenderScopeGuard`.
   * @returns Sus datos públicos.
   * @throws {@link ClientNotFoundError} Si no existe, o es de otro prestamista.
   */
  async execute(id: string, lenderId: string): Promise<ClientDetails> {
    const client = await this.clients.findById(id, lenderId);
    if (client === null) {
      throw new ClientNotFoundError(id);
    }
    return toClientDetails(client);
  }
}
