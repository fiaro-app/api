import { describe, expect, it, vi } from 'vitest';
import { createLogBatchProcessor } from '@/shared/infrastructure/logging/log-batch-processor.js';

const NOW = new Date('2026-09-25T10:05:00.000Z');
const entries = [
  { level: 'info', time: '2026-09-25T10:00:00.000Z', msg: 'una' },
  { level: 'info', time: '2026-09-25T10:00:01.000Z', msg: 'otra' },
];

describe('createLogBatchProcessor', () => {
  it('guarda las líneas del lote con el id del trabajo y la hora en que se guardan', async () => {
    const save = vi.fn(() => Promise.resolve());
    const process = createLogBatchProcessor({ save }, () => NOW);

    await process({ id: 'lote-7', data: { entries } });

    expect(save).toHaveBeenCalledOnce();
    const calls = save.mock.calls as unknown as [
      { _id: string; time: Date; recordedAt: Date }[],
    ][];
    expect(calls[0]?.[0].map((document) => document._id)).toEqual([
      'lote-7:0',
      'lote-7:1',
    ]);
    expect(calls[0]?.[0][0]?.time).toEqual(new Date(entries[0]?.time ?? ''));
    expect(calls[0]?.[0][0]?.recordedAt).toBe(NOW);
  });

  it('si guardar falla el error sube, para que BullMQ reintente', async () => {
    const process = createLogBatchProcessor({
      save: () => Promise.reject(new Error('MongoDB no responde')),
    });

    await expect(process({ id: 'lote-7', data: { entries } })).rejects.toThrow(
      'MongoDB no responde',
    );
  });

  it('un trabajo sin identificador no se guarda', async () => {
    const save = vi.fn(() => Promise.resolve());
    const process = createLogBatchProcessor({ save });

    await expect(process({ id: undefined, data: { entries } })).rejects.toThrow(
      'no trae identificador',
    );
    expect(save).not.toHaveBeenCalled();
  });

  it('usa la hora del reloj si no se le da otro', async () => {
    const save = vi.fn(() => Promise.resolve());
    const process = createLogBatchProcessor({ save });

    await process({ id: 'lote-7', data: { entries } });

    const calls = save.mock.calls as unknown as [{ recordedAt: Date }[]][];
    expect(calls[0]?.[0][0]?.recordedAt).toBeInstanceOf(Date);
  });
});
