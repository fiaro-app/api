import { describe, expect, it, vi } from 'vitest';
import { GetPaymentCollectorUseCase } from '@/modules/collections/application/use-cases/get-payment-collector.use-case.js';
import { PaymentNotFoundError } from '@/modules/collections/domain/errors/payment-not-found.error.js';
import type { CollectionVisitRepository } from '@/modules/collections/domain/repositories/collection-visit.repository.js';
import type { PaymentRepository } from '@/modules/collections/domain/repositories/payment.repository.js';

function setup(payment: unknown, record: unknown) {
  const findVisit = vi.fn(() => Promise.resolve(record));
  return {
    useCase: new GetPaymentCollectorUseCase(
      {
        findById: vi.fn(() => Promise.resolve(payment)),
      } as unknown as PaymentRepository,
      { findById: findVisit } as unknown as CollectionVisitRepository,
    ),
    findVisit,
  };
}

describe('GetPaymentCollectorUseCase', () => {
  it('devuelve el cobrador de la visita que generó el pago', async () => {
    const { useCase, findVisit } = setup(
      { visitId: 'v1', loanId: 'l1' },
      { visit: { collectorMembershipId: 'm-ana' } },
    );

    expect(await useCase.execute('p1', 'lender-1')).toEqual({
      collectorMembershipId: 'm-ana',
    });
    expect(findVisit).toHaveBeenCalledWith('v1', 'l1');
  });

  it('un pago que no existe para ese prestamista falla sin buscar la visita', async () => {
    const { useCase, findVisit } = setup(null, null);

    await expect(useCase.execute('p1', 'lender-1')).rejects.toBeInstanceOf(
      PaymentNotFoundError,
    );
    expect(findVisit).not.toHaveBeenCalled();
  });

  it('si la visita ya no está, también falla', async () => {
    const { useCase } = setup({ visitId: 'v1', loanId: 'l1' }, null);

    await expect(useCase.execute('p1', 'lender-1')).rejects.toBeInstanceOf(
      PaymentNotFoundError,
    );
  });
});
