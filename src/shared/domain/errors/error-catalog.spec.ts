import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ERROR_AREAS,
  ERROR_CATALOG,
  ERROR_CODE_BY_API_CODE,
  ERROR_CODE_FORMAT,
  ERROR_ORIGINS,
  PROVIDER_ERROR_CODES,
  errorCodeInfo,
} from '@/shared/domain/errors/error-catalog.js';
import errorsEs from '@/i18n/es/errors.json' with { type: 'json' };

/** Cada clase de error de dominio del código, con su `code` y su `errorCode`, leídos del archivo. */
function domainErrors(): {
  file: string;
  cls: string;
  code: string;
  errorCode: string | null;
}[] {
  const found: {
    file: string;
    cls: string;
    code: string;
    errorCode: string | null;
  }[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else if (entry.name.endsWith('.error.ts')) {
        const source = readFileSync(path, 'utf8');
        const cls = /class (\w+) extends DomainError/.exec(source)?.[1];
        if (cls !== undefined) {
          found.push({
            file: path,
            cls,
            code: /readonly code = '(\w+)'/.exec(source)?.[1] ?? '',
            errorCode: /readonly errorCode = '(\w+)'/.exec(source)?.[1] ?? null,
          });
        }
      }
    }
  };
  walk('src');
  return found;
}

describe('catálogo de códigos de error (D-134)', () => {
  it('cada código cumple la forma letra de área + 3 dígitos + letra de origen, con áreas y orígenes conocidos', () => {
    for (const code of Object.keys(ERROR_CATALOG)) {
      expect(code, code).toMatch(ERROR_CODE_FORMAT);
      expect(Object.keys(ERROR_AREAS), code).toContain(code[0]);
      expect(Object.keys(ERROR_ORIGINS), code).toContain(code[4]);
    }
  });

  it('cada código trae su título y qué mirar', () => {
    for (const [code, info] of Object.entries(ERROR_CATALOG)) {
      expect(info.title.length, code).toBeGreaterThan(5);
      expect(info.hint.length, code).toBeGreaterThan(5);
    }
  });

  it('toda clase de error de dominio declara un código del catálogo, y nadie lo comparte', () => {
    const errors = domainErrors();
    const codes = errors.map((error) => error.errorCode);

    expect(errors.length).toBeGreaterThan(40);
    for (const error of errors) {
      expect(error.errorCode, error.cls).not.toBeNull();
      expect(ERROR_CATALOG, error.cls).toHaveProperty(error.errorCode ?? '');
    }
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('todo código de la API con texto tiene su código único: el de su clase o el genérico', () => {
    const owned = new Set(domainErrors().map((error) => error.code));
    const uncovered = Object.keys(errorsEs).filter(
      (key) => !(key in ERROR_CODE_BY_API_CODE) && !owned.has(key),
    );

    expect(uncovered).toEqual([]);
  });

  it('todo código que apunta el mapa existe en el catálogo, y los de proveedor también', () => {
    for (const code of [
      ...Object.values(ERROR_CODE_BY_API_CODE),
      ...Object.values(PROVIDER_ERROR_CODES),
    ]) {
      expect(ERROR_CATALOG, code).toHaveProperty(code);
    }
  });

  it('los proveedores terminan en la letra de su origen', () => {
    expect(PROVIDER_ERROR_CODES.DATABASE.endsWith('D')).toBe(true);
    expect(PROVIDER_ERROR_CODES.REDIS.endsWith('R')).toBe(true);
    expect(PROVIDER_ERROR_CODES.MONGO.endsWith('M')).toBe(true);
    expect(PROVIDER_ERROR_CODES.STORAGE.endsWith('S')).toBe(true);
    expect(PROVIDER_ERROR_CODES.EMAIL.endsWith('E')).toBe(true);
    expect(PROVIDER_ERROR_CODES.PUSH.endsWith('X')).toBe(true);
    expect(PROVIDER_ERROR_CODES.CLOUDFLARE.endsWith('F')).toBe(true);
  });

  it('errorCodeInfo devuelve la explicación, o undefined si no existe', () => {
    expect(errorCodeInfo('L003A')?.title).toMatch(/préstamo/i);
    expect(errorCodeInfo('Z999Z')).toBeUndefined();
  });
});
