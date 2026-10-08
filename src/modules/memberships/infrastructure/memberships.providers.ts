import type { Provider } from '@nestjs/common';
import { ChangeMembershipRolesUseCase } from '@/modules/memberships/application/use-cases/change-membership-roles.use-case.js';
import { CreateMembershipUseCase } from '@/modules/memberships/application/use-cases/create-membership.use-case.js';
import { DeactivateMembershipUseCase } from '@/modules/memberships/application/use-cases/deactivate-membership.use-case.js';
import { GetMembershipUseCase } from '@/modules/memberships/application/use-cases/get-membership.use-case.js';
import { InviteMembershipUseCase } from '@/modules/memberships/application/use-cases/invite-membership.use-case.js';
import { ListActiveMembershipsByRolesUseCase } from '@/modules/memberships/application/use-cases/list-active-memberships-by-roles.use-case.js';
import { ListMembershipsUseCase } from '@/modules/memberships/application/use-cases/list-memberships.use-case.js';
import { ResetMembershipPasswordUseCase } from '@/modules/memberships/application/use-cases/reset-membership-password.use-case.js';
import { MEMBERSHIP_REPOSITORY } from '@/modules/memberships/domain/tokens/membership-repository.token.js';
import { MembershipLenderScopeResolver } from '@/modules/memberships/infrastructure/http/membership-lender-scope-resolver.js';
import { PrismaMembershipRepository } from '@/modules/memberships/infrastructure/persistence/prisma-membership.repository.js';
import { LENDER_SCOPE_RESOLVER } from '@/shared/application/ports/lender-scope-resolver.token.js';
import { TEMP_PASSWORD_GENERATOR } from '@/shared/application/ports/temp-password-generator.token.js';
import { RandomTempPasswordGenerator } from '@/shared/infrastructure/crypto/random-temp-password-generator.js';

/** Qué implementa cada puerto del módulo. Vive en `infrastructure` y no en `memberships.module.ts`. */
export const membershipsProviders: Provider[] = [
  { provide: MEMBERSHIP_REPOSITORY, useClass: PrismaMembershipRepository },
  {
    provide: LENDER_SCOPE_RESOLVER,
    useClass: MembershipLenderScopeResolver,
  },
  { provide: TEMP_PASSWORD_GENERATOR, useClass: RandomTempPasswordGenerator },
  CreateMembershipUseCase,
  GetMembershipUseCase,
  InviteMembershipUseCase,
  DeactivateMembershipUseCase,
  ChangeMembershipRolesUseCase,
  ListActiveMembershipsByRolesUseCase,
  ListMembershipsUseCase,
  ResetMembershipPasswordUseCase,
];

/**
 * Lo que el módulo ofrece a los demás: el alta y consulta de membresías y, por el puerto
 * compartido, con qué Lender opera una sesión — lo usa `LenderScopeGuard` (`shared/infrastructure`),
 * así que cualquier módulo que proteja una ruta con ese guard debe importar `MembershipsModule`.
 * `GetMembershipUseCase` lo usa `collections` para validar `collectorMembershipId` al asignar un
 * cobrador a un préstamo, y también al darlo de baja (D-97). `ListActiveMembershipsByRolesUseCase`
 * lo usa `notifications` para encontrar a quién avisarle algo del negocio (D-87).
 * `DeactivateMembershipUseCase` lo usa `collections` para la baja en sí, una vez que ya reasignó
 * los préstamos del cobrador: el cambio de estado es el mismo para cualquier membresía, cobrador o
 * no (D-97).
 */
export const membershipsExports = [
  CreateMembershipUseCase,
  GetMembershipUseCase,
  DeactivateMembershipUseCase,
  ListActiveMembershipsByRolesUseCase,
  LENDER_SCOPE_RESOLVER,
];
