import { describe, expect, it } from 'vitest';
import { membershipInviteEmail } from '@/modules/memberships/domain/notifications/membership-invite-email.js';

describe('membershipInviteEmail', () => {
  it('pone el nombre escapado en el HTML y tal cual en el texto plano', () => {
    const email = membershipInviteEmail(
      '<img src=x onerror=alert(1)> Carlos',
      '+573001234567',
      'Temporal-123',
    );

    expect(email.html).toContain(
      'Hola &lt;img src=x onerror=alert(1)&gt; Carlos.',
    );
    expect(email.text).toContain('Hola <img src=x onerror=alert(1)> Carlos.');
  });

  it('lleva el celular y la contraseña temporal en ambos cuerpos', () => {
    const email = membershipInviteEmail('Carlos', '+573001234567', 'Temp-123');

    expect(email.subject).toBe('Te invitaron a Fiaro');
    expect(email.html).toContain('+573001234567');
    expect(email.html).toContain('Temp-123');
    expect(email.text).toContain('Contraseña temporal: Temp-123');
  });
});
