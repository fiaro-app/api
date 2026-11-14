import {
  clampPushText,
  PUSH_BODY_MAX,
  PUSH_CHANNEL_ID,
  PUSH_TITLE_MAX,
  PUSH_TTL_SECONDS,
  type PushPriority,
} from '@/modules/notifications/domain/push-standard.js';
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
  /** Datos para abrir la notificación al tocarla: solo identificadores, nunca datos de personas ni montos. */
  readonly data: PushData;
  /** `high` para alertas y advertencias, `default` para lo informativo. */
  readonly priority: PushPriority;
  /** Segundos que Expo reintenta entregarlo antes de descartarlo. */
  readonly ttl: number;
  /** Canal de Android donde se muestra. */
  readonly channelId: string;
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
    title: clampPushText(notification.title, PUSH_TITLE_MAX),
    body: clampPushText(notification.body, PUSH_BODY_MAX),
    data: {
      notificationId: notification.id,
      relatedEntityType: notification.relatedEntityType,
      relatedEntityId: notification.relatedEntityId,
    },
    priority:
      notification.severity === 'ALERT' || notification.severity === 'WARNING'
        ? 'high'
        : 'default',
    ttl: PUSH_TTL_SECONDS,
    channelId: PUSH_CHANNEL_ID,
  };
}
