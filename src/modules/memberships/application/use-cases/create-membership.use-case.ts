import { Inject, Injectable } from '@nestjs/common';
import type {
  CreateMembershipInput,
  CreatedMembership,
} from '@/modules/memberships/application/dtos/create-membership.dto.js';
import { toCreatedMembership } from '@/modules/memberships/application/dtos/created-membership.mapper.js';
import { Membership } from '@/modules/memberships/domain/entities/membership.entity.js';
import type { MembershipRepository } from '@/modules/memberships/domain/repositories/membership.repository.js';
import { MEMBERSHIP_REPOSITORY } from '@/modules/memberships/domain/tokens/membership-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';

/**
 * Da de alta la membresía de una persona con un prestamista, siempre `ACTIVE` y sin desactivar.
 *
 * @remarks
 * No valida todavía que `roles` traiga al menos uno ni que `portfolioId` venga cuando incluye
 * `COLLECTOR` (PRODUCT.md §5): hoy el único invocador (`CreateTenantUseCase`, la membresía del
 * dueño al registrar el negocio) siempre manda los tres roles con la cartera recién creada, así
 * que esa regla no la puede romper nadie todavía. Cuando exista una ruta o un caso de uso que
 * reciba `roles`/`portfolioId` de afuera (invitar a un cobrador, por ejemplo), esta validación
 * hay que agregarla ahí.
 */
@Injectable()
export class CreateMembershipUseCase {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly memberships: MembershipRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * @param input - La persona, el prestamista, sus roles y, si tiene `COLLECTOR`, su cartera.
   * @returns La membresía creada.
   */
  async execute(input: CreateMembershipInput): Promise<CreatedMembership> {
    const membership = Membership.create({
      id: this.ids.next(),
      userId: input.userId,
      lenderId: input.lenderId,
      roles: input.roles,
      status: 'ACTIVE',
      portfolioId: input.portfolioId ?? null,
      createdAt: this.clock.now(),
      deactivatedAt: null,
    });
    await this.memberships.create(membership);
    return toCreatedMembership(membership);
  }
}
