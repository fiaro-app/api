import type { Request } from 'express';
import { describe, expect, it } from 'vitest';
import { clientTraceFor } from '@/shared/infrastructure/logging/client-trace.js';

const SESSION = '0198f8e0-1111-7222-8333-444455556666';
const TRACE = '4bf92f3577b34da6a3ce929d0e0e4736';
const PARENT = `00-${TRACE}-00f067aa0ba902b7-01`;

const request = (headers: Record<string, string>) =>
  ({ headers }) as unknown as Request;

describe('clientTraceFor', () => {
  it('toma la sesión, la pantalla y la traza que envió la app', () => {
    const trace = clientTraceFor(
      request({
        'x-session-id': SESSION,
        'x-client-screen': '/visit/[loanId]',
        traceparent: PARENT,
      }),
    );

    expect(trace).toMatchObject({
      sessionId: SESSION,
      screen: '/visit/[loanId]',
      traceId: TRACE,
    });
    expect(trace.spanId).toMatch(/^[0-9a-f]{16}$/);
  });

  it('sin cabeceras crea una traza nueva, y cada petición tiene su propio span', () => {
    const a = clientTraceFor(request({}));
    const b = clientTraceFor(request({}));

    expect(a.sessionId).toBeUndefined();
    expect(a.screen).toBeUndefined();
    expect(a.traceId).toMatch(/^[0-9a-f]{32}$/);
    expect(a.traceId).not.toBe(b.traceId);
    expect(a.spanId).not.toBe(b.spanId);
  });

  it('ignora lo que no cumple su forma exacta: nada de eso llega al log', () => {
    const trace = clientTraceFor(
      request({
        'x-session-id': 'no-soy-un-uuid\nX: inyectado',
        'x-client-screen': '/visit/<script>alert(1)</script>',
        traceparent: `00-${'0'.repeat(32)}-00f067aa0ba902b7-01`,
      }),
    );

    expect(trace.sessionId).toBeUndefined();
    expect(trace.screen).toBeUndefined();
    expect(trace.traceId).not.toBe('0'.repeat(32));
    expect(trace.traceId).toMatch(/^[0-9a-f]{32}$/);
  });

  it('rechaza pantallas largas, sin barra inicial o con espacios, y trazas mal formadas', () => {
    for (const screen of [
      `/${'a'.repeat(80)}`,
      'sin-barra',
      '/con espacio',
      '/con\nsalto',
    ]) {
      expect(
        clientTraceFor(request({ 'x-client-screen': screen })).screen,
        screen,
      ).toBeUndefined();
    }
    expect(clientTraceFor(request({ traceparent: 'basura' })).traceId).toMatch(
      /^[0-9a-f]{32}$/,
    );
  });

  it('calcula la traza una sola vez por petición', () => {
    const req = request({});

    expect(clientTraceFor(req)).toBe(clientTraceFor(req));
  });
});
