import { Inject, Injectable } from '@nestjs/common';
import type { LenderRepository } from '@/modules/lenders/domain/repositories/lender.repository.js';
import { LENDER_REPOSITORY } from '@/modules/lenders/domain/tokens/lender-repository.token.js';

/**
 * Cuenta los prestamistas de un Tenant. Lo usa `subscriptions` para mostrar cuánto del límite de
 * su plan usa el negocio, por la capa de aplicación y no por el dominio (regla de fronteras, §3).
 */
@Injectable()
export class CountLendersByTenantUseCase {
  constructor(
    @Inject(LENDER_REPOSITORY) private readonly lenders: LenderRepository,
  ) {}

  /** @param tenantId - El Tenant. */
  async execute(tenantId: string): Promise<number> {
    return await this.lenders.countByTenant(tenantId);
  }
}
