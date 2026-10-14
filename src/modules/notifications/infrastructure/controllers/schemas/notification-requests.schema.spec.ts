import { describe, expect, it } from 'vitest';
import {
  CountUnreadNotificationsQuerySchema,
  ListNotificationsRequestSchema,
  MarkAllNotificationsReadRequestSchema,
} from '@/modules/notifications/infrastructure/controllers/schemas/notification-requests.schema.js';

describe('ListNotificationsRequestSchema', () => {
  it('aplica los valores por defecto de paginación', () => {
    expect(ListNotificationsRequestSchema.parse({})).toEqual({
      page: 1,
      pageSize: 10,
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

describe('MarkAllNotificationsReadRequestSchema', () => {
  it('sin cuerpo equivale a {} (marca las de todos los prestamistas)', () => {
    expect(MarkAllNotificationsReadRequestSchema.parse(undefined)).toEqual({});
  });

  it('acepta el prestamista', () => {
    const lenderId = '01a0f387-97a7-7192-bc0f-4f9d34e0480f';
    expect(MarkAllNotificationsReadRequestSchema.parse({ lenderId })).toEqual({
      lenderId,
    });
  });

  it('rechaza un prestamista que no es UUID y los campos que no declara', () => {
    expect(
      MarkAllNotificationsReadRequestSchema.safeParse({ lenderId: 'x' })
        .success,
    ).toBe(false);
    expect(
      MarkAllNotificationsReadRequestSchema.safeParse({ unreadOnly: true })
        .success,
    ).toBe(false);
  });
});

describe('CountUnreadNotificationsQuerySchema', () => {
  it('acepta que no llegue ningún parámetro', () => {
    expect(CountUnreadNotificationsQuerySchema.parse({})).toEqual({});
  });

  it('rechaza un prestamista que no es UUID', () => {
    expect(
      CountUnreadNotificationsQuerySchema.safeParse({ lenderId: 'x' }).success,
    ).toBe(false);
  });
});
