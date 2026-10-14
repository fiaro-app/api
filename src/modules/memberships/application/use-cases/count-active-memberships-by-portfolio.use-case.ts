import { Inject, Injectable } from '@nestjs/common';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';
import { MEMBERSHIP_REPOSITORY } from '@/modules/memberships/domain/tokens/membership-repository.token.js';

/**
 * Cuenta las membresías activas asignadas a una cartera. Lo usa `lenders` para no dejar borrar
 * una cartera que todavía tiene cobradores trabajando en ella, por la capa de aplicación y no por
 * el dominio (regla de fronteras, §3).
 */
@Injectable()
export class CountActiveMembershipsByPortfolioUseCase {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly memberships: MembershipRepository,
  ) {}

  /**
   * @param portfolioId - La cartera.
   * @param lenderId - El prestamista dueño, tal como lo resolvió `LenderScopeGuard`.
   * @returns Cuántas membresías `ACTIVE` la tienen asignada.
   */
  async execute(portfolioId: string, lenderId: string): Promise<number> {
    return await this.memberships.countActiveByPortfolio(portfolioId, lenderId);
  }
}
