import {
  EMAIL_COLORS as C,
  emailSubject,
} from '@/shared/domain/email/email-standard.js';
import { escapeHtml } from '@/shared/domain/text/escape-html.js';

/** El contenido de un correo transaccional, sin nada de HTML. Todo el texto se escapa al dibujarlo. */
export interface EmailSpec {
  /** Qué dice el correo en pocas palabras: va en el asunto y como título. */
  readonly title: string;
  /** Texto que algunos clientes muestran junto al asunto; ayuda a que se entienda sin abrirlo. */
  readonly preheader: string;
  /** Párrafos del cuerpo, en orden. */
  readonly paragraphs: readonly string[];
  /** Un dato que la persona debe copiar (un código, una contraseña temporal), en grande. */
  readonly highlight?: { readonly label: string; readonly value: string };
  /** Un botón a un enlace `https://`. Solo si hay una acción real. */
  readonly button?: { readonly label: string; readonly url: string };
  /** Línea final pequeña: por qué llegó este correo o qué hacer si no fue la persona. */
  readonly footnote?: string;
}

/** El asunto y los dos cuerpos de un correo, listos para enviar. */
export interface RenderedEmail {
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

const FONT = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

function paragraphHtml(text: string): string {
  return `<p style="margin:0 0 16px;font-size:16px;line-height:24px;color:${C.text};">${escapeHtml(text)}</p>`;
}

function highlightHtml(label: string, value: string): string {
  return `<div style="margin:8px 0 24px;padding:16px 20px;background:${C.highlight};border:1px solid ${C.line};border-radius:8px;"><div style="font-size:13px;line-height:18px;color:${C.muted};">${escapeHtml(label)}</div><div style="margin-top:4px;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:24px;line-height:32px;font-weight:700;letter-spacing:1px;color:${C.text};word-break:break-all;">${escapeHtml(value)}</div></div>`;
}

function buttonHtml(label: string, url: string): string {
  return `<p style="margin:8px 0 24px;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 24px;background:${C.accent};color:${C.accentText};font-size:16px;line-height:24px;font-weight:600;text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a></p>`;
}

/**
 * Dibuja un correo con el estándar de Fiaro (D-131): una tabla de 600 px con estilos en línea
 * (los clientes de correo ignoran las hojas de estilo), fondo blanco y texto oscuro, el índigo de
 * la marca solo como acento, sin imágenes, sin scripts, sin formularios y con una versión en texto
 * plano equivalente. Es una función pura: no envía nada.
 *
 * @remarks
 * Sin imágenes a propósito: no hay logo remoto que se bloquee, ni píxel de seguimiento que
 * penalice, y el correo pesa unos pocos KB. El único enlace posible es el del botón, y debe ser
 * `https://` (cualquier otro esquema se rechaza).
 *
 * @param spec - El contenido del correo.
 * @throws {@link RangeError} Si el enlace del botón no es `https://`.
 */
export function renderEmail(spec: EmailSpec): RenderedEmail {
  if (spec.button !== undefined && !spec.button.url.startsWith('https://')) {
    throw new RangeError('El enlace de un correo debe ser https://.');
  }
  const body = [
    ...spec.paragraphs.map(paragraphHtml),
    spec.highlight
      ? highlightHtml(spec.highlight.label, spec.highlight.value)
      : '',
    spec.button ? buttonHtml(spec.button.label, spec.button.url) : '',
  ].join('');
  const footnote = spec.footnote
    ? `<p style="margin:0 0 8px;font-size:13px;line-height:20px;color:${C.muted};">${escapeHtml(spec.footnote)}</p>`
    : '';
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${escapeHtml(spec.title)}</title></head><body style="margin:0;padding:0;background:${C.background};"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(spec.preheader)}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.background};"><tr><td align="center" style="padding:24px 16px;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;font-family:${FONT};"><tr><td style="padding:0 0 16px;border-bottom:3px solid ${C.accent};font-size:20px;line-height:28px;font-weight:700;color:${C.accent};">Fiaro</td></tr><tr><td style="padding:24px 0 0;"><h1 style="margin:0 0 16px;font-size:22px;line-height:30px;font-weight:700;color:${C.text};">${escapeHtml(spec.title)}</h1>${body}</td></tr><tr><td style="padding:16px 0 0;border-top:1px solid ${C.line};">${footnote}<p style="margin:0;font-size:13px;line-height:20px;color:${C.muted};">Fiaro · Gestión de cobros para financieras. Este es un mensaje automático sobre tu cuenta.</p></td></tr></table></td></tr></table></body></html>`;
  const text = [
    spec.title,
    '',
    ...spec.paragraphs.flatMap((paragraph) => [paragraph, '']),
    ...(spec.highlight
      ? [`${spec.highlight.label}: ${spec.highlight.value}`, '']
      : []),
    ...(spec.button ? [`${spec.button.label}: ${spec.button.url}`, ''] : []),
    ...(spec.footnote ? [spec.footnote, ''] : []),
    '— Fiaro',
  ].join('\n');
  return { subject: emailSubject(spec.title), html, text };
}
