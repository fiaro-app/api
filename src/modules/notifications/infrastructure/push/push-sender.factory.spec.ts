import { describe, expect, it } from 'vitest';
import { ExpoPushSender } from '@/modules/notifications/infrastructure/push/expo-push-sender.js';
import { LoggingPushSender } from '@/modules/notifications/infrastructure/push/logging-push-sender.js';
import { createPushSender } from '@/modules/notifications/infrastructure/push/push-sender.factory.js';

const tokens = { deleteByToken: () => Promise.resolve() };

describe('createPushSender', () => {
  it('con PUSH_DELIVERY=expo, manda con Expo', () => {
    const sender = createPushSender(
      { push: { delivery: 'expo', expoAccessToken: undefined } },
      tokens,
    );

    expect(sender).toBeInstanceOf(ExpoPushSender);
  });

  it('con PUSH_DELIVERY=log, solo escribe en el log', () => {
    const sender = createPushSender(
      { push: { delivery: 'log', expoAccessToken: undefined } },
      tokens,
    );

    expect(sender).toBeInstanceOf(LoggingPushSender);
  });
});
