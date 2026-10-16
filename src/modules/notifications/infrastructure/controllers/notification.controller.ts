import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  QueryMethod,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CountUnreadNotificationsUseCase } from '@/modules/notifications/application/use-cases/count-unread-notifications.use-case.js';
import { DeleteNotificationUseCase } from '@/modules/notifications/application/use-cases/delete-notification.use-case.js';
import { DeleteNotificationsUseCase } from '@/modules/notifications/application/use-cases/delete-notifications.use-case.js';
import { ListNotificationsUseCase } from '@/modules/notifications/application/use-cases/list-notifications.use-case.js';
import { MarkAllNotificationsReadUseCase } from '@/modules/notifications/application/use-cases/mark-all-notifications-read.use-case.js';
import { MarkNotificationReadUseCase } from '@/modules/notifications/application/use-cases/mark-notification-read.use-case.js';
import {
  ApiClearNotifications,
  ApiCountUnreadNotifications,
  ApiDeleteNotification,
  ApiListNotifications,
  ApiMarkAllNotificationsRead,
  ApiMarkNotificationRead,
} from '@/modules/notifications/infrastructure/controllers/docs/notification-routes.docs.js';
import {
  ClearNotificationsRequestSchema,
  CountUnreadNotificationsQuerySchema,
  ListNotificationsRequestSchema,
  MarkAllNotificationsReadRequestSchema,
} from '@/modules/notifications/infrastructure/controllers/schemas/notification-requests.schema.js';
import {
  toNotificationResponse,
  toNotificationsPageResponse,
  type ClearNotificationsResponseSchema,
  type MarkAllReadResponseSchema,
  type NotificationResponseSchema,
  type NotificationsPageResponseSchema,
  type UnreadCountResponseSchema,
} from '@/modules/notifications/infrastructure/controllers/schemas/notification-responses.schema.js';
import type { AuthenticatedUser } from '@/shared/application/ports/session-resolver.port.js';
import { CurrentUser } from '@/shared/infrastructure/http/current-user.decorator.js';
import { API_TAGS } from '@/shared/infrastructure/swagger/api-tags.js';

/**
 * Notificaciones propias de la sesión (PRODUCT.md §5). Nadie las crea por HTTP: siempre las
 * genera el sistema, desde otros casos de uso.
 *
 * @remarks
 * Sin `LenderScopeGuard`, a propósito: una persona que trabaja para varios prestamistas recibe
 * notificaciones de todos a la vez (`lenderId` es un dato de cada notificación, no un filtro
 * obligatorio), y la única frontera de dueño que de verdad importa es `recipientUserId` — la
 * exige el guard global (`AuthGuard`), que ya corre en toda ruta.
 */
@ApiTags(API_TAGS.notification.name)
@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly listNotificationsUseCase: ListNotificationsUseCase,
    private readonly markNotificationReadUseCase: MarkNotificationReadUseCase,
    private readonly markAllNotificationsReadUseCase: MarkAllNotificationsReadUseCase,
    private readonly countUnreadNotificationsUseCase: CountUnreadNotificationsUseCase,
    private readonly deleteNotificationUseCase: DeleteNotificationUseCase,
    private readonly deleteNotificationsUseCase: DeleteNotificationsUseCase,
  ) {}

  /**
   * @param query - Página, tamaño y filtros opcionales, ya validados.
   * @param user - Quién tiene la sesión.
   */
  @QueryMethod()
  @HttpCode(HttpStatus.OK)
  @ApiListNotifications()
  async listNotifications(
    @Body({ schema: ListNotificationsRequestSchema })
    query: z.output<typeof ListNotificationsRequestSchema>,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<z.output<typeof NotificationsPageResponseSchema>> {
    const page = await this.listNotificationsUseCase.execute({
      recipientUserId: user.id,
      ...query,
    });
    return toNotificationsPageResponse(page, query);
  }

  /**
   * @param id - La notificación.
   * @param user - Quién tiene la sesión.
   */
  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiMarkNotificationRead()
  async markNotificationRead(
    @Param('id', { schema: z.uuid() }) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<z.output<typeof NotificationResponseSchema>> {
    return toNotificationResponse(
      await this.markNotificationReadUseCase.execute(id, user.id),
    );
  }

  /**
   * @param body - El prestamista, opcional, ya validado.
   * @param user - Quién tiene la sesión.
   */
  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiMarkAllNotificationsRead()
  async markAllNotificationsRead(
    @Body({ schema: MarkAllNotificationsReadRequestSchema })
    body: z.output<typeof MarkAllNotificationsReadRequestSchema>,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<z.output<typeof MarkAllReadResponseSchema>> {
    const marked = await this.markAllNotificationsReadUseCase.execute({
      recipientUserId: user.id,
      lenderId: body.lenderId,
    });
    return { marked };
  }

  /**
   * @param query - El prestamista, opcional, ya validado.
   * @param user - Quién tiene la sesión.
   */
  @Get('unread-count')
  @HttpCode(HttpStatus.OK)
  @ApiCountUnreadNotifications()
  async countUnreadNotifications(
    @Query({ schema: CountUnreadNotificationsQuerySchema })
    query: z.output<typeof CountUnreadNotificationsQuerySchema>,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<z.output<typeof UnreadCountResponseSchema>> {
    const count = await this.countUnreadNotificationsUseCase.execute({
      recipientUserId: user.id,
      lenderId: query.lenderId,
    });
    return { count };
  }

  /**
   * @param body - El prestamista y si solo las leídas, ya validados.
   * @param user - Quién tiene la sesión.
   */
  @Post('clear')
  @HttpCode(HttpStatus.OK)
  @ApiClearNotifications()
  async clearNotifications(
    @Body({ schema: ClearNotificationsRequestSchema })
    body: z.output<typeof ClearNotificationsRequestSchema>,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<z.output<typeof ClearNotificationsResponseSchema>> {
    const deleted = await this.deleteNotificationsUseCase.execute({
      recipientUserId: user.id,
      lenderId: body.lenderId,
      onlyRead: body.onlyRead,
    });
    return { deleted };
  }

  /**
   * @param id - La notificación.
   * @param user - Quién tiene la sesión.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiDeleteNotification()
  async deleteNotification(
    @Param('id', { schema: z.uuid() }) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.deleteNotificationUseCase.execute(id, user.id);
  }
}
