import type { ClientDetails } from '@/modules/clients/application/dtos/client-details.dto.js';
import type { Client } from '@/modules/clients/domain/entities/client.entity.js';

/** @param client - El cliente. */
export function toClientDetails(client: Client): ClientDetails {
  return {
    id: client.id,
    nationalId: client.nationalId,
    fullName: client.fullName,
    occupation: client.occupation,
    phone: client.phone,
    address: client.address,
    createdAt: client.createdAt,
  };
}
