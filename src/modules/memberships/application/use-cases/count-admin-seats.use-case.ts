import { Inject, Injectable } from '@nestjs/common';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';
import { MEMBERSHIP_REPOSITORY } from '@/modules/memberships/domain/tokens/membership-repository.token.js';

/**
 * Cuántos cupos de administrador del plan ocupa un prestamista: administradores activos, la
 * dueña incluida. Lo usa `subscriptions` para mostrar el uso con la misma regla del límite.
 */
@Injectable()
export class CountAdminSeatsUseCase {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly memberships: MembershipRepository,
  ) {}

  /** @param lenderId - El prestamista. */
  async execute(lenderId: string): Promise<number> {
    return await this.memberships.countAdminSeats(lenderId);
  }
}
