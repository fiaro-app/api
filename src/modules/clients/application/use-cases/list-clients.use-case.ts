import { Inject, Injectable } from '@nestjs/common';
import type {
  ClientsPageResult,
  ListClientsInput,
} from '@/modules/clients/application/dtos/client-details.dto.js';
import { toClientDetails } from '@/modules/clients/application/dtos/client-details.mapper.js';
import type { ClientRepository } from '@/modules/clients/domain/repositories/client.repository.js';
import { CLIENT_REPOSITORY } from '@/modules/clients/domain/tokens/client-repository.token.js';

/** Lista, paginados, los clientes del prestamista de la sesión. Cualquier rol puede verla. */
@Injectable()
export class ListClientsUseCase {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
  ) {}

  /** @param input - El prestamista dueño, la paginación y la búsqueda opcional. */
  async execute(input: ListClientsInput): Promise<ClientsPageResult> {
    const page = await this.clients.list(input);
    return {
      items: page.items.map(toClientDetails),
      total: page.total,
    };
  }
}
