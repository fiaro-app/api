import { Inject, Injectable } from '@nestjs/common';
import { CreateLenderUseCase } from '@/modules/lenders/application/use-cases/create-lender.use-case.js';
import { CreateMembershipUseCase } from '@/modules/memberships/application/use-cases/create-membership.use-case.js';
import { StartTrialSubscriptionUseCase } from '@/modules/subscriptions/application/use-cases/start-trial-subscription.use-case.js';
import type {
  CreateTenantInput,
  CreatedTenant,
} from '@/modules/tenants/application/dtos/create-tenant.dto.js';
import { toCreatedTenant } from '@/modules/tenants/application/dtos/created-tenant.mapper.js';
import { validateTenantData } from '@/modules/tenants/application/services/tenant-data.validator.js';
import { Tenant } from '@/modules/tenants/domain/entities/tenant.entity.js';
import type { TenantRepository } from '@/modules/tenants/domain/repositories/tenant.repository.js';
import { TENANT_REPOSITORY } from '@/modules/tenants/domain/tokens/tenant-repository.token.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';
import type { IdGenerator } from '@/shared/application/ports/id-generator.port.js';
import { ID_GENERATOR } from '@/shared/application/ports/id-generator.token.js';

/**
 * Da de alta a un Tenant con su suscripción de prueba (D-115), su primer prestamista y la membresía de dueño de quien lo registra
 * (D-73). Es el único camino para crear uno: no hay registro público todavía
 * (`tenant-lender-membership-scope`), así que lo usa el seed de desarrollo y, más adelante, el
 * registro del Owner.
 *
 * @remarks
 * El Tenant, su suscripción, el Lender y la membresía se crean en escrituras seguidas, no en una
 * transacción atómica: son agregados de módulos distintos (`tenants`, `subscriptions`,
 * `lenders`, `memberships`), y la regla de fronteras del proyecto prohíbe que uno importe el dominio del
 * otro — se componen por la capa de aplicación (`CreateLenderUseCase`, `CreateMembershipUseCase`),
 * nunca por una escritura de Prisma compartida. Riesgo asumido: si el proceso se cae a mitad de
 * camino, queda un Tenant sin Lender o sin membresía de dueño; es una operación de alta rara, no
 * de todos los días, y fácil de detectar después.
 */
@Injectable()
export class CreateTenantUseCase {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
    @Inject(ID_GENERATOR) private readonly ids: IdGenerator,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly startTrialSubscription: StartTrialSubscriptionUseCase,
    private readonly createLender: CreateLenderUseCase,
    private readonly createMembership: CreateMembershipUseCase,
  ) {}

  /**
   * @param input - Nombre del negocio y quién lo registra.
   * @returns El Tenant creado, junto con su primer prestamista y la membresía de dueño.
   * @throws {@link InvalidTenantDataError} Si el nombre del Tenant no cumple el contrato.
   * @throws {@link InvalidLenderDataError} Si el nombre del Lender no cumple el contrato.
   */
  async execute(input: CreateTenantInput): Promise<CreatedTenant> {
    const data = validateTenantData({ name: input.businessName });
    const tenant = Tenant.create({
      id: this.ids.next(),
      name: data.name,
      createdAt: this.clock.now(),
    });
    await this.tenants.create(tenant);
    await this.startTrialSubscription.execute(tenant.id);
    const lender = await this.createLender.execute({
      tenantId: tenant.id,
      name: input.businessName,
    });
    const ownerMembership = await this.createMembership.execute({
      userId: input.ownerUserId,
      lenderId: lender.id,
      roles: ['OWNER', 'LENDER', 'COLLECTOR'],
      portfolioId: lender.defaultPortfolioId,
    });
    return toCreatedTenant(tenant, lender, ownerMembership);
  }
}
