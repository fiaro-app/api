import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AuditEvent } from '@/shared/domain/audit/audit-event.js';
import { PinoAuditLog } from '@/shared/infrastructure/audit/pino-audit-log.js';

const event: AuditEvent = {
  action: 'auth.sign_in.failed',
  outcome: 'FAILURE',
  occurredAt: new Date('2026-09-25T10:00:00.000Z'),
  phone: { last4: '4567', hash: 'a'.repeat(32) },
  reason: 'INVALID_PHONE_NUMBER_OR_PASSWORD',
  requestId: 'req-1',
  ip: '203.0.113.7',
  userAgent: 'Fiaro/1.0',
};

describe('PinoAuditLog', () => {
  const written = vi
    .spyOn(Logger.prototype, 'log')
    .mockImplementation(() => undefined);

  afterEach(() => {
    written.mockClear();
  });

  it('escribe el evento como una línea de log marcada con audit: true', () => {
    new PinoAuditLog().record(event);

    expect(written).toHaveBeenCalledExactlyOnceWith({
      msg: 'auth.sign_in.failed',
      audit: true,
      event: 'auth.sign_in.failed',
      outcome: 'FAILURE',
      occurredAt: '2026-09-25T10:00:00.000Z',
      phone: { last4: '4567', hash: 'a'.repeat(32) },
      reason: 'INVALID_PHONE_NUMBER_OR_PASSWORD',
      requestId: 'req-1',
      ip: '203.0.113.7',
      userAgent: 'Fiaro/1.0',
    });
  });

  it('un evento sin datos opcionales no los inventa', () => {
    new PinoAuditLog().record({
      action: 'auth.sign_out',
      outcome: 'SUCCESS',
      occurredAt: new Date('2026-09-25T10:00:00.000Z'),
    });

    expect(written).toHaveBeenCalledExactlyOnceWith({
      msg: 'auth.sign_out',
      audit: true,
      event: 'auth.sign_out',
      outcome: 'SUCCESS',
      occurredAt: '2026-09-25T10:00:00.000Z',
    });
  });
});
