import { Inject, Injectable, Logger } from '@nestjs/common';
import type { LeadNotificationSettings } from '@/modules/leads/application/ports/lead-notification-settings.port.js';
import { LEAD_NOTIFICATION_SETTINGS } from '@/modules/leads/application/ports/lead-notification-settings.token.js';
import type { Lead } from '@/modules/leads/domain/entities/lead.entity.js';
import { leadReceivedEmail } from '@/modules/leads/domain/notifications/lead-received-email.js';
import type { EmailSender } from '@/modules/notifications/application/ports/email-sender.port.js';
import { EMAIL_SENDER } from '@/modules/notifications/application/ports/email-sender.token.js';

/**
 * Le avisa a ventas por correo que llegó un contacto nuevo, sin que quien lo pide espere ni
 * dependa de que el aviso salga bien: el contacto ya quedó guardado, y un correo caído nunca puede
 * perderlo ni devolverle un error a quien lo dejó (`notify` no es `async` a propósito, igual que
 * `EmailSender`).
 *
 * @remarks
 * Sin dirección configurada (`LeadNotificationSettings`) no avisa a nadie, y deja una línea en el
 * log para que se note que falta configurarla.
 */
@Injectable()
export class LeadNotifier {
  private readonly logger = new Logger(LeadNotifier.name);

  constructor(
    @Inject(LEAD_NOTIFICATION_SETTINGS)
    private readonly settings: LeadNotificationSettings,
    @Inject(EMAIL_SENDER) private readonly emailSender: EmailSender,
  ) {}

  /** @param lead - El contacto ya guardado. */
  notify(lead: Lead): void {
    const to = this.settings.recipientEmail();
    if (to === undefined) {
      this.logger.warn(
        `Llegó un contacto de ventas (${lead.id}) pero no hay un correo de ventas configurado: no se avisó a nadie.`,
      );
      return;
    }
    this.emailSender.send({ to, ...leadReceivedEmail(lead) });
  }
}
