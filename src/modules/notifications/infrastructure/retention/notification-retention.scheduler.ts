import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import type { Env } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';
import { PurgeOldNotificationsUseCase } from '@/modules/notifications/application/use-cases/purge-old-notifications.use-case.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Borra a diario las notificaciones viejas (D-142). Corre dentro del proceso, con un temporizador:
 * no necesita Redis ni una cola, y borrar lo mismo desde varias instancias no hace daño. Corre
 * al arrancar y luego cada 24 horas.
 */
@Injectable()
export class NotificationRetentionScheduler
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(NotificationRetentionScheduler.name);
  private timer: NodeJS.Timeout | undefined;

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly purgeOldNotifications: PurgeOldNotificationsUseCase,
  ) {}

  onApplicationBootstrap(): void {
    if (this.env.notificationRetention.days === 0) {
      return;
    }
    void this.purge();
    this.timer = setInterval(() => {
      void this.purge();
    }, DAY_MS);
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    clearInterval(this.timer);
  }

  /** Borra las que pasaron el límite; un fallo se anota y se reintenta al día siguiente. */
  private async purge(): Promise<void> {
    try {
      const deleted = await this.purgeOldNotifications.execute(
        this.env.notificationRetention.days,
      );
      if (deleted > 0) {
        this.logger.log(
          `Se borraron ${String(deleted)} notificaciones viejas.`,
        );
      }
    } catch (error) {
      this.logger.error(
        `El borrado de notificaciones viejas falló: ${String(error)}.`,
      );
    }
  }
}
