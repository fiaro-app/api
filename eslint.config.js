// @ts-check
import eslint from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Capas de la arquitectura (ver ARCHITECTURE.md §2 y §3). */
const LAYERS = ['domain', 'application', 'infrastructure', 'config', 'i18n'];

export default defineConfig(
  globalIgnores(['dist/', 'coverage/', 'docs/']),

  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Los módulos de Nest son clases vacías con decorador: `@Module({...}) export class AppModule {}`.
      '@typescript-eslint/no-extraneous-class': [
        'error',
        { allowWithDecorator: true },
      ],
    },
  },

  // Archivos de configuración en JavaScript: no forman parte del proyecto de TypeScript.
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  // Regla de dependencia entre capas, forzada por lint (ARCHITECTURE.md §3).
  {
    files: ['src/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    plugins: { boundaries },
    settings: {
      'import/resolver': { typescript: { alwaysTryTypes: true } },
      'boundaries/elements': [
        ...LAYERS.map((layer) => ({
          type: layer,
          pattern: `src/${layer}`,
          partialMatch: false,
        })),
        // Raíz de composición: main.ts y app.module.ts arman la aplicación con todas las capas.
        { type: 'app', pattern: 'src', partialMatch: false },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          // Revisa también paquetes externos y módulos de Node, no solo los archivos del proyecto.
          checkAllOrigins: true,
          policies: [
            // domain: solo se importa a sí mismo; ni framework ni librerías externas.
            {
              from: { element: { type: 'domain' } },
              allow: { to: { element: { type: 'domain' } } },
            },
            // application: usa domain. De afuera, solo la inyección de dependencias de Nest y los contratos.
            {
              from: { element: { type: 'application' } },
              allow: {
                to: {
                  element: { types: { anyOf: ['domain', 'application'] } },
                },
              },
            },
            {
              from: { element: { type: 'application' } },
              allow: {
                to: {
                  module: {
                    origin: 'external',
                    source: ['@nestjs/common', '@fiaro-app/contracts'],
                  },
                },
              },
            },
            // infrastructure: adaptadores; puede usar todas las capas internas y cualquier librería.
            {
              from: { element: { type: 'infrastructure' } },
              allow: {
                to: {
                  element: {
                    types: {
                      anyOf: [
                        'domain',
                        'application',
                        'infrastructure',
                        'config',
                        'i18n',
                      ],
                    },
                  },
                },
              },
            },
            // config: lectura y validación del entorno.
            {
              from: { element: { type: 'config' } },
              allow: { to: { element: { type: 'config' } } },
            },
            // Raíz de composición: une todo.
            {
              from: { element: { type: 'app' } },
              allow: {
                to: { element: { types: { anyOf: [...LAYERS, 'app'] } } },
              },
            },
            // Librerías externas y módulos de Node: solo fuera de domain y application.
            {
              from: {
                element: {
                  types: { anyOf: ['infrastructure', 'config', 'app'] },
                },
              },
              allow: { to: { module: { origin: ['external', 'core'] } } },
            },
          ],
        },
      ],
    },
  },

  // Pruebas: supertest y los mocks devuelven valores sin tipar.
  {
    files: ['**/*.spec.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },

  prettier,
);
