import { Injectable } from '@nestjs/common';
import type {
  TenantOwner,
  TenantOwners,
} from '@/modules/subscriptions/application/ports/tenant-owners.port.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/**
 * {@link TenantOwners} leyendo las membresías `OWNER` activas de los prestamistas del negocio.
 *
 * @remarks
 * Lee la tabla directamente en lugar de pasar por `memberships/application`, como el resto de los
 * puertos de este módulo que cruzan tablas (`PrismaPlanSeatLimits`): una consulta, sin ciclos.
 */
@Injectable()
export class PrismaTenantOwners implements TenantOwners {
  constructor(private readonly prisma: PrismaService) {}

  async ownersOf(tenantId: string): Promise<readonly TenantOwner[]> {
    const rows = await this.prisma.membership.findMany({
      where: {
        status: 'ACTIVE',
        roles: { has: 'OWNER' },
        lender: { tenantId },
      },
      select: { userId: true, lenderId: true },
    });
    return rows;
  }
}
