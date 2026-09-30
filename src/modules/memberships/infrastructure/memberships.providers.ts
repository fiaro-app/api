import type { Provider } from '@nestjs/common';
import { CreateMembershipUseCase } from '@/modules/memberships/application/use-cases/create-membership.use-case.js';
import { MEMBERSHIP_REPOSITORY } from '@/modules/memberships/domain/tokens/membership-repository.token.js';
import { MembershipLenderScopeResolver } from '@/modules/memberships/infrastructure/http/membership-lender-scope-resolver.js';
import { PrismaMembershipRepository } from '@/modules/memberships/infrastructure/persistence/prisma-membership.repository.js';
import { LENDER_SCOPE_RESOLVER } from '@/shared/application/ports/lender-scope-resolver.token.js';

/** Qué implementa cada puerto del módulo. Vive en `infrastructure` y no en `memberships.module.ts`. */
export const membershipsProviders: Provider[] = [
  { provide: MEMBERSHIP_REPOSITORY, useClass: PrismaMembershipRepository },
  {
    provide: LENDER_SCOPE_RESOLVER,
    useClass: MembershipLenderScopeResolver,
  },
  CreateMembershipUseCase,
];

/**
 * Lo que el módulo ofrece a los demás: el alta de membresías y, por el puerto compartido, con qué
 * Lender opera una sesión — lo usa `LenderScopeGuard` (`shared/infrastructure`), así que cualquier
 * módulo que proteja una ruta con ese guard debe importar `MembershipsModule`.
 */
export const membershipsExports = [
  CreateMembershipUseCase,
  LENDER_SCOPE_RESOLVER,
];
