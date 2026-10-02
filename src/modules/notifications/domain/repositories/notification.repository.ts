import type { Notification } from '@/modules/notifications/domain/entities/notification.entity.js';

/** Criterio de {@link NotificationRepository.list}. */
export interface ListNotificationsCriteria {
  /** Quién las recibe. */
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

/** Una página de {@link NotificationRepository.list}. */
export interface NotificationsPage {
  /** Las notificaciones de esta página. */
  readonly items: readonly Notification[];
  /** Cuántas cumplen el criterio en total, sin paginar. */
  readonly total: number;
}

/** Puerto de persistencia de las notificaciones. */
export interface NotificationRepository {
  /** @param notification - Notificación nueva. */
  create(notification: Notification): Promise<void>;

  /**
   * Busca por id dentro de quien la recibe: es la única frontera de dueño que importa (una
   * notificación no se comparte entre personas, a diferencia de un préstamo entre prestamistas).
   *
   * @param id - Identificador de la notificación.
   * @param recipientUserId - Quién la recibe.
   */
  findById(id: string, recipientUserId: string): Promise<Notification | null>;

  /** @param criteria - Quién las recibe, la paginación y los filtros opcionales. */
  list(criteria: ListNotificationsCriteria): Promise<NotificationsPage>;

  /**
   * @param id - La notificación, ya validada como propia.
   * @param readAt - Cuándo se marcó como leída.
   */
  markAsRead(id: string, readAt: Date): Promise<Notification>;
}
