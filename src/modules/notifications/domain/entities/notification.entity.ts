import type { NotificationEntityType } from '@/modules/notifications/domain/entities/notification-entity-type.js';
import type { NotificationSeverity } from '@/modules/notifications/domain/entities/notification-severity.js';

/** Datos con los que se construye una {@link Notification}. */
export interface NotificationProps {
  /** Identificador de la notificación (UUIDv7). */
  readonly id: string;
  /** La persona que la recibe. */
  readonly recipientUserId: string;
  /** El prestamista del que trata, por si la persona trabaja para varios. */
  readonly lenderId: string;
  readonly severity: NotificationSeverity;
  readonly title: string;
  readonly body: string;
  /** `null` si no lleva a ninguna entidad en particular. */
  readonly relatedEntityType: NotificationEntityType | null;
  readonly relatedEntityId: string | null;
  /** `null` mientras no se haya leído. */
  readonly readAt: Date | null;
  readonly createdAt: Date;
}

/**
 * Aviso interno para una persona (PRODUCT.md §5). Lleva `lenderId` porque alguien que trabaja
 * para varios prestamistas recibe notificaciones de todos, por separado.
 */
export class Notification {
  private constructor(
    public readonly id: string,
    public readonly recipientUserId: string,
    public readonly lenderId: string,
    public readonly severity: NotificationSeverity,
    public readonly title: string,
    public readonly body: string,
    public readonly relatedEntityType: NotificationEntityType | null,
    public readonly relatedEntityId: string | null,
    public readonly readAt: Date | null,
    public readonly createdAt: Date,
  ) {}

  /**
   * Construye la notificación con sus datos ya validados.
   *
   * @param props - Datos de la notificación.
   */
  static create(props: NotificationProps): Notification {
    return new Notification(
      props.id,
      props.recipientUserId,
      props.lenderId,
      props.severity,
      props.title,
      props.body,
      props.relatedEntityType,
      props.relatedEntityId,
      props.readAt,
      props.createdAt,
    );
  }
}
