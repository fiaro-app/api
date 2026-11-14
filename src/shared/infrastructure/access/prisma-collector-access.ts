import { Injectable } from '@nestjs/common';
import type { CollectorAccess } from '@/shared/application/ports/collector-access.port.js';
import { PrismaService } from '@/shared/infrastructure/persistence/prisma.service.js';

/**
 * {@link CollectorAccess} sobre las asignaciones. Se queda con el historial completo (vigentes y
 * ya cerradas): un cobrador sigue pudiendo ver lo que cobró aunque el préstamo se reasigne.
 *
 * @remarks
 * Un id que no es UUID no llega aquí: la validación del parámetro lo rechaza antes. El guard que
 * lo usa corre después de `LenderScopeGuard`, y el caso de uso de cada ruta vuelve a filtrar por
 * prestamista, así que esto solo agrega la restricción por cobrador.
 */
@Injectable()
export class PrismaCollectorAccess implements CollectorAccess {
  constructor(private readonly prisma: PrismaService) {}

  async canAccessLoan(
    collectorMembershipId: string,
    loanId: string,
  ): Promise<boolean> {
    const found = await this.prisma.collectionAssignment.findFirst({
      where: { collectorMembershipId, loanId },
      select: { id: true },
    });
    return found !== null;
  }

  async canAccessClient(
    collectorMembershipId: string,
    clientId: string,
  ): Promise<boolean> {
    const found = await this.prisma.collectionAssignment.findFirst({
      where: { collectorMembershipId, loan: { clientId } },
      select: { id: true },
    });
    return found !== null;
  }
}
