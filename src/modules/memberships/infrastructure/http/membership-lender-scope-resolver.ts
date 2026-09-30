import { Inject, Injectable } from '@nestjs/common';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';
import { MEMBERSHIP_REPOSITORY } from '@/modules/memberships/domain/tokens/membership-repository.token.js';
import type {
  LenderScope,
  LenderScopeResolver,
} from '@/shared/application/ports/lender-scope-resolver.port.js';

/**
 * Implementa `LenderScopeResolver` con las membresías de la persona. Vive en `infrastructure`,
 * no en `application`, porque `LenderScopeGuard` (en `shared/infrastructure`) lo inyecta por el
 * puerto compartido, nunca por el dominio de este módulo (regla de fronteras, ARCHITECTURE.md §3).
 */
@Injectable()
export class MembershipLenderScopeResolver implements LenderScopeResolver {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly memberships: MembershipRepository,
  ) {}

  /**
   * @param userId - La persona autenticada.
   * @returns Su membresía activa más antigua, o `null` si no tiene ninguna. Con más de una (varios
   * prestamistas), usa esa por ahora: el producto todavía no define cómo elegir entre varias.
   */
  async resolve(userId: string): Promise<LenderScope | null> {
    const memberships = await this.memberships.findActiveByUserId(userId);
    const membership = memberships[0];
    if (!membership) {
      return null;
    }
    return {
      membershipId: membership.id,
      lenderId: membership.lenderId,
      roles: membership.roles,
    };
  }
}
