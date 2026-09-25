import { describe, expect, it } from 'vitest';
import { onlyFromLevel } from '@/shared/infrastructure/logging/level-filter.js';
import { createLogger } from '@/shared/infrastructure/logging/logger.factory.js';

function collector() {
  const lines: string[] = [];
  return {
    lines,
    destination: { write: (line: string) => lines.push(line) },
    messages: () =>
      lines.map((line) => (JSON.parse(line) as { msg: string }).msg),
  };
}

const line = (level: string, msg = 'algo') =>
  `${JSON.stringify({ level, time: '2026-09-25T10:00:00.000Z', msg })}\n`;

describe('onlyFromLevel', () => {
  it.each(['warn', 'error', 'fatal'])(
    'deja pasar %s, el nivel indicado o uno de arriba',
    (level) => {
      const sink = collector();
      const filtered = onlyFromLevel(sink.destination, 'warn');

      filtered.write(line(level));

      expect(sink.lines).toEqual([line(level)]);
    },
  );

  it.each(['trace', 'debug', 'info'])(
    'descarta %s, que está por debajo',
    (level) => {
      const sink = collector();
      const filtered = onlyFromLevel(sink.destination, 'warn');

      filtered.write(line(level));

      expect(sink.lines).toEqual([]);
    },
  );

  it('con otro nivel mínimo, deja pasar desde ese', () => {
    const sink = collector();
    const filtered = onlyFromLevel(sink.destination, 'error');

    filtered.write(line('warn'));
    filtered.write(line('error'));
    filtered.write(line('fatal'));

    expect(sink.lines).toEqual([line('error'), line('fatal')]);
  });

  it('un nivel que Pino no conoce no deja pasar nada', () => {
    const sink = collector();
    const filtered = onlyFromLevel(sink.destination, 'ruidoso' as 'warn');

    filtered.write(line('warn'));
    filtered.write(line('fatal'));

    expect(sink.lines).toEqual([]);
  });

  it('descarta lo que no empieza con el nivel: texto suelto o JSON con otro orden', () => {
    const sink = collector();
    const filtered = onlyFromLevel(sink.destination, 'warn');

    filtered.write('esto no es de Pino\n');
    filtered.write('{"time":"2026-09-25T10:00:00.000Z","level":"error"}\n');
    filtered.write('{"level":30,"msg":"nivel numérico"}\n');
    filtered.write('\n');

    expect(sink.lines).toEqual([]);
  });

  describe('con el logger de la aplicación', () => {
    it('pasan warn, error y fatal, y no trace, debug ni info', () => {
      const sink = collector();
      const logger = createLogger({
        level: 'trace',
        destination: onlyFromLevel(sink.destination, 'warn'),
      });

      logger.trace('t');
      logger.debug('d');
      logger.info('i');
      logger.warn('w');
      logger.error('e');
      logger.fatal('f');

      expect(sink.messages()).toEqual(['w', 'e', 'f']);
    });

    it('también filtra a un logger hijo, que es el que escribe la línea de cada petición', () => {
      const sink = collector();
      const logger = createLogger({
        level: 'info',
        destination: onlyFromLevel(sink.destination, 'warn'),
      });
      const child = logger.child({ requestId: 'r1' });

      child.info('sale bien');
      child.warn('sale mal');

      expect(sink.messages()).toEqual(['sale mal']);
    });
  });
});
