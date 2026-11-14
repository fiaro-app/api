import { Injectable } from '@nestjs/common';
import { GetPaymentCollectorUseCase } from '@/modules/collections/application/use-cases/get-payment-collector.use-case.js';
import type { AttachmentTarget } from '@/modules/attachments/application/dtos/attachment.dto.js';
import { AttachmentForbiddenError } from '@/modules/attachments/domain/errors/attachment-forbidden.error.js';
import { hasAnyRole } from '@/shared/application/security/has-any-role.js';

const ADMIN_ROLES = ['OWNER', 'LENDER'];

/**
 * Comprueba que el dueño de una foto existe para este prestamista y que la persona de la sesión puede tocarla (D-145):
 * el comprobante de un pago lo ve y lo cambia quien administra o el cobrador que hizo ese cobro, nadie más.
 */
@Injectable()
export class AttachmentOwners {
  constructor(
    private readonly getPaymentCollector: GetPaymentCollectorUseCase,
  ) {}

  /**
   * @param target - La foto y quién la pide.
   * @throws {@link PaymentNotFoundError} Si el pago no es de este prestamista.
   * @throws {@link AttachmentForbiddenError} Si no tiene permiso.
   */
  async assertAccess(target: AttachmentTarget): Promise<void> {
    const { actor, ownerId } = target;
    const admin = hasAnyRole(actor.roles, ADMIN_ROLES);
    const collector = await this.getPaymentCollector.execute(
      ownerId,
      actor.lenderId,
    );
    if (!admin && collector.collectorMembershipId !== actor.membershipId) {
      throw new AttachmentForbiddenError();
    }
  }
}
