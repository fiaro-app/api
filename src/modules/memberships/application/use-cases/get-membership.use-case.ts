import { Inject, Injectable } from '@nestjs/common';
import type { MembershipDetails } from '@/modules/memberships/application/dtos/membership-details.dto.js';
import { toMembershipDetails } from '@/modules/memberships/application/dtos/membership-details.mapper.js';
import { MembershipNotFoundError } from '@/modules/memberships/domain/errors/membership-not-found.error.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';
import { MEMBERSHIP_REPOSITORY } from '@/modules/memberships/domain/tokens/membership-repository.token.js';

/**
 * Consulta una membresía del prestamista de la sesión. Lo usan otros módulos (`collections`,
 * para validar que `collectorMembershipId` exista y sea del mismo prestamista al asignar un
 * cobrador a un préstamo) por la capa de aplicación, no el dominio (regla de fronteras, §3).
 */
@Injectable()
export class GetMembershipUseCase {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly memberships: MembershipRepository,
  ) {}

  /**
   * @param id - La membresía.
   * @param lenderId - El prestamista dueño, tal como lo resolvió `LenderScopeGuard`.
   * @returns Sus datos públicos.
   * @throws {@link MembershipNotFoundError} Si no existe, o es de otro prestamista.
   */
  async execute(id: string, lenderId: string): Promise<MembershipDetails> {
    const membership = await this.memberships.findById(id, lenderId);
    if (membership === null) {
      throw new MembershipNotFoundError(id);
    }
    return toMembershipDetails(membership);
  }
}
