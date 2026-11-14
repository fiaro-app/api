import { describe, expect, it } from 'vitest';
import { Notification } from '@/modules/notifications/domain/entities/notification.entity.js';
import type { NotificationSeverity } from '@/modules/notifications/domain/entities/notification-severity.js';
import { pushMessageFor } from '@/modules/notifications/domain/push-message.js';
import {
  clampPushText,
  PUSH_BODY_MAX,
  PUSH_TITLE_MAX,
} from '@/modules/notifications/domain/push-standard.js';

function notification(
  overrides: Partial<{
    title: string;
    body: string;
    severity: NotificationSeverity;
  }> = {},
) {
  return Notification.create({
    id: 'notification-1',
    recipientUserId: 'user-1',
    lenderId: 'lender-1',
    severity: overrides.severity ?? 'INFO',
    title: overrides.title ?? 'Préstamo asignado',
    body: overrides.body ?? 'Te asignaron un préstamo para cobrar.',
    relatedEntityType: 'LOAN',
    relatedEntityId: 'loan-1',
    readAt: null,
    createdAt: new Date('2026-10-15T12:00:00Z'),
  });
}

describe('clampPushText', () => {
  it('deja intacto lo corto y une las líneas', () => {
    expect(clampPushText('Hola\n  mundo', 50)).toBe('Hola mundo');
  });

  it('recorta lo largo con puntos suspensivos sin pasar del máximo', () => {
    const clamped = clampPushText('a'.repeat(300), 20);

    expect(clamped).toHaveLength(20);
    expect(clamped.endsWith('…')).toBe(true);
  });
});

describe('estándar de los push: pushMessageFor', () => {
  it('título y texto caben en el estándar aunque la notificación sea larga', () => {
    const message = pushMessageFor(
      'ExponentPushToken[x]',
      notification({ title: 'T'.repeat(200), body: 'b'.repeat(500) }),
    );

    expect(message.title.length).toBeLessThanOrEqual(PUSH_TITLE_MAX);
    expect(message.body.length).toBeLessThanOrEqual(PUSH_BODY_MAX);
  });

  it('los datos son solo identificadores: nada de nombres, montos ni textos', () => {
    const { data } = pushMessageFor('ExponentPushToken[x]', notification());

    expect(Object.keys(data).sort()).toEqual([
      'notificationId',
      'relatedEntityId',
      'relatedEntityType',
    ]);
    expect(JSON.stringify(data)).not.toContain('Te asignaron');
  });

  it('alertas y advertencias son de prioridad alta; lo informativo, normal', () => {
    const priorityOf = (severity: NotificationSeverity) =>
      pushMessageFor('t', notification({ severity })).priority;

    expect(priorityOf('ALERT')).toBe('high');
    expect(priorityOf('WARNING')).toBe('high');
    expect(priorityOf('INFO')).toBe('default');
    expect(priorityOf('SUCCESS')).toBe('default');
  });

  it('caduca a las 12 horas y usa el canal de la app', () => {
    const message = pushMessageFor('t', notification());

    expect(message.ttl).toBe(43_200);
    expect(message.channelId).toBe('default');
  });
});
