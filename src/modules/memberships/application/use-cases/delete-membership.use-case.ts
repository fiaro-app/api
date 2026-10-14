import { Inject, Injectable } from '@nestjs/common';
import { CollectorHasHistoryError } from '@/modules/memberships/domain/errors/collector-has-history.error.js';
import { InvalidMembershipDataError } from '@/modules/memberships/domain/errors/invalid-membership-data.error.js';
import { MembershipNotFoundError } from '@/modules/memberships/domain/errors/membership-not-found.error.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';
import { MEMBERSHIP_REPOSITORY } from '@/modules/memberships/domain/tokens/membership-repository.token.js';

/**
 * Borra de verdad una membresía registrada por error: solo si nunca tuvo asignaciones de cobro,
 * visitas ni cuadres. Con historial se da de baja (`POST /collectors/:id/deactivate`), que lo
 * conserva. La cuenta de la persona no se toca: puede trabajar para otro negocio (D-74).
 */
@Injectable()
export class DeleteMembershipUseCase {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly memberships: MembershipRepository,
  ) {}

  /**
   * @param id - La membresía.
   * @param lenderId - El prestamista dueño, resuelto por `LenderScopeGuard`.
   * @throws {@link MembershipNotFoundError} Si no existe o es de otro prestamista.
   * @throws {@link InvalidMembershipDataError} Si es la del dueño del negocio.
   * @throws {@link CollectorHasHistoryError} Si tiene historial.
   */
  async execute(id: string, lenderId: string): Promise<void> {
    const current = await this.memberships.findById(id, lenderId);
    if (current === null) {
      throw new MembershipNotFoundError(id);
    }
    if (current.roles.includes('OWNER')) {
      throw new InvalidMembershipDataError([
        {
          path: ['id'],
          message: 'La membresía del dueño del negocio no se puede borrar.',
          params: {},
        },
      ]);
    }
    if (await this.memberships.hasHistory(id)) {
      throw new CollectorHasHistoryError();
    }
    await this.memberships.delete(id, lenderId);
  }
}
