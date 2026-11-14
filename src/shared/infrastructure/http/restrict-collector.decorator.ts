import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import {
  COLLECTOR_RESTRICTION,
  CollectorAccessGuard,
  type CollectorRestriction,
} from '@/shared/infrastructure/http/collector-access.guard.js';

/**
 * Marca una ruta (`:loanId`/`:id` de un préstamo, o `:id` de un cliente) para que un cobrador que
 * no administra solo la alcance si tiene o tuvo asignado ese préstamo o un préstamo de ese cliente.
 * Va en el handler, y el controller ya debe tener `LenderScopeGuard`.
 *
 * @param kind - Si el id de la ruta es de un préstamo o de un cliente.
 */
export function RestrictCollectorTo(kind: CollectorRestriction) {
  return applyDecorators(
    SetMetadata(COLLECTOR_RESTRICTION, kind),
    UseGuards(CollectorAccessGuard),
  );
}
