import type { Provider } from '@nestjs/common';
import { CreateClientUseCase } from '@/modules/clients/application/use-cases/create-client.use-case.js';
import { GetClientUseCase } from '@/modules/clients/application/use-cases/get-client.use-case.js';
import { ListClientsUseCase } from '@/modules/clients/application/use-cases/list-clients.use-case.js';
import { UpdateClientUseCase } from '@/modules/clients/application/use-cases/update-client.use-case.js';
import { CLIENT_REPOSITORY } from '@/modules/clients/domain/tokens/client-repository.token.js';
import { PrismaClientRepository } from '@/modules/clients/infrastructure/persistence/prisma-client.repository.js';

/** Proveedores del módulo `clients`. */
export const clientsProviders: Provider[] = [
  { provide: CLIENT_REPOSITORY, useClass: PrismaClientRepository },
  CreateClientUseCase,
  GetClientUseCase,
  ListClientsUseCase,
  UpdateClientUseCase,
];

/** Lo que `clients` expone a otros módulos. */
export const clientsExports = [
  CreateClientUseCase,
  GetClientUseCase,
  ListClientsUseCase,
  UpdateClientUseCase,
];
