import { IdSchema, PageQuerySchema } from '@fiaro-app/contracts';
import { z } from 'zod';

/** Cuerpo de `QUERY /notifications`: paginación y filtros opcionales. */
export const ListNotificationsRequestSchema = PageQuerySchema.extend({
  lenderId: IdSchema.optional().meta({
    description:
      'Solo las de este prestamista. Ausente para listar las de todos (una persona puede trabajar para varios).',
  }),
  unreadOnly: z.boolean().optional().meta({
    description: 'Solo las que no se han leído. Ausente para listar todas.',
  }),
});

/**
 * Cuerpo de `POST /notifications/read-all`: solo el prestamista, opcional. Sin cuerpo equivale a
 * `{}`: marca las de todos.
 */
export const MarkAllNotificationsReadRequestSchema = z
  .strictObject({
    lenderId: IdSchema.optional().meta({
      description:
        'Solo las de este prestamista. Ausente para marcar las de todos.',
    }),
  })
  .prefault({});

/** Parámetros de `GET /notifications/unread-count`. */
export const CountUnreadNotificationsQuerySchema = z.strictObject({
  lenderId: IdSchema.optional().meta({
    description:
      'Solo las de este prestamista. Ausente para contar las de todos.',
  }),
});

/**
 * Cuerpo de `POST /notifications/clear`: borra de una vez las notificaciones propias. Sin cuerpo
 * equivale a `{}`: borra todas, de todos los prestamistas.
 */
export const ClearNotificationsRequestSchema = z
  .strictObject({
    lenderId: IdSchema.optional().meta({
      description:
        'Solo las de este prestamista. Ausente para borrar las de todos.',
    }),
    onlyRead: z.boolean().default(false).meta({
      description:
        'true: borra solo las ya leídas y conserva las que siguen sin leer.',
    }),
  })
  .prefault({});
