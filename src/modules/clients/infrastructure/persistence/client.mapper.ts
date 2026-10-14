import type { Prisma } from '@/shared/infrastructure/persistence/generated/client.js';
import type { ClientModel } from '@/shared/infrastructure/persistence/generated/models.js';
import { Client } from '@/modules/clients/domain/entities/client.entity.js';

/** @param client - Cliente nuevo o actualizado. */
export function toClientCreateInput(
  client: Client,
): Prisma.ClientUncheckedCreateInput {
  return {
    id: client.id,
    lenderId: client.lenderId,
    nationalId: client.nationalId,
    fullName: client.fullName,
    occupation: client.occupation,
    phone: client.phone,
    address: client.address,
    createdAt: client.createdAt,
  };
}

/** @param row - Fila de `clients`. */
export function toClient(row: ClientModel): Client {
  return Client.create({
    id: row.id,
    lenderId: row.lenderId,
    nationalId: row.nationalId,
    fullName: row.fullName,
    occupation: row.occupation,
    phone: row.phone,
    address: row.address,
    createdAt: row.createdAt,
  });
}
