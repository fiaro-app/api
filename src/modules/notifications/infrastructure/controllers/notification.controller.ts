import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  QueryMethod,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ListNotificationsUseCase } from '@/modules/notifications/application/use-cases/list-notifications.use-case.js';
import { MarkNotificationReadUseCase } from '@/modules/notifications/application/use-cases/mark-notification-read.use-case.js';
import {
  ApiListNotifications,
  ApiMarkNotificationRead,
} from '@/modules/notifications/infrastructure/controllers/docs/notification-routes.docs.js';
import { ListNotificationsRequestSchema } from '@/modules/notifications/infrastructure/controllers/schemas/notification-requests.schema.js';
import {
  toNotificationResponse,
  toNotificationsPageResponse,
  type NotificationResponseSchema,
  type NotificationsPageResponseSchema,
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
}
