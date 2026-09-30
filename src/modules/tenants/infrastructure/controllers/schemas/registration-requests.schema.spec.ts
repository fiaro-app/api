import { describe, expect, it } from 'vitest';
import { RegisterOwnerRequestSchema } from '@/modules/tenants/infrastructure/controllers/schemas/registration-requests.schema.js';

const VALID_BODY = {
  phone: '+573001234567',
  fullName: 'Ana Pérez',
  password: 'una-contraseña-larga',
  nationalId: '1020304050',
  businessName: 'Préstamos Ana',
};

describe('RegisterOwnerRequestSchema', () => {
  it('acepta los cinco campos obligatorios', () => {
    expect(RegisterOwnerRequestSchema.safeParse(VALID_BODY).success).toBe(true);
  });

  it('acepta un correo de contacto opcional', () => {
    expect(
      RegisterOwnerRequestSchema.safeParse({
        ...VALID_BODY,
        contactEmail: 'ana@example.com',
      }).success,
    ).toBe(true);
  });

  it('rechaza un celular que no es colombiano', () => {
    expect(
      RegisterOwnerRequestSchema.safeParse({ ...VALID_BODY, phone: '123' })
        .success,
    ).toBe(false);
  });

  it('rechaza un campo faltante', () => {
    const incomplete = {
      phone: VALID_BODY.phone,
      fullName: VALID_BODY.fullName,
      password: VALID_BODY.password,
      nationalId: VALID_BODY.nationalId,
    };
    expect(RegisterOwnerRequestSchema.safeParse(incomplete).success).toBe(
      false,
    );
  });

  it('rechaza un campo que la ruta no declara', () => {
    expect(
      RegisterOwnerRequestSchema.safeParse({ ...VALID_BODY, tenantId: 'x' })
        .success,
    ).toBe(false);
  });
});
