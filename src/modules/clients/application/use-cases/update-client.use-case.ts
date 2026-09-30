import { Inject, Injectable } from '@nestjs/common';
import type {
  ClientDetails,
  UpdateClientInput,
} from '@/modules/clients/application/dtos/client-details.dto.js';
import { toClientDetails } from '@/modules/clients/application/dtos/client-details.mapper.js';
import { validateClientData } from '@/modules/clients/application/services/client-data.validator.js';
import { Client } from '@/modules/clients/domain/entities/client.entity.js';
import { ClientNotFoundError } from '@/modules/clients/domain/errors/client-not-found.error.js';
import type { ClientRepository } from '@/modules/clients/domain/repositories/client.repository.js';
import { CLIENT_REPOSITORY } from '@/modules/clients/domain/tokens/client-repository.token.js';

/**
 * Actualiza los datos de un cliente: lo que cambia, más lo que ya tenía. Revalida el resultado
 * completo con la misma regla del alta (`validateClientData`, el contrato `ClientSchema`), así el
 * cliente nunca queda en un estado que esa regla no aceptaría — mismo patrón que
 * `UpdateLenderUseCase` (D-75). Quién puede llamarlo lo decide el controller.
 */
@Injectable()
export class UpdateClientUseCase {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
  ) {}

  /**
   * @param input - El cliente, el prestamista dueño y los campos que cambian.
   * @returns El cliente actualizado.
   * @throws {@link ClientNotFoundError} Si no existe, o es de otro prestamista.
   * @throws {@link InvalidClientDataError} Si el resultado no cumple el contrato.
   * @throws {@link ClientNationalIdTakenError} Si la cédula nueva ya la usa otro cliente del mismo
   * prestamista.
   */
  async execute(input: UpdateClientInput): Promise<ClientDetails> {
    const current = await this.clients.findById(input.clientId, input.lenderId);
    if (current === null) {
      throw new ClientNotFoundError(input.clientId);
    }

    const data = validateClientData({
      nationalId: input.nationalId ?? current.nationalId,
      fullName: input.fullName ?? current.fullName,
      occupation: input.occupation ?? current.occupation,
      phone: input.phone ?? current.phone,
      address: input.address ?? current.address,
    });
    const updated = Client.create({
      id: current.id,
      lenderId: current.lenderId,
      ...data,
      createdAt: current.createdAt,
    });
    await this.clients.update(updated);
    return toClientDetails(updated);
  }
}
