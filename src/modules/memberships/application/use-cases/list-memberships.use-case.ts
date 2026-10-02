import { Inject, Injectable } from '@nestjs/common';
import { GetUserByIdUseCase } from '@/modules/auth/application/use-cases/get-user-by-id.use-case.js';
import { toMembershipDetails } from '@/modules/memberships/application/dtos/membership-details.mapper.js';
import type {
  ListMembershipsInput,
  MembershipListEntry,
  MembershipsPageResult,
} from '@/modules/memberships/application/dtos/membership-list-entry.dto.js';
import type { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';
import { MEMBERSHIP_REPOSITORY } from '@/modules/memberships/domain/tokens/membership-repository.token.js';

/**
 * Lista, paginados, los colaboradores (cobradores y prestamistas) del prestamista de la sesión
 * (D-92), con el nombre y el celular de cada uno — sin eso, la lista solo tendría ids.
 *
 * @remarks
 * Compone `GetUserByIdUseCase` (`auth/application`) una vez por membresía de la página, en
 * paralelo (`Promise.all`): a esta escala (un puñado de colaboradores por negocio) no hace falta
 * una consulta masiva, y evita que `memberships` dependa del esquema de `auth` más allá de su
 * caso de uso ya publicado.
 */
@Injectable()
export class ListMembershipsUseCase {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly memberships: MembershipRepository,
    private readonly getUserById: GetUserByIdUseCase,
  ) {}

  /** @param input - El prestamista dueño, la paginación y los filtros opcionales. */
  async execute(input: ListMembershipsInput): Promise<MembershipsPageResult> {
    const page = await this.memberships.list(input);
    const items = await Promise.all(page.items.map((m) => this.toEntry(m)));
    return { items, total: page.total };
  }

  /**
   * @remarks
   * `userId` es una llave foránea obligatoria (`onDelete: Cascade`, `memberships.prisma`): una
   * membresía nunca sobrevive a que se borre su persona, así que `user` nulo aquí sería una
   * corrupción de datos, no un caso de negocio — por eso truena en vez de mostrar un nombre vacío.
   */
  private async toEntry(membership: Membership): Promise<MembershipListEntry> {
    const user = await this.getUserById.execute(membership.userId);
    if (user === null) {
      throw new Error(
        `Membresía ${membership.id} sin persona (userId ${membership.userId}).`,
      );
    }
    return {
      ...toMembershipDetails(membership),
      fullName: user.fullName,
      phone: user.phone,
    };
  }
}
