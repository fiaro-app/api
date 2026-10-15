import type { Lead } from '@/modules/leads/domain/entities/lead.entity.js';
import { renderEmail } from '@/shared/domain/email/email-layout.js';

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
  const name = lead.name.replaceAll(/\s+/g, ' ').slice(0, 80);
  const contact = [lead.phone, lead.email]
    .filter((value): value is string => value !== null)
    .join(' · ');
  return renderEmail({
    title: `Nuevo contacto de ventas: ${name}`,
    preheader: `${name} dejó sus datos en el formulario de contacto.`,
    paragraphs: [
      `${lead.name} dejó sus datos.`,
      `Contacto: ${contact}`,
      lead.message,
    ],
  });
}
