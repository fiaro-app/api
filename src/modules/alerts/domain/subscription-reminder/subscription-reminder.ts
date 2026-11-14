import { SUBSCRIPTION_GRACE_DAYS } from '@/shared/domain/subscriptions/subscription-status.js';

/** Con cuántos días de antelación se avisa que el plan va a vencer. */
export const REMINDER_DAYS_BEFORE = [7, 3, 1] as const;

/** Qué hay que recordarle a la dueña hoy. */
export type SubscriptionReminder =
  /** Faltan `days` días para que venza el plan (7, 3 o 1). */
  | { readonly kind: 'ENDING'; readonly days: number }
  /** El plan vence hoy. */
  | { readonly kind: 'ENDS_TODAY' }
  /** Ya venció y sigue en gracia: quedan `daysLeft` días antes del solo lectura. */
  | { readonly kind: 'GRACE'; readonly daysLeft: number }
  /** Hoy se acabó la gracia: el negocio pasó a solo lectura. */
  | { readonly kind: 'READ_ONLY' };

/** Texto del recordatorio, tal como sale en la app, el correo y el push. */
export interface ReminderMessage {
  readonly title: string;
  readonly body: string;
  readonly severity: 'WARNING' | 'ALERT';
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Colombia no tiene horario de verano: Bogotá es siempre UTC-5 (igual que en `mora-schedule`). */
const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000;

/** @param instant - Un instante. @returns El número de su día de calendario en Bogotá. */
function bogotaDay(instant: Date): number {
  return Math.floor((instant.getTime() - BOGOTA_OFFSET_MS) / DAY_MS);
}

/**
 * Cuántos días de calendario (hora de Colombia) hay entre dos instantes: positivo si `to` es después.
 * Cuenta días de negocio y no horas, porque el vencimiento cae a cualquier hora y el recordatorio
 * sale a las 08:00: «vence mañana» tiene que querer decir el día siguiente, no las próximas 24 horas.
 *
 * @param from - El instante de partida (el momento del envío).
 * @param to - El instante de llegada (el vencimiento).
 */
function businessDaysBetween(from: Date, to: Date): number {
  return bogotaDay(to) - bogotaDay(from);
}

/**
 * Qué recordar hoy sobre un plan, o `null` si hoy no toca. Se avisa a los 7, 3 y 1 días antes, el
 * día del vencimiento, cada día de gracia y el día en que pasa a solo lectura; el resto de los días
 * no se manda nada.
 *
 * @param currentPeriodEndsAt - Hasta cuándo está pagado el plan.
 * @param now - El momento del envío.
 */
export function reminderFor(
  currentPeriodEndsAt: Date,
  now: Date,
): SubscriptionReminder | null {
  const days = businessDaysBetween(now, currentPeriodEndsAt);
  if ((REMINDER_DAYS_BEFORE as readonly number[]).includes(days)) {
    return { kind: 'ENDING', days };
  }
  if (days === 0) {
    return { kind: 'ENDS_TODAY' };
  }
  if (days < 0 && days >= -SUBSCRIPTION_GRACE_DAYS) {
    return { kind: 'GRACE', daysLeft: SUBSCRIPTION_GRACE_DAYS + days };
  }
  if (days === -(SUBSCRIPTION_GRACE_DAYS + 1)) {
    return { kind: 'READ_ONLY' };
  }
  return null;
}

/** @param count - Cuántos días. */
function daysLabel(count: number): string {
  return count === 1 ? '1 día' : `${String(count)} días`;
}

/**
 * El texto de un recordatorio. Habla de la prueba o del plan según lo que tenga el negocio, y
 * siempre dice dónde renovar.
 *
 * @param reminder - Qué se recuerda.
 * @param isTrial - Si el negocio está en la prueba gratis.
 */
export function reminderMessage(
  reminder: SubscriptionReminder,
  isTrial: boolean,
): ReminderMessage {
  const what = isTrial ? 'tu prueba gratis' : 'tu plan';
  const renew = 'Entra a «Plan y pagos» para activarlo o renovarlo.';
  switch (reminder.kind) {
    case 'ENDING':
      return {
        title: isTrial
          ? 'Tu prueba gratis termina pronto'
          : 'Tu plan vence pronto',
        body: `${isTrial ? 'Tu prueba gratis termina' : 'Tu plan vence'} en ${daysLabel(reminder.days)}. ${renew}`,
        severity: 'WARNING',
      };
    case 'ENDS_TODAY':
      return {
        title: isTrial ? 'Tu prueba gratis termina hoy' : 'Tu plan vence hoy',
        body: `Hoy termina ${what}. Tienes ${daysLabel(SUBSCRIPTION_GRACE_DAYS)} de gracia para seguir trabajando con normalidad. ${renew}`,
        severity: 'WARNING',
      };
    case 'GRACE':
      return {
        title: 'Tu plan está en gracia',
        body: `Ya terminó ${what}. Te quedan ${daysLabel(reminder.daysLeft)} antes de pasar a solo lectura. ${renew}`,
        severity: 'ALERT',
      };
    case 'READ_ONLY':
      return {
        title: 'Tu negocio pasó a solo lectura',
        body: 'Terminó la gracia: puedes consultar tus datos y seguir registrando cobros y cuadres, pero no hacer otros cambios. Entra a «Plan y pagos» para activar tu plan.',
        severity: 'ALERT',
      };
  }
}
