import { describe, expect, it } from 'vitest';
import { membershipPasswordResetEmail } from '@/modules/memberships/domain/notifications/membership-password-reset-email.js';

describe('membershipPasswordResetEmail', () => {
  it('escapa el nombre en el HTML, sin tocar el texto plano', () => {
    const email = membershipPasswordResetEmail(
      'Ana & <b>Luis</b>',
      '+573001234567',
      'Temp-456',
    );

    expect(email.html).toContain(
      'Hola Ana &amp; &lt;b&gt;Luis&lt;/b&gt;, te restablecieron',
    );
    expect(email.text).toContain('Hola Ana & <b>Luis</b>, te restablecieron');
  });

  it('anuncia el cambio con el asunto correcto y lleva la contraseña nueva', () => {
    const email = membershipPasswordResetEmail(
      'Ana',
      '+573001234567',
      'Temp-456',
    );

    expect(email.subject).toBe('Fiaro: Tu contraseña cambió');
    expect(email.text).toContain('Contraseña temporal: Temp-456');
  });
});
