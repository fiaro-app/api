import { Inject, Injectable } from '@nestjs/common';
import type { MembershipListEntry } from '@/modules/memberships/application/dtos/membership-list-entry.dto.js';
import { MembershipEntryAssembler } from '@/modules/memberships/application/services/membership-entry.assembler.js';
import { MembershipNotFoundError } from '@/modules/memberships/domain/errors/membership-not-found.error.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';
import { MEMBERSHIP_REPOSITORY } from '@/modules/memberships/domain/tokens/membership-repository.token.js';

/**
 * Consulta un colaborador del prestamista de la sesión con su nombre y celular: el detalle de un
 * colaborador, con la misma forma que cada fila del listado (D-92). Distinto de
 * {@link GetMembershipUseCase}, que devuelve solo la membresía y es el que usan los demás módulos.
 */
@Injectable()
export class GetMembershipEntryUseCase {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly memberships: MembershipRepository,
    private readonly assembler: MembershipEntryAssembler,
  ) {}

  /**
   * @param id - La membresía.
   * @param lenderId - El prestamista dueño, tal como lo resolvió `LenderScopeGuard`.
   * @returns La membresía con el nombre y el celular de quien la tiene.
   * @throws {@link MembershipNotFoundError} Si no existe, o es de otro prestamista.
   */
  async execute(id: string, lenderId: string): Promise<MembershipListEntry> {
    const membership = await this.memberships.findById(id, lenderId);
    if (membership === null) {
      throw new MembershipNotFoundError(id);
    }
    return await this.assembler.assemble(membership);
  }
}
