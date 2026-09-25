import { describe, expect, it } from 'vitest';
import type { AuditEvent } from '@/shared/domain/audit/audit-event.js';
import {
  toAuditDocument,
  toAuditJobData,
} from '@/shared/infrastructure/audit/audit-document.js';

const event: AuditEvent = {
  action: 'auth.sign_in.succeeded',
  outcome: 'SUCCESS',
  occurredAt: new Date('2026-09-25T10:00:00.000Z'),
  userId: 'u1',
  phone: { last4: '4567', hash: 'a'.repeat(32) },
  requestId: 'req-1',
  ip: '203.0.113.7',
  userAgent: 'Fiaro/1.0',
  details: { mustChangePassword: false },
};

describe('toAuditJobData', () => {
  it('deja el evento como JSON: la fecha pasa a texto ISO 8601', () => {
    const data = toAuditJobData(event);

    expect(data.occurredAt).toBe('2026-09-25T10:00:00.000Z');
    expect(data).toMatchObject({ action: event.action, userId: 'u1' });
  });

  it('sobrevive a un viaje por JSON sin perder nada', () => {
    const traveled = JSON.parse(JSON.stringify(toAuditJobData(event)));

    expect(traveled).toEqual(toAuditJobData(event));
  });
});

describe('toAuditDocument', () => {
  const recordedAt = new Date('2026-09-25T10:00:05.000Z');

  it('usa el id del trabajo como _id y vuelve a poner las fechas como fechas', () => {
    const document = toAuditDocument(
      'job-1',
      toAuditJobData(event),
      recordedAt,
    );

    expect(document).toEqual({
      ...event,
      _id: 'job-1',
      occurredAt: new Date('2026-09-25T10:00:00.000Z'),
      recordedAt,
    });
    expect(document.occurredAt).toBeInstanceOf(Date);
  });

  it('un evento sin datos opcionales no los inventa', () => {
    const document = toAuditDocument(
      'job-2',
      toAuditJobData({
        action: 'auth.sign_out',
        outcome: 'SUCCESS',
        occurredAt: event.occurredAt,
      }),
      recordedAt,
    );

    expect(Object.keys(document).sort()).toEqual([
      '_id',
      'action',
      'occurredAt',
      'outcome',
      'recordedAt',
    ]);
  });
});
