import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuditLog } from '@/shared/application/audit/audit-log.port.js';
import type { AuditEvent } from '@/shared/domain/audit/audit-event.js';
import { CompositeAuditLog } from '@/shared/infrastructure/audit/composite-audit-log.js';

const event: AuditEvent = {
  action: 'auth.sign_out',
  outcome: 'SUCCESS',
  occurredAt: new Date('2026-09-25T10:00:00.000Z'),
};

describe('CompositeAuditLog', () => {
  const written = vi
    .spyOn(Logger.prototype, 'error')
    .mockImplementation(() => undefined);

  afterEach(() => {
    written.mockClear();
  });

  it('entrega el evento a cada destino, en orden', () => {
    const calls: string[] = [];
    const log = (name: string): AuditLog => ({
      record: () => calls.push(name),
    });

    new CompositeAuditLog([log('log'), log('cola')]).record(event);

    expect(calls).toEqual(['log', 'cola']);
  });

  it('si un destino lanza, los demás reciben el evento igual y el error queda en el log', () => {
    const after = vi.fn();
    const broken: AuditLog = {
      record: () => {
        throw new Error('se cayó');
      },
    };

    new CompositeAuditLog([broken, { record: after }]).record(event);

    expect(after).toHaveBeenCalledExactlyOnceWith(event);
    expect(written).toHaveBeenCalledExactlyOnceWith(
      'Un destino de la auditoría falló con auth.sign_out: se cayó.',
    );
  });

  it('un error que no es un Error también se escribe', () => {
    const notAnError = 'texto' as unknown as Error;
    const broken: AuditLog = {
      record: () => {
        throw notAnError;
      },
    };

    new CompositeAuditLog([broken]).record(event);

    expect(String(written.mock.calls[0]?.[0])).toContain('error desconocido');
  });

  it('sin destinos no hace nada', () => {
    expect(() => {
      new CompositeAuditLog([]).record(event);
    }).not.toThrow();
  });
});
