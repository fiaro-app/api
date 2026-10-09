import { Injectable } from '@nestjs/common';
import { GetUserByIdUseCase } from '@/modules/auth/application/use-cases/get-user-by-id.use-case.js';
import { toMembershipDetails } from '@/modules/memberships/application/dtos/membership-details.mapper.js';
import type { MembershipListEntry } from '@/modules/memberships/application/dtos/membership-list-entry.dto.js';
import type { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';

/**
 * Une una membresía con el nombre y el celular de su persona, que viven en `auth`. Lo comparten
 * el listado y el detalle de colaboradores, para que ambos devuelvan exactamente la misma forma.
 */
@Injectable()
export class MembershipEntryAssembler {
  constructor(private readonly getUserById: GetUserByIdUseCase) {}

  /**
   * @remarks
   * `userId` es una llave foránea obligatoria (`onDelete: Cascade`, `memberships.prisma`): una
   * membresía nunca sobrevive a que se borre su persona, así que `user` nulo aquí sería una
   * corrupción de datos, no un caso de negocio — por eso truena en vez de mostrar un nombre vacío.
   *
   * @param membership - La membresía.
   * @returns La membresía con el nombre y el celular de quien la tiene.
   */
  async assemble(membership: Membership): Promise<MembershipListEntry> {
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
