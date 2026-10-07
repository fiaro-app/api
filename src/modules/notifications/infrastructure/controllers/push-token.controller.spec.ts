import { HttpStatus, RequestMethod } from '@nestjs/common';
import {
  HTTP_CODE_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants.js';
import { describe, expect, it, vi } from 'vitest';
import type { PushTokenInput } from '@/modules/notifications/application/dtos/push-token.dto.js';
import type { RegisterPushTokenUseCase } from '@/modules/notifications/application/use-cases/register-push-token.use-case.js';
import type { RevokePushTokenUseCase } from '@/modules/notifications/application/use-cases/revoke-push-token.use-case.js';
import { PushTokenController } from '@/modules/notifications/infrastructure/controllers/push-token.controller.js';
import type { AuthenticatedUser } from '@/shared/application/ports/session-resolver.port.js';

const USER: AuthenticatedUser = {
  id: 'user-1',
  phone: '+573001234567',
  fullName: 'Ana Prueba',
  mustChangePassword: false,
};

const BODY = { token: 'ExponentPushToken[dispositivo-1]' };

/** El método de la clase como lo ve Nest: se lee sin enlazarlo, para no tocar `this`. */
function handlerOf(name: 'register' | 'revoke'): object {
  return Reflect.get(PushTokenController.prototype, name);
}

function setup() {
  const registerExecute = vi.fn<(input: PushTokenInput) => Promise<void>>(() =>
    Promise.resolve(),
  );
  const revokeExecute = vi.fn<(input: PushTokenInput) => Promise<void>>(() =>
    Promise.resolve(),
  );
  const controller = new PushTokenController(
    { execute: registerExecute } as unknown as RegisterPushTokenUseCase,
    { execute: revokeExecute } as unknown as RevokePushTokenUseCase,
  );
  return { controller, registerExecute, revokeExecute };
}

describe('PushTokenController', () => {
  it('publica dos POST que no devuelven cuerpo: registrar y quitar', () => {
    const routes = [handlerOf('register'), handlerOf('revoke')].map(
      (handler) => ({
        method: Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod,
        status: Reflect.getMetadata(HTTP_CODE_METADATA, handler) as number,
      }),
    );

    expect(routes).toEqual([
      { method: RequestMethod.POST, status: HttpStatus.NO_CONTENT },
      { method: RequestMethod.POST, status: HttpStatus.NO_CONTENT },
    ]);
    expect(Reflect.getMetadata(PATH_METADATA, handlerOf('revoke'))).toBe(
      'revoke',
    );
  });

  it('registra el token para la persona de la sesión, no la que venga en el cuerpo', async () => {
    const { controller, registerExecute } = setup();

    await expect(controller.register(BODY, USER)).resolves.toBeUndefined();

    expect(registerExecute).toHaveBeenCalledWith({
      userId: 'user-1',
      token: 'ExponentPushToken[dispositivo-1]',
    });
  });

  it('quita el token para la persona de la sesión', async () => {
    const { controller, revokeExecute } = setup();

    await expect(controller.revoke(BODY, USER)).resolves.toBeUndefined();

    expect(revokeExecute).toHaveBeenCalledWith({
      userId: 'user-1',
      token: 'ExponentPushToken[dispositivo-1]',
    });
  });
});
