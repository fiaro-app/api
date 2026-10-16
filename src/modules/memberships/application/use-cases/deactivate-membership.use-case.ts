import { Inject, Injectable } from '@nestjs/common';
import type { MembershipDetails } from '@/modules/memberships/application/dtos/membership-details.dto.js';
import { toMembershipDetails } from '@/modules/memberships/application/dtos/membership-details.mapper.js';
import { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';
import { assertNotOwner } from '@/modules/memberships/application/services/assert-not-owner.js';
import { MembershipNotFoundError } from '@/modules/memberships/domain/errors/membership-not-found.error.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';
import { MEMBERSHIP_REPOSITORY } from '@/modules/memberships/domain/tokens/membership-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/**
 * Quita el acceso de un colaborador al prestamista de la sesión, sin borrar su historial
 * (`status: 'INACTIVE'`, PRODUCT.md §6: "baja lógica").
 *
 * @remarks
 * Idempotente: si ya estaba `INACTIVE`, no vuelve a tocar `deactivatedAt` ni escribe nada,
 * simplemente devuelve la membresía tal como está — desactivar dos veces no es un error, es la
 * misma operación con el mismo resultado. No sabe nada de `CollectionAssignment` ni reasigna
 * préstamos: eso es cosa de `collections` (`DeactivateCollectorUseCase`, D-97), que primero
 * reasigna y solo después llama aquí. Por eso `POST /memberships/:id/deactivate` rechaza una
 * membresía con el rol `COLLECTOR` (`MembershipController`, 400): dejarla pasar por aquí
 * directamente dejaría sus préstamos sin cobrador. El controller (no este caso de uso) también
 * impide que una sesión se desactive a sí misma.
 */
@Injectable()
export class DeactivateMembershipUseCase {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly memberships: MembershipRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param id - La membresía.
   * @param lenderId - El prestamista dueño, resuelto por `LenderScopeGuard`.
   * @returns La membresía, ya `INACTIVE`.
   * @throws {@link MembershipNotFoundError} Si no existe o es de otro prestamista.
   * @throws {@link InvalidMembershipDataError} Si es la membresía del dueño.
   */
  async execute(id: string, lenderId: string): Promise<MembershipDetails> {
    const current = await this.memberships.findById(id, lenderId);
    if (current === null) {
      throw new MembershipNotFoundError(id);
    }
    assertNotOwner(current.roles, 'desactivar');
    if (current.status === 'INACTIVE') {
      return toMembershipDetails(current);
    }

    const deactivated = Membership.create({
      id: current.id,
      userId: current.userId,
      lenderId: current.lenderId,
      roles: current.roles,
      status: 'INACTIVE',
      portfolioId: current.portfolioId,
      createdAt: current.createdAt,
      deactivatedAt: this.clock.now(),
    });
    await this.memberships.update(deactivated);
    return toMembershipDetails(deactivated);
  }
}
