import {
  NotificationEntityTypeSchema,
  NotificationSeveritySchema,
  paginated,
} from '@fiaro-app/contracts';
import { z } from 'zod';
import type {
  NotificationDetails,
  NotificationsPageResult,
} from '@/modules/notifications/application/dtos/notification-details.dto.js';

/** Respuesta con los datos públicos de una notificación. */
export const NotificationResponseSchema = z
  .object({
    id: z.uuid().meta({ description: 'Identificador de la notificación.' }),
    lenderId: z.uuid().meta({
      description: 'El prestamista del que trata.',
    }),
    severity: NotificationSeveritySchema.meta({
      description: 'Qué tan importante es.',
    }),
    title: z.string().meta({ description: 'Título corto.' }),
    body: z.string().meta({ description: 'Texto de la notificación.' }),
    relatedEntityType: NotificationEntityTypeSchema.nullable().meta({
      description:
        'A qué tipo de entidad lleva al tocarla, o null si a ninguna.',
    }),
    relatedEntityId: z.uuid().nullable().meta({
      description: 'A qué entidad lleva al tocarla, o null si a ninguna.',
    }),
    readAt: z.iso.datetime({ offset: true }).nullable().meta({
      description: 'Cuándo se leyó, o null mientras sigue sin leer.',
    }),
    createdAt: z.iso.datetime({ offset: true }).meta({
      description: 'Cuándo se creó.',
    }),
  })
  .meta({ id: 'NotificationResponse' });

/** Respuesta de `QUERY /notifications`: una página de notificaciones. */
export const NotificationsPageResponseSchema = paginated(
  NotificationResponseSchema,
).meta({ id: 'NotificationsPageResponse' });

/** @param details - Los datos de la notificación, tal como los devuelve el caso de uso. */
export function toNotificationResponse(
  details: NotificationDetails,
): z.output<typeof NotificationResponseSchema> {
  return {
    id: details.id,
    lenderId: details.lenderId,
    severity: details.severity,
    title: details.title,
    body: details.body,
    relatedEntityType: details.relatedEntityType,
    relatedEntityId: details.relatedEntityId,
    readAt: details.readAt?.toISOString() ?? null,
    createdAt: details.createdAt.toISOString(),
  };
}

/**
 * @param page - La página de notificaciones, tal como la devuelve el caso de uso.
 * @param pageQuery - La página y el tamaño pedidos.
 */
export function toNotificationsPageResponse(
  page: NotificationsPageResult,
  pageQuery: { page: number; pageSize: number },
): z.output<typeof NotificationsPageResponseSchema> {
  return {
    data: page.items.map(toNotificationResponse),
    meta: {
      page: pageQuery.page,
      pageSize: pageQuery.pageSize,
      total: page.total,
    },
  };
}
