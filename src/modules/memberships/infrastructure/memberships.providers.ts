import type { Provider } from '@nestjs/common';
import { CreateMembershipUseCase } from '@/modules/memberships/application/use-cases/create-membership.use-case.js';
import { MEMBERSHIP_REPOSITORY } from '@/modules/memberships/domain/tokens/membership-repository.token.js';
import { PrismaMembershipRepository } from '@/modules/memberships/infrastructure/persistence/prisma-membership.repository.js';

/** Qué implementa cada puerto del módulo. Vive en `infrastructure` y no en `memberships.module.ts`. */
export const membershipsProviders: Provider[] = [
  { provide: MEMBERSHIP_REPOSITORY, useClass: PrismaMembershipRepository },
  CreateMembershipUseCase,
];

/** Lo que el módulo ofrece a los demás: el alta de membresías. */
export const membershipsExports = [CreateMembershipUseCase];
