import { describe, expect, it } from 'vitest';
import { negotiateLanguage } from '@/shared/infrastructure/i18n/accept-language.js';

const SUPPORTED = ['es', 'en'] as const;

const negotiate = (header: string | undefined) =>
  negotiateLanguage(header, SUPPORTED, 'es');

describe('negotiateLanguage', () => {
  it('sin cabecera responde el idioma de por defecto', () => {
    expect(negotiate(undefined)).toBe('es');
    expect(negotiate('')).toBe('es');
  });

  it('elige el idioma pedido cuando la API lo habla', () => {
    expect(negotiate('en')).toBe('en');
    expect(negotiate('es')).toBe('es');
  });

  it('no distingue mayúsculas ni espacios', () => {
    expect(negotiate(' EN ')).toBe('en');
  });

  it('una región sirve el idioma base', () => {
    expect(negotiate('en-US')).toBe('en');
    expect(negotiate('es-CO')).toBe('es');
  });

  it('elige el de mayor peso (q), sin importar el orden', () => {
    expect(negotiate('es;q=0.5, en;q=0.9')).toBe('en');
    expect(negotiate('en;q=0.2, es')).toBe('es');
  });

  it('a igual peso gana el que aparece primero', () => {
    expect(negotiate('en, es')).toBe('en');
    expect(negotiate('es, en')).toBe('es');
  });

  it('salta los idiomas que la API no habla y usa el siguiente', () => {
    expect(negotiate('fr, de;q=0.8, en;q=0.5')).toBe('en');
  });

  it('si no habla ninguno responde el idioma de por defecto', () => {
    expect(negotiate('fr, de;q=0.8')).toBe('es');
  });

  it('q=0 excluye un idioma', () => {
    expect(negotiate('en;q=0, es;q=0.1')).toBe('es');
    expect(negotiate('en;q=0')).toBe('es');
  });

  it('el comodín acepta cualquier idioma: responde el de por defecto', () => {
    expect(negotiate('*')).toBe('es');
    expect(negotiate('fr, *;q=0.5, en;q=0.1')).toBe('es');
  });

  it('ignora un peso que no es un número de 0 a 1', () => {
    expect(negotiate('en;q=abc, es;q=0.1')).toBe('es');
    expect(negotiate('en;q=2, es;q=0.1')).toBe('es');
    expect(negotiate('en;q=-1, es;q=0.1')).toBe('es');
  });

  it('ignora las entradas vacías y los parámetros que no son q', () => {
    expect(negotiate(',, en;level=1;q=0.4 ,')).toBe('en');
  });

  it('con un solo idioma disponible, pedir otro no es un error', () => {
    expect(negotiateLanguage('en-US,en;q=0.9', ['es'], 'es')).toBe('es');
  });
});
