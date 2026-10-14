import type { NotificationEntityType } from '@/modules/notifications/domain/entities/notification-entity-type.js';
import type { NotificationSeverity } from '@/modules/notifications/domain/entities/notification-severity.js';

/** Los datos públicos de una notificación, tal como los describe `NotificationSchema`. */
export interface NotificationDetails {
  readonly id: string;
  readonly recipientUserId: string;
  readonly lenderId: string;
  readonly severity: NotificationSeverity;
  readonly title: string;
  readonly body: string;
  readonly relatedEntityType: NotificationEntityType | null;
  readonly relatedEntityId: string | null;
  /** `null` mientras no se haya leído. */
  readonly readAt: Date | null;
  readonly createdAt: Date;
}

/** Datos con los que se crea una notificación (uso interno, entre casos de uso). */
export interface CreateNotificationInput {
  readonly recipientUserId: string;
  readonly lenderId: string;
  readonly severity: NotificationSeverity;
  readonly title: string;
  readonly body: string;
  readonly relatedEntityType: NotificationEntityType | null;
  readonly relatedEntityId: string | null;
}

/** Criterio y paginación de {@link ListNotificationsUseCase}. */
export interface ListNotificationsInput {
  /** Quién las recibe, resuelto de la sesión. */
  readonly recipientUserId: string;
  /** Página, desde 1. */
  readonly page: number;
  /** Tamaño de la página. */
  readonly pageSize: number;
  /**
   * Solo las de este prestamista; ausente para listar las de todos (una persona puede trabajar
   * para varios, PRODUCT.md §5).
   */
  readonly lenderId?: string;
  /** Solo las que no se han leído; ausente para listar todas. */
  readonly unreadOnly?: boolean;
}

/** Una página de notificaciones. */
export interface NotificationsPageResult {
  readonly items: readonly NotificationDetails[];
  readonly total: number;
}

/** Criterio de {@link CountUnreadNotificationsUseCase} y {@link MarkAllNotificationsReadUseCase}. */
export interface UnreadNotificationsInput {
  /** Quién las recibe, resuelto de la sesión. */
  readonly recipientUserId: string;
  /**
   * Solo las de este prestamista; ausente para las de todos (una persona puede trabajar para
   * varios, PRODUCT.md §5).
   */
  readonly lenderId?: string;
}
