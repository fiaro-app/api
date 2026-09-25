import { describe, expect, it } from 'vitest';
import { describeFailedJob } from '@/shared/infrastructure/messaging/job-failure.js';

const job = (attemptsMade: number, attempts?: number) => ({
  name: 'auth.sign_in.succeeded',
  attemptsMade,
  opts: { attempts },
});

describe('describeFailedJob', () => {
  const error = new Error('MongoDB no responde');

  it('un intento con intentos por delante es un aviso: BullMQ reintenta', () => {
    expect(describeFailedJob(job(2, 6), error)).toEqual({
      level: 'warn',
      message:
        'No se pudo guardar el trabajo auth.sign_in.succeeded (intento 2 de 6): MongoDB no responde.',
    });
  });

  it('el último intento es un error: el registro solo queda en el log', () => {
    const { level, message } = describeFailedJob(job(6, 6), error);

    expect(level).toBe('error');
    expect(message).toContain(
      'intento 6 de 6, ya no se reintenta: solo queda en el log',
    );
  });

  it('un trabajo sin número de intentos cuenta como de uno solo', () => {
    expect(describeFailedJob(job(1), error).level).toBe('error');
  });

  it('si el trabajo ya no existe es un error', () => {
    expect(describeFailedJob(undefined, error)).toEqual({
      level: 'error',
      message:
        'Un trabajo de la cola de registros falló y ya no existe: MongoDB no responde.',
    });
  });

  it('el mensaje no lleva los datos del trabajo', () => {
    const { message } = describeFailedJob(
      { ...job(1, 6), data: { phone: { last4: '4567' } } } as never,
      error,
    );

    expect(message).not.toContain('4567');
  });
});
