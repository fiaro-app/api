import { NotFoundException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { CollectorAccess } from '@/shared/application/ports/collector-access.port.js';
import type { LenderScope } from '@/shared/application/ports/lender-scope-resolver.port.js';
import {
  CollectorAccessGuard,
  type CollectorRestriction,
} from '@/shared/infrastructure/http/collector-access.guard.js';
import { setLenderScope } from '@/shared/infrastructure/http/lender-scope-request.js';

const COLLECTOR: LenderScope = {
  membershipId: 'membership-1',
  lenderId: 'lender-1',
  roles: ['COLLECTOR'],
};

function setup(options: {
  kind?: CollectorRestriction;
  scope?: LenderScope;
  allowed?: boolean;
  params?: Record<string, string>;
}) {
  const canAccessLoan = vi.fn(() => Promise.resolve(options.allowed ?? false));
  const canAccessClient = vi.fn(() =>
    Promise.resolve(options.allowed ?? false),
  );
  const access: CollectorAccess = { canAccessLoan, canAccessClient };
  const reflector = {
    get: vi.fn(() => options.kind),
  } as unknown as Reflector;
  const request = {
    params: options.params ?? { id: 'x' },
  } as unknown as Request;
  if (options.scope) {
    setLenderScope(request, options.scope);
  }
  const context = {
    getHandler: () => undefined,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return {
    guard: new CollectorAccessGuard(reflector, access),
    context,
    canAccessLoan,
    canAccessClient,
  };
}

describe('CollectorAccessGuard', () => {
  it('un cobrador con el préstamo asignado pasa', async () => {
    const { guard, context, canAccessLoan } = setup({
      kind: 'loan',
      scope: COLLECTOR,
      allowed: true,
      params: { loanId: 'loan-1' },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(canAccessLoan).toHaveBeenCalledWith('membership-1', 'loan-1');
  });

  it('un cobrador sin ese préstamo recibe 404, no 403', async () => {
    const { guard, context } = setup({
      kind: 'loan',
      scope: COLLECTOR,
      allowed: false,
      params: { id: 'loan-9' },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('para un cliente consulta el acceso al cliente', async () => {
    const { guard, context, canAccessClient } = setup({
      kind: 'client',
      scope: COLLECTOR,
      allowed: true,
      params: { id: 'client-1' },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(canAccessClient).toHaveBeenCalledWith('membership-1', 'client-1');
  });

  it('quien administra pasa sin consultar nada', async () => {
    const { guard, context, canAccessLoan } = setup({
      kind: 'loan',
      scope: { ...COLLECTOR, roles: ['COLLECTOR', 'LENDER'] },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(canAccessLoan).not.toHaveBeenCalled();
  });

  it('sin el decorador o sin LenderScopeGuard es un error de programación', async () => {
    const noKind = setup({ scope: COLLECTOR });
    await expect(noKind.guard.canActivate(noKind.context)).rejects.toThrow(
      /@RestrictCollectorTo/,
    );
    const noScope = setup({ kind: 'loan' });
    await expect(noScope.guard.canActivate(noScope.context)).rejects.toThrow(
      /LenderScopeGuard/,
    );
  });
});
