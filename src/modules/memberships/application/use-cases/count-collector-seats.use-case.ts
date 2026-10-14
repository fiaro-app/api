import { Inject, Injectable } from '@nestjs/common';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';
import { MEMBERSHIP_REPOSITORY } from '@/modules/memberships/domain/tokens/membership-repository.token.js';

/**
 * Cuántos cupos de cobrador del plan ocupa un prestamista: cobradores activos sin contar al
 * dueño. Lo usa `subscriptions` para mostrar el uso con la misma regla con que se aplica el límite.
 */
@Injectable()
export class CountCollectorSeatsUseCase {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly memberships: MembershipRepository,
  ) {}

  /** @param lenderId - El prestamista. */
  async execute(lenderId: string): Promise<number> {
    return await this.memberships.countCollectorSeats(lenderId);
  }
}
