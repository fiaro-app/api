import { describe, expect, it, vi } from 'vitest';
import { CountLendersByTenantUseCase } from '@/modules/lenders/application/use-cases/count-lenders-by-tenant.use-case.js';
import type { LenderRepository } from '@/modules/lenders/domain/repositories/lender.repository.js';

describe('CountLendersByTenantUseCase', () => {
  it('devuelve cuántos prestamistas tiene el Tenant', async () => {
    const countByTenant = vi.fn(() => Promise.resolve(3));
    const lenders: LenderRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      countByTenant,
      update: vi.fn(),
    };

    const total = await new CountLendersByTenantUseCase(lenders).execute(
      'tenant-1',
    );

    expect(total).toBe(3);
    expect(countByTenant).toHaveBeenCalledExactlyOnceWith('tenant-1');
  });
});
