import { Inject, Injectable } from '@nestjs/common';
import type { PlanSeatLimits } from '@/modules/memberships/application/ports/plan-seat-limits.port.js';
import { PLAN_SEAT_LIMITS } from '@/modules/memberships/application/ports/plan-seat-limits.token.js';
import type { Role } from '@/modules/memberships/domain/entities/role.js';
import { AdminLimitReachedError } from '@/modules/memberships/domain/errors/admin-limit-reached.error.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';
import { MEMBERSHIP_REPOSITORY } from '@/modules/memberships/domain/tokens/membership-repository.token.js';

/**
 * Si unos roles ocupan un cupo de administrador del plan: tienen `LENDER` u `OWNER`. A diferencia
 * del cobrador, la dueña sí cuenta: el «1 administrador» de Individual es ella misma.
 *
 * @param roles - Los roles de una membresía activa.
 */
export function occupiesAdminSeat(roles: readonly Role[]): boolean {
  return roles.includes('LENDER') || roles.includes('OWNER');
}

/**
 * Aplica el límite de administradores del plan (D-145). Quien lo llame debe hacerlo con el
 * `LenderLock` del prestamista tomado: contar y después crear no es atómico.
 */
@Injectable()
export class AdminSeats {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly memberships: MembershipRepository,
    @Inject(PLAN_SEAT_LIMITS) private readonly limits: PlanSeatLimits,
  ) {}

  /**
   * @param lenderId - El prestamista que va a sumar un administrador activo.
   * @throws {@link AdminLimitReachedError} Si ya usa todos los cupos de su plan.
   */
  async assertAvailable(lenderId: string): Promise<void> {
    const max = await this.limits.maxAdmins(lenderId);
    if (max === null) {
      return;
    }
    if ((await this.memberships.countAdminSeats(lenderId)) >= max) {
      throw new AdminLimitReachedError(max);
    }
  }
}
