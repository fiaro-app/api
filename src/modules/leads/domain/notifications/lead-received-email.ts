import type { Lead } from '@/modules/leads/domain/entities/lead.entity.js';
import { escapeHtml } from '@/shared/domain/text/escape-html.js';

/** El asunto y los dos cuerpos de un correo, listos para enviar. */
export interface LeadEmailContent {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

/**
 * Arma el aviso a ventas de que alguien dejó sus datos. Función pura: no envía nada.
 *
 * @remarks
 * Todo lo que trae el contacto es texto libre de un desconocido sin sesión, así que en el HTML se
 * escapa: sin eso, un mensaje con etiquetas se vería como parte del correo oficial. En el asunto
 * va solo el nombre recortado y sin saltos de línea, para que nadie inyecte cabeceras.
 *
 * @param lead - El contacto recién guardado.
 */
export function leadReceivedEmail(lead: Lead): LeadEmailContent {
  const name = lead.name.replace(/[\r\n]+/g, ' ').slice(0, 80);
  const contact = [lead.phone, lead.email]
    .filter((value): value is string => value !== null)
    .join(' · ');
  return {
    subject: `Nuevo contacto de ventas: ${name}`,
    text: `${lead.name} dejó sus datos.\nContacto: ${contact}\n\n${lead.message}`,
    html: `<p><strong>${escapeHtml(lead.name)}</strong> dejó sus datos.</p><p>Contacto: ${escapeHtml(contact)}</p><p>${escapeHtml(lead.message).replace(/\n/g, '<br>')}</p>`,
  };
}
