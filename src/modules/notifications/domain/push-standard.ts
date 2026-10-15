/**
 * Estándar de las notificaciones push de Fiaro (D-131; ver `EMAIL-PUSH-STANDARD.md`). Los
 * límites están aquí como constantes para que los use el armado del mensaje y su prueba.
 */

/** El título cabe en una línea de la mayoría de teléfonos (iOS y Android cortan hacia los 40-50 caracteres). */
export const PUSH_TITLE_MAX = 50;

/** El texto se lee completo en 2 o 3 líneas; más largo se corta y no se entiende. */
export const PUSH_BODY_MAX = 140;

/** Cuánto vive un push sin entregarse: lo operativo de ayer no sirve hoy. */
export const PUSH_TTL_SECONDS = 12 * 60 * 60;

/** El canal de Android que crea la app móvil (`features/notifications/push/expo-push.ts`). */
export const PUSH_CHANNEL_ID = 'default';

/** Prioridad de entrega en Expo: `high` despierta el teléfono, para lo que pide atención ya. */
export type PushPriority = 'default' | 'high';

/**
 * Una sola línea y recortada a `max` con puntos suspensivos: un push no tiene saltos de línea ni
 * crece sin límite.
 *
 * @param text - El texto del título o del cuerpo.
 * @param max - El máximo de caracteres.
 */
export function clampPushText(text: string, max: number): string {
  const oneLine = text.replaceAll(/\s+/g, ' ').trim();
  return oneLine.length <= max
    ? oneLine
    : `${oneLine.slice(0, max - 1).trimEnd()}…`;
}
