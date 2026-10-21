import { Logger } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { failureIssue } from '@/modules/imports/application/services/import-outcome.js';
import { DomainError } from '@/shared/domain/errors/domain-error.js';

describe('failureIssue', () => {
  it('un error de dominio sale como la clave de su código, con sus parámetros', () => {
    class Boom extends DomainError {
      readonly code = 'PLAN_LIMIT_REACHED';
      readonly errorCode = 'X000A';
      readonly kind = 'FORBIDDEN' as const;
      constructor() {
        super('boom', { params: { maxActiveLoans: 3 } });
      }
    }

    expect(failureIssue(new Boom(), new Logger(), 4)).toEqual({
      field: 'row',
      message: 'errors.PLAN_LIMIT_REACHED',
      params: { maxActiveLoans: 3 },
    });
  });

  it('un error inesperado se registra y sale con un texto genérico', () => {
    const logger = new Logger();
    const spy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    const issue = failureIssue(new Error('db caída'), logger, 7);

    expect(issue.message).toContain('Inténtalo de nuevo');
    expect(spy).toHaveBeenCalledOnce();
  });
});
