import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { toBusinessDate } from '@fiaro-app/contracts';
import type { Env } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';
import { RunMoraAlertsUseCase } from '@/modules/alerts/application/use-cases/run-mora-alerts.use-case.js';
import {
  moraRunMomentOn,
  nextMoraRunMoment,
} from '@/modules/alerts/domain/mora/mora-schedule.js';
import type { Clock } from '@/shared/application/ports/clock.port.js';
import { CLOCK } from '@/shared/application/ports/clock.token.js';

/**
 * Envía el aviso diario de mora a las 08:00 de Bogotá (D-96). Corre dentro del proceso, con un
 * temporizador: no necesita Redis ni una cola, y como el envío se reclama por día, varias
 * instancias no lo duplican.
 *
 * @remarks
 * Al arrancar, si la hora de hoy ya pasó y el día no se envió (un reinicio después de las 08:00),
 * lo envía en ese momento. Un envío que falla a medio camino no se reintenta ese día: el día ya
 * quedó reclamado, así que nadie recibe el aviso dos veces.
 */
@Injectable()
export class MoraAlertScheduler
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(MoraAlertScheduler.name);
  private timer: NodeJS.Timeout | undefined;

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly runMoraAlerts: RunMoraAlertsUseCase,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  onApplicationBootstrap(): void {
    if (this.env.moraAlerts.enabled) {
      this.tick();
    }
  }

  onApplicationShutdown(): void {
    clearTimeout(this.timer);
  }

  /** Envía el aviso de hoy si ya es hora, y arma el temporizador para la siguiente hora de envío. */
  private tick(): void {
    const now = this.clock.now();
    const today = moraRunMomentOn(now);
    if (now.getTime() >= today.getTime()) {
      void this.runFor(today);
      this.arm(nextMoraRunMoment(today));
    } else {
      this.arm(today);
    }
  }

  /** @param runAt - Cuándo debe correr el siguiente envío. */
  private arm(runAt: Date): void {
    const delay = Math.max(runAt.getTime() - this.clock.now().getTime(), 0);
    this.timer = setTimeout(() => {
      this.tick();
    }, delay);
    this.timer.unref();
  }

  /** @param runMoment - Momento de envío; su día de negocio es el de Bogotá. */
  private async runFor(runMoment: Date): Promise<void> {
    const businessDate = toBusinessDate(runMoment);
    try {
      const sent = await this.runMoraAlerts.execute(businessDate);
      if (sent) {
        this.logger.log(`Aviso de mora del ${businessDate} enviado.`);
      }
    } catch (error) {
      this.logger.error(
        `El aviso de mora del ${businessDate} falló: ${String(error)}.`,
      );
    }
  }
}
