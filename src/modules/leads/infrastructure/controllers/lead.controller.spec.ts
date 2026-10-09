import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants.js';
import { describe, expect, it, vi } from 'vitest';
import type { CreateLeadUseCase } from '@/modules/leads/application/use-cases/create-lead.use-case.js';
import {
  LEAD_RATE_LIMIT,
  LEAD_RATE_WINDOW_MS,
  LeadController,
} from '@/modules/leads/infrastructure/controllers/lead.controller.js';

function setup() {
  const execute = vi.fn(() => Promise.resolve());
  const controller = new LeadController({
    execute,
  } as unknown as CreateLeadUseCase);
  return { controller, execute };
}

describe('LeadController', () => {
  it('publica POST /leads', () => {
    const handler = Reflect.get(
      LeadController.prototype,
      'createLead',
    ) as object;
    expect(
      RequestMethod[
        Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod
      ],
    ).toBe('POST');
    expect(Reflect.getMetadata(PATH_METADATA, LeadController)).toBe('leads');
  });

  it('tiene un límite propio de 5 contactos por hora', () => {
    expect(LEAD_RATE_LIMIT).toBe(5);
    expect(LEAD_RATE_WINDOW_MS).toBe(3_600_000);
  });

  it('guarda el contacto y responde que quedó recibido', async () => {
    const { controller, execute } = setup();

    const response = await controller.createLead({
      name: 'Ana Pérez',
      phone: '300 123 4567',
      message: 'Quiero probar Fiaro.',
    });

    expect(execute).toHaveBeenCalledExactlyOnceWith({
      name: 'Ana Pérez',
      phone: '300 123 4567',
      email: undefined,
      message: 'Quiero probar Fiaro.',
    });
    expect(response).toEqual({ received: true });
  });

  it.each(['https://spam.example', '  x '])(
    'con el campo señuelo lleno (%j) responde igual pero no guarda nada',
    async (website) => {
      const { controller, execute } = setup();

      const response = await controller.createLead({
        name: 'Robot',
        email: 'robot@spam.example',
        message: 'Compra ya',
        website,
      });

      expect(response).toEqual({ received: true });
      expect(execute).not.toHaveBeenCalled();
    },
  );

  it('con el señuelo vacío o en blanco, es un contacto normal', async () => {
    const { controller, execute } = setup();

    await controller.createLead({
      name: 'Ana',
      email: 'ana@ejemplo.co',
      message: 'Hola, quiero info',
      website: '   ',
    });

    expect(execute).toHaveBeenCalledOnce();
  });
});
