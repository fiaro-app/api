import { describe, expect, it, vi } from 'vitest';
import { AttachmentOwners } from '@/modules/attachments/application/services/attachment-owners.js';
import { AttachmentForbiddenError } from '@/modules/attachments/domain/errors/attachment-forbidden.error.js';
import type { GetClientUseCase } from '@/modules/clients/application/use-cases/get-client.use-case.js';
import type { GetPaymentCollectorUseCase } from '@/modules/collections/application/use-cases/get-payment-collector.use-case.js';

const actor = (roles: string[], membershipId = 'm-ana') => ({
  lenderId: 'lender-1',
  membershipId,
  roles,
});

function setup() {
  const getClient = { execute: vi.fn(() => Promise.resolve({})) };
  const getPaymentCollector = {
    execute: vi.fn(() => Promise.resolve({ collectorMembershipId: 'm-ana' })),
  };
  return {
    owners: new AttachmentOwners(
      getClient as unknown as GetClientUseCase,
      getPaymentCollector as unknown as GetPaymentCollectorUseCase,
    ),
    getClient,
    getPaymentCollector,
  };
}

describe('AttachmentOwners', () => {
  it('la foto de un cliente la cambian quienes administran y la ve cualquiera que pueda ver al cliente', async () => {
    const { owners, getClient } = setup();

    await owners.assertAccess(
      { kind: 'CLIENT_PHOTO', ownerId: 'c1', actor: actor(['LENDER']) },
      true,
    );
    await owners.assertAccess(
      { kind: 'CLIENT_PHOTO', ownerId: 'c1', actor: actor(['COLLECTOR']) },
      false,
    );

    expect(getClient.execute).toHaveBeenCalledWith('c1', 'lender-1');
    await expect(
      owners.assertAccess(
        { kind: 'CLIENT_PHOTO', ownerId: 'c1', actor: actor(['COLLECTOR']) },
        true,
      ),
    ).rejects.toBeInstanceOf(AttachmentForbiddenError);
  });

  it('el comprobante de un pago lo toca quien administra o el cobrador de ese cobro', async () => {
    const { owners, getPaymentCollector } = setup();

    await owners.assertAccess(
      { kind: 'PAYMENT_PROOF', ownerId: 'p1', actor: actor(['OWNER']) },
      true,
    );
    await owners.assertAccess(
      {
        kind: 'PAYMENT_PROOF',
        ownerId: 'p1',
        actor: actor(['COLLECTOR'], 'm-ana'),
      },
      true,
    );

    expect(getPaymentCollector.execute).toHaveBeenCalledWith('p1', 'lender-1');
  });

  it('otro cobrador no toca el comprobante de un cobro ajeno', async () => {
    const { owners } = setup();

    await expect(
      owners.assertAccess(
        {
          kind: 'PAYMENT_PROOF',
          ownerId: 'p1',
          actor: actor(['COLLECTOR'], 'm-luis'),
        },
        false,
      ),
    ).rejects.toBeInstanceOf(AttachmentForbiddenError);
  });
});
