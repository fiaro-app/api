import { describe, expect, it } from 'vitest';
import {
  MORA_NOTIFICATION_TITLE,
  moraNotificationBody,
} from '@/modules/alerts/domain/mora/mora-notification.js';

describe('moraNotificationBody', () => {
  it('usa el singular cuando hay un solo préstamo en mora', () => {
    expect(
      moraNotificationBody({ loansInMora: 1, overdueAmount: 450_000 }),
    ).toBe('Hoy tienes 1 préstamo en mora por $ 450.000 en total.');
  });

  it('usa el plural y pesos colombianos sin centavos para varios préstamos', () => {
    expect(
      moraNotificationBody({ loansInMora: 3, overdueAmount: 1_234_567 }),
    ).toBe('Hoy tienes 3 préstamos en mora por $ 1.234.567 en total.');
  });

  it('el título del aviso es el mismo que ven la app, el correo y el push', () => {
    expect(MORA_NOTIFICATION_TITLE).toBe('Préstamos en mora');
  });
});
