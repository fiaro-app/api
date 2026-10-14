import { Inject, Injectable } from '@nestjs/common';
import { SendMoraAlertsUseCase } from '@/modules/alerts/application/use-cases/send-mora-alerts.use-case.js';
import type { MoraAlertRunRepository } from '@/modules/alerts/domain/repositories/mora-alert-run.repository.js';
import { MORA_ALERT_RUN_REPOSITORY } from '@/modules/alerts/domain/tokens/mora-alert-run-repository.token.js';

/**
 * Envía el aviso de mora de un día de negocio, una sola vez (D-96): el primer llamado de ese día lo
 * envía y los demás no hacen nada. Así, varias instancias o un reinicio el mismo día no duplican avisos.
 */
@Injectable()
export class RunMoraAlertsUseCase {
  constructor(
    @Inject(MORA_ALERT_RUN_REPOSITORY)
    private readonly runs: MoraAlertRunRepository,
    private readonly sendMoraAlerts: SendMoraAlertsUseCase,
  ) {}

  /**
   * @param businessDate - El día de negocio, AAAA-MM-DD, en hora de Colombia.
   * @returns `true` si este llamado envió el aviso; `false` si ese día ya estaba reclamado.
   */
  async execute(businessDate: string): Promise<boolean> {
    if (!(await this.runs.claim(businessDate))) {
      return false;
    }
    const result = await this.sendMoraAlerts.execute();
    await this.runs.finish(businessDate, result);
    return true;
  }
}
