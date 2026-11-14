import { describe, expect, it } from 'vitest';
import { Lead } from '@/modules/leads/domain/entities/lead.entity.js';
import { leadReceivedEmail } from '@/modules/leads/domain/notifications/lead-received-email.js';

const lead = (overrides: Partial<Parameters<typeof Lead.create>[0]> = {}) =>
  Lead.create({
    id: 'lead-1',
    name: 'Ana Pérez',
    phone: '+573001234567',
    email: 'ana@ejemplo.co',
    message: 'Quiero probar Fiaro.\nTengo 3 cobradores.',
    createdAt: new Date('2026-10-09T12:00:00Z'),
    ...overrides,
  });

describe('leadReceivedEmail', () => {
  it('lleva el nombre en el asunto y todos los datos en ambos cuerpos', () => {
    const email = leadReceivedEmail(lead());

    expect(email.subject).toBe('Fiaro: Nuevo contacto de ventas: Ana Pérez');
    expect(email.text).toContain('Ana Pérez dejó sus datos.');
    expect(email.text).toContain('+573001234567 · ana@ejemplo.co');
    expect(email.html).toContain('+573001234567 · ana@ejemplo.co');
    expect(email.html).toContain('Quiero probar Fiaro.\nTengo 3 cobradores.');
  });

  it('muestra solo el medio de contacto que dejó', () => {
    const onlyEmail = leadReceivedEmail(lead({ phone: null }));
    const onlyPhone = leadReceivedEmail(lead({ email: null }));

    expect(onlyEmail.text).toContain('Contacto: ana@ejemplo.co');
    expect(onlyPhone.text).toContain('Contacto: +573001234567');
  });

  it('escapa el texto libre en el HTML, sin tocar el texto plano', () => {
    const email = leadReceivedEmail(
      lead({ name: '<b>Ana</b>', message: '<script>alert(1)</script>' }),
    );

    expect(email.html).toContain('&lt;b&gt;Ana&lt;/b&gt;');
    expect(email.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(email.html).not.toContain('<script>');
    expect(email.text).toContain('<script>alert(1)</script>');
  });

  it('en el asunto no caben saltos de línea (inyección de cabeceras) ni más de 80 caracteres del nombre', () => {
    const email = leadReceivedEmail(
      lead({ name: `Ana\r\nBcc: x@y.z ${'a'.repeat(200)}` }),
    );

    expect(email.subject).not.toMatch(/[\r\n]/);
    expect(email.subject.length).toBeLessThanOrEqual(60);
  });
});
