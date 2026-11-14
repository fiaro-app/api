import { describe, expect, it } from 'vitest';
import { contactEmailVerificationEmail } from '@/modules/auth/domain/notifications/contact-email-verification-email.js';
import { passwordResetEmail } from '@/modules/auth/domain/notifications/password-reset-email.js';
import { Lead } from '@/modules/leads/domain/entities/lead.entity.js';
import { leadReceivedEmail } from '@/modules/leads/domain/notifications/lead-received-email.js';
import { membershipInviteEmail } from '@/modules/memberships/domain/notifications/membership-invite-email.js';
import { membershipPasswordResetEmail } from '@/modules/memberships/domain/notifications/membership-password-reset-email.js';
import { notificationEmail } from '@/modules/notifications/domain/email/notification-email.js';
import { renderEmail } from '@/shared/domain/email/email-layout.js';
import {
  EMAIL_HTML_MAX_BYTES,
  EMAIL_SUBJECT_MAX,
  emailSubject,
} from '@/shared/domain/email/email-standard.js';

const LEAD = Lead.create({
  id: 'lead-1',
  name: 'Ana Pérez',
  phone: '+573001234567',
  email: 'ana@ejemplo.co',
  message: 'Quiero probar Fiaro.',
  createdAt: new Date('2026-10-09T12:00:00Z'),
});

/** Cada correo que Fiaro puede mandar, con datos de ejemplo: si se agrega uno, entra aquí. */
const EMAILS = {
  passwordReset: passwordResetEmail('482913'),
  contactVerification: contactEmailVerificationEmail('482913'),
  membershipInvite: membershipInviteEmail(
    'Carlos Ramírez',
    '+573001234567',
    'Temp-123',
  ),
  membershipPasswordReset: membershipPasswordResetEmail(
    'Carlos Ramírez',
    '+573001234567',
    'Temp-456',
  ),
  lead: leadReceivedEmail(LEAD),
  notification: notificationEmail(
    'Cuadre rechazado',
    'Revisa el efectivo del día y vuelve a enviarlo.',
  ),
};

describe.each(Object.entries(EMAILS))(
  'estándar de correos: %s',
  (_name, email) => {
    it('el asunto es de una línea, corto, con la marca y sin tonos de spam', () => {
      expect(email.subject.startsWith('Fiaro: ')).toBe(true);
      expect(email.subject.length).toBeLessThanOrEqual(EMAIL_SUBJECT_MAX);
      expect(email.subject).not.toMatch(/[\r\n]/);
      expect(email.subject).not.toMatch(/!|¡|\$\$|\bGRATIS\b|\bURGENTE\b/i);
      expect(email.subject).not.toMatch(/\b[A-ZÁÉÍÓÚÑ]{5,}\b/);
    });

    it('el HTML es liviano, en español y sin nada que los filtros penalicen', () => {
      expect(Buffer.byteLength(email.html)).toBeLessThan(EMAIL_HTML_MAX_BYTES);
      expect(email.html.startsWith('<!doctype html><html lang="es">')).toBe(
        true,
      );
      expect(email.html).not.toMatch(
        /<(script|form|iframe|img|input|video|object|embed)\b/i,
      );
      expect(email.html).not.toMatch(
        /javascript:|display:\s*none[^"]*">\s*<a/i,
      );
      for (const [, url] of email.html.matchAll(/href="([^"]*)"/g)) {
        expect(url).toMatch(/^https:\/\//);
      }
    });

    it('trae una versión en texto plano sin etiquetas y con los mismos datos', () => {
      expect(email.text.length).toBeGreaterThan(20);
      expect(email.text).not.toMatch(/<\/?(p|div|table|td|strong|br)\b/);
      expect(email.text.endsWith('— Fiaro')).toBe(true);
    });

    it('no usa imágenes ni píxeles de seguimiento (nada remoto que se bloquee)', () => {
      expect(email.html).not.toMatch(/src="|url\(/i);
    });
  },
);

describe('renderEmail', () => {
  it('escapa todo lo que escribe una persona', () => {
    const email = renderEmail({
      title: 'Hola <b>x</b>',
      preheader: '<i>y</i>',
      paragraphs: ['<script>alert(1)</script>'],
      highlight: { label: '<l>', value: '<v>' },
      footnote: '<f>',
    });

    expect(email.html).not.toMatch(/<(script|b|i|l|v|f)>/);
    expect(email.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('rechaza un botón que no sea https', () => {
    expect(() =>
      renderEmail({
        title: 'x',
        preheader: 'x',
        paragraphs: [],
        button: { label: 'Abrir', url: 'http://inseguro.example' },
      }),
    ).toThrow(RangeError);
  });

  it('dibuja el botón https en HTML y en texto', () => {
    const email = renderEmail({
      title: 'x',
      preheader: 'x',
      paragraphs: [],
      button: { label: 'Abrir', url: 'https://fiaro.co/abrir' },
    });

    expect(email.html).toContain('href="https://fiaro.co/abrir"');
    expect(email.text).toContain('Abrir: https://fiaro.co/abrir');
  });
});

describe('emailSubject', () => {
  it('recorta lo largo con puntos suspensivos y une las líneas', () => {
    const subject = emailSubject(`Hola\r\nBcc: x@y.z ${'a'.repeat(100)}`);

    expect(subject.length).toBeLessThanOrEqual(EMAIL_SUBJECT_MAX);
    expect(subject.endsWith('…')).toBe(true);
    expect(subject).not.toMatch(/[\r\n]/);
  });
});
