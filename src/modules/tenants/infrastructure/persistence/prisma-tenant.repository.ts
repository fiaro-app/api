import { Injectable } from '@nestjs/common';
import type { Tenant } from '@/modules/tenants/domain/entities/tenant.entity.js';
import type { TenantRepository } from '@/modules/tenants/domain/repositories/tenant.repository.js';
import {
  toTenant,
  toTenantCreateInput,
} from '@/modules/tenants/infrastructure/persistence/tenant.mapper.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/** Guarda a los Tenant en PostgreSQL con Prisma. */
@Injectable()
export class PrismaTenantRepository implements TenantRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** @param tenant - Tenant nuevo. */
  async create(tenant: Tenant): Promise<void> {
    await this.prisma.tenant.create({ data: toTenantCreateInput(tenant) });
  }

  /** @param id - Identificador del Tenant. */
  async findById(id: string): Promise<Tenant | null> {
    const row = await this.prisma.tenant.findUnique({ where: { id } });
    return row === null ? null : toTenant(row);
  }

  /** @param name - Nombre del negocio. */
  async findByName(name: string): Promise<Tenant | null> {
    const row = await this.prisma.tenant.findFirst({ where: { name } });
    return row === null ? null : toTenant(row);
  }
}
