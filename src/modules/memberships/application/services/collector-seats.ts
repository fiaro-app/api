import { Inject, Injectable } from '@nestjs/common';
import type { CollectorSeatLimit } from '@/modules/memberships/application/ports/collector-seat-limit.port.js';
import { COLLECTOR_SEAT_LIMIT } from '@/modules/memberships/application/ports/collector-seat-limit.token.js';
import type { Role } from '@/modules/memberships/domain/entities/role.js';
import { CollectorLimitReachedError } from '@/modules/memberships/domain/errors/collector-limit-reached.error.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';
import { MEMBERSHIP_REPOSITORY } from '@/modules/memberships/domain/tokens/membership-repository.token.js';

/**
 * Si unos roles ocupan un cupo de cobrador del plan: tienen `COLLECTOR` y no `OWNER` (el dueño,
 * que nace con los tres roles, no ocupa cupo).
 *
 * @param roles - Los roles de una membresía activa.
 */
export function occupiesCollectorSeat(roles: readonly Role[]): boolean {
  return roles.includes('COLLECTOR') && !roles.includes('OWNER');
}

/**
 * Aplica el límite de cobradores del plan (D-115). Quien lo llame debe hacerlo con el
 * `LenderLock` del prestamista tomado: contar y después crear no es atómico.
 */
@Injectable()
export class CollectorSeats {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly memberships: MembershipRepository,
    @Inject(COLLECTOR_SEAT_LIMIT) private readonly limit: CollectorSeatLimit,
  ) {}

  /**
   * @param lenderId - El prestamista que va a sumar un cobrador activo.
   * @throws {@link CollectorLimitReachedError} Si ya usa todos los cupos de su plan.
   */
  async assertAvailable(lenderId: string): Promise<void> {
    const max = await this.limit.maxCollectors(lenderId);
    if (max === null) {
      return;
    }
    if ((await this.memberships.countCollectorSeats(lenderId)) >= max) {
      throw new CollectorLimitReachedError(max);
    }
  }
}
