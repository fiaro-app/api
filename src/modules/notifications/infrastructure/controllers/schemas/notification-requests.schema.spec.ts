import { describe, expect, it } from 'vitest';
import { ListNotificationsRequestSchema } from '@/modules/notifications/infrastructure/controllers/schemas/notification-requests.schema.js';

describe('ListNotificationsRequestSchema', () => {
  it('aplica los valores por defecto de paginación', () => {
    expect(ListNotificationsRequestSchema.parse({})).toEqual({
      page: 1,
      pageSize: 20,
    });
  });

  it('acepta filtros opcionales por prestamista y por sin leer', () => {
    const parsed = ListNotificationsRequestSchema.parse({
      lenderId: '01a0f387-97a7-7192-bc0f-4f9d34e0480f',
      unreadOnly: true,
    });
    expect(parsed.lenderId).toBe('01a0f387-97a7-7192-bc0f-4f9d34e0480f');
    expect(parsed.unreadOnly).toBe(true);
  });

  it('rechaza un campo que la ruta no declara', () => {
    expect(
      ListNotificationsRequestSchema.safeParse({ sort: 'createdAt' }).success,
    ).toBe(false);
  });
});
