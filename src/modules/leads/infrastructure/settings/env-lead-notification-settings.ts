import { Inject, Injectable } from '@nestjs/common';
import type { Env } from '@/config/env.js';
import { ENV } from '@/config/env.token.js';
import type { LeadNotificationSettings } from '@/modules/leads/application/ports/lead-notification-settings.port.js';

/** Lee la dirección de ventas de la variable de entorno `LEADS_NOTIFY_EMAIL`. */
@Injectable()
export class EnvLeadNotificationSettings implements LeadNotificationSettings {
  constructor(@Inject(ENV) private readonly env: Env) {}

  recipientEmail(): string | undefined {
    return this.env.leads.notifyEmail;
  }
}
