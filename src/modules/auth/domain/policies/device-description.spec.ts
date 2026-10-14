import { describe, expect, it } from 'vitest';
import { describeDevice } from '@/modules/auth/domain/policies/device-description.js';

describe('describeDevice', () => {
  it.each([
    [
      'Chrome en Windows',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Chrome',
      'Windows',
    ],
    [
      'Safari en macOS',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
      'Safari',
      'macOS',
    ],
    [
      'Firefox en Linux',
      'Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0',
      'Firefox',
      'Linux',
    ],
    [
      'Edge en Windows',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
      'Edge',
      'Windows',
    ],
    [
      'Opera en Windows',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 OPR/112.0.0.0',
      'Opera',
      'Windows',
    ],
    [
      'Samsung Internet en Android',
      'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/25.0 Chrome/121.0.0.0 Mobile Safari/537.36',
      'Samsung Internet',
      'Android',
    ],
    [
      'Chrome en Android',
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
      'Chrome',
      'Android',
    ],
    [
      'Safari en iOS',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
      'Safari',
      'iOS',
    ],
    [
      'Chrome en iOS',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.153 Mobile/15E148 Safari/604.1',
      'Chrome',
      'iOS',
    ],
    ['App móvil en Android', 'okhttp/4.12.0', 'App móvil', 'Android'],
    [
      'App móvil en iOS',
      'Fiaro/1.0 CFNetwork/1485 Darwin/23.1.0',
      'App móvil',
      'iOS',
    ],
  ])('reconoce %s', (label, userAgent, client, os) => {
    expect(describeDevice(userAgent)).toEqual({ client, os, label });
  });

  it.each([[null], [''], ['   ']])(
    'sin User-Agent (%j) es un dispositivo desconocido',
    (userAgent) => {
      expect(describeDevice(userAgent)).toEqual({
        client: null,
        os: null,
        label: 'Dispositivo desconocido',
      });
    },
  );

  it('con solo el navegador reconocido, el texto es el navegador', () => {
    expect(describeDevice('Mozilla/5.0 Firefox/127.0')).toEqual({
      client: 'Firefox',
      os: null,
      label: 'Firefox',
    });
  });

  it('con solo el sistema reconocido, el texto es el sistema', () => {
    expect(describeDevice('curl on Linux')).toEqual({
      client: null,
      os: 'Linux',
      label: 'Linux',
    });
  });

  it('un agente que no reconoce nada es un dispositivo desconocido', () => {
    expect(describeDevice('algo-raro/1.0')).toEqual({
      client: null,
      os: null,
      label: 'Dispositivo desconocido',
    });
  });
});
