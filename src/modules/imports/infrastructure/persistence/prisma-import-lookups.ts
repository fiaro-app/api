import { Injectable } from '@nestjs/common';
import type { ImportLookups } from '@/modules/imports/application/ports/import-lookups.port.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/**
 * {@link ImportLookups} leyendo las tablas de clientes y de membresías.
 *
 * @remarks
 * Lee las tablas directamente, como otros puertos que cruzan módulos (`PrismaPlanSeatLimits`): son dos
 * consultas por petición y evita agregar a `clients` y `memberships` métodos que solo esta función usa.
 */
@Injectable()
export class PrismaImportLookups implements ImportLookups {
  constructor(private readonly prisma: PrismaService) {}

  async existingClients(
    lenderId: string,
    nationalIds: readonly string[],
  ): Promise<ReadonlyMap<string, string>> {
    if (nationalIds.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.client.findMany({
      where: { lenderId, nationalId: { in: [...nationalIds] } },
      select: { id: true, nationalId: true },
    });
    return new Map(rows.map((row) => [row.nationalId, row.id]));
  }

  async activeCollectors(
    lenderId: string,
  ): Promise<ReadonlyMap<string, string>> {
    const rows = await this.prisma.membership.findMany({
      where: { lenderId, status: 'ACTIVE', roles: { has: 'COLLECTOR' } },
      select: { id: true, user: { select: { phone: true } } },
    });
    return new Map(rows.map((row) => [row.user.phone, row.id]));
  }
}
