import { Inject, Injectable } from '@nestjs/common';
import type {
  ListMembershipsInput,
  MembershipsPageResult,
} from '@/modules/memberships/application/dtos/membership-list-entry.dto.js';
import { MembershipEntryAssembler } from '@/modules/memberships/application/services/membership-entry.assembler.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';
import { MEMBERSHIP_REPOSITORY } from '@/modules/memberships/domain/tokens/membership-repository.token.js';

/**
 * Lista, paginados, los colaboradores (cobradores y prestamistas) del prestamista de la sesión
 * (D-92), con el nombre y el celular de cada uno — sin eso, la lista solo tendría ids.
 *
 * @remarks
 * Une cada membresía de la página con su persona a través de {@link MembershipEntryAssembler}
 * (`GetUserByIdUseCase` de `auth`), en paralelo (`Promise.all`): a esta escala (un puñado de
 * colaboradores por negocio) no hace falta una consulta masiva, y evita que `memberships` dependa
 * del esquema de `auth` más allá de su caso de uso ya publicado.
 */
@Injectable()
export class ListMembershipsUseCase {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly memberships: MembershipRepository,
    private readonly assembler: MembershipEntryAssembler,
  ) {}

  /** @param input - El prestamista dueño, la paginación y los filtros opcionales. */
  async execute(input: ListMembershipsInput): Promise<MembershipsPageResult> {
    const page = await this.memberships.list(input);
    const items = await Promise.all(
      page.items.map((membership) => this.assembler.assemble(membership)),
    );
    return { items, total: page.total };
  }
}
