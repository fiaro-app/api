import { describe, expect, it } from 'vitest';
import { notificationEmail } from '@/modules/notifications/domain/email/notification-email.js';

describe('notificationEmail', () => {
  it('usa el título como asunto y lleva el texto y la línea para abrir la app', () => {
    const email = notificationEmail(
      'Préstamo asignado',
      'Te asignaron un préstamo para cobrar.',
    );

    expect(email.subject).toBe('Fiaro: Préstamo asignado');
    expect(email.text).toContain(
      'Préstamo asignado\n\nTe asignaron un préstamo para cobrar.\n\nAbre Fiaro en tu celular para ver los detalles.',
    );
    expect(email.html).toContain('Te asignaron un préstamo para cobrar.');
    expect(email.html).toContain('<html lang="es">');
  });

  it('escapa la nota de quien revisó en el HTML, sin tocar el texto plano', () => {
    const note = 'Faltan $5.000 <a href="https://evil.example">aclara</a>';
    const email = notificationEmail('Cuadre rechazado', note);

    expect(email.html).toContain(
      'Faltan $5.000 &lt;a href=&quot;https://evil.example&quot;&gt;aclara&lt;/a&gt;',
    );
    expect(email.html).not.toContain('<a href="https://evil.example">');
    expect(email.text).toContain(note);
  });
});
