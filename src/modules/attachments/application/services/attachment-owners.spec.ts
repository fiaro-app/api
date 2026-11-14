import { describe, expect, it, vi } from 'vitest';
import { AttachmentOwners } from '@/modules/attachments/application/services/attachment-owners.js';
import { AttachmentForbiddenError } from '@/modules/attachments/domain/errors/attachment-forbidden.error.js';
import type { GetPaymentCollectorUseCase } from '@/modules/collections/application/use-cases/get-payment-collector.use-case.js';

const actor = (roles: string[], membershipId = 'm-ana') => ({
  lenderId: 'lender-1',
  membershipId,
  roles,
});

function setup() {
  const getPaymentCollector = {
    execute: vi.fn(() => Promise.resolve({ collectorMembershipId: 'm-ana' })),
  };
  return {
    owners: new AttachmentOwners(
      getPaymentCollector as unknown as GetPaymentCollectorUseCase,
    ),
    getPaymentCollector,
  };
}

describe('AttachmentOwners', () => {
  it('el comprobante de un pago lo toca quien administra o el cobrador de ese cobro', async () => {
    const { owners, getPaymentCollector } = setup();

    await owners.assertAccess({
      kind: 'PAYMENT_PROOF',
      ownerId: 'p1',
      actor: actor(['OWNER']),
    });
    await owners.assertAccess({
      kind: 'PAYMENT_PROOF',
      ownerId: 'p1',
      actor: actor(['COLLECTOR'], 'm-ana'),
    });

    expect(getPaymentCollector.execute).toHaveBeenCalledWith('p1', 'lender-1');
  });

  it('otro cobrador no toca el comprobante de un cobro ajeno', async () => {
    const { owners } = setup();

    await expect(
      owners.assertAccess({
        kind: 'PAYMENT_PROOF',
        ownerId: 'p1',
        actor: actor(['COLLECTOR'], 'm-luis'),
      }),
    ).rejects.toBeInstanceOf(AttachmentForbiddenError);
  });
});
