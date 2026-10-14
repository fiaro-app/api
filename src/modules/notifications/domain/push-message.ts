import type { Notification } from '@/modules/notifications/domain/entities/notification.entity.js';
import type { NotificationEntityType } from '@/modules/notifications/domain/entities/notification-entity-type.js';

/** Lo que la app recibe con un push para saber qué abrir al tocarlo (D-95). */
export interface PushData {
  /** La notificación del feed a la que corresponde. */
  readonly notificationId: string;
  /** La entidad a la que lleva la notificación, o `null` si no lleva a ninguna. */
  readonly relatedEntityType: NotificationEntityType | null;
  /** El id de esa entidad, o `null`. */
  readonly relatedEntityId: string | null;
}

/** Un mensaje push listo para enviar a un dispositivo. */
export interface PushMessage {
  /** Token de Expo del dispositivo destinatario. */
  readonly to: string;
  /** Título, igual que el de la notificación del feed. */
  readonly title: string;
  /** Texto, igual que el de la notificación del feed. */
  readonly body: string;
  /** Datos para abrir la notificación al tocarla. */
  readonly data: PushData;
}

/**
 * Arma el mensaje push de una notificación para un dispositivo. Es una función pura: el título y el
 * texto son los mismos que los del feed y del correo, para que los tres canales digan lo mismo.
 *
 * @param token - Token de Expo del dispositivo.
 * @param notification - La notificación ya guardada.
 */
export function pushMessageFor(
  token: string,
  notification: Notification,
): PushMessage {
  return {
    to: token,
    title: notification.title,
    body: notification.body,
    data: {
      notificationId: notification.id,
      relatedEntityType: notification.relatedEntityType,
      relatedEntityId: notification.relatedEntityId,
    },
  };
}
