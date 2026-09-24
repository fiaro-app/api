// @ts-check
import eslint from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import prettier from 'eslint-config-prettier/flat';
import tsdoc from 'eslint-plugin-tsdoc';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Capas de cada módulo y de `shared` (ver ARCHITECTURE.md §2 y §3). */
const LAYERS = ['domain', 'application', 'infrastructure'];

/** Archivos que importan: elementos de alguno de estos tipos. */
const from = (...types) => ({ element: { types: { anyOf: types } } });

/**
 * Destino permitido: elementos de estos tipos. Con `sameModule`, solo del mismo módulo que el
 * archivo que importa (el nombre del módulo se captura de la ruta `src/modules/<módulo>`).
 */
const elements = (types, { sameModule = false } = {}) => ({
  to: {
    element: {
      types: { anyOf: types },
      ...(sameModule && {
        captured: { module: '{{ from.element.captured.module }}' },
      }),
    },
  },
});

/** Destino permitido: paquetes externos (todos o solo los indicados) y módulos de Node. */
const packages = (source) =>
  source
    ? { to: { module: { origin: 'external', source } } }
    : { to: { module: { origin: ['external', 'core'] } } };

export default defineConfig(
  globalIgnores([
    'dist/',
    'coverage/',
    'docs/',
    'src/shared/infrastructure/persistence/generated/',
  ]),

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
        // Capas de cada módulo: src/modules/<módulo>/<capa>.
        ...LAYERS.map((layer) => ({
          type: layer,
          pattern: `src/modules/*/${layer}`,
          partialMatch: false,
          capture: ['module'],
        })),
        // <módulo>.module.ts: une las capas del módulo para NestJS.
        {
          type: 'module',
          pattern: 'src/modules/*',
          partialMatch: false,
          capture: ['module'],
        },
        // Código transversal, con las mismas tres capas: src/shared/<capa>.
        ...LAYERS.map((layer) => ({
          type: `shared-${layer}`,
          pattern: `src/shared/${layer}`,
          partialMatch: false,
        })),
        { type: 'config', pattern: 'src/config', partialMatch: false },
        { type: 'i18n', pattern: 'src/i18n', partialMatch: false },
        // Raíz de composición: main.ts y app.module.ts.
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
            // domain: su propio domain y el domain compartido. Nunca el domain de otro módulo
            // (los agregados se referencian por ID) ni librerías externas.
            {
              from: from('domain'),
              allow: elements(['domain'], { sameModule: true }),
            },
            { from: from('domain'), allow: elements(['shared-domain']) },

            // application: el domain de su módulo, el application de cualquier módulo (así un módulo
            // usa los casos de uso de otro) y lo compartido.
            {
              from: from('application'),
              allow: elements(['domain'], { sameModule: true }),
            },
            {
              from: from('application'),
              allow: elements([
                'application',
                'shared-domain',
                'shared-application',
              ]),
            },

            // infrastructure: las capas de su módulo, lo compartido y la configuración.
            {
              from: from('infrastructure'),
              allow: elements(LAYERS, { sameModule: true }),
            },
            {
              from: from('infrastructure'),
              allow: elements([
                'shared-domain',
                'shared-application',
                'shared-infrastructure',
                'config',
                'i18n',
              ]),
            },

            // <módulo>.module.ts: las capas de su módulo, otros módulos de Nest y lo compartido.
            {
              from: from('module'),
              allow: elements(LAYERS, { sameModule: true }),
            },
            {
              from: from('module'),
              allow: elements(['module', 'shared-infrastructure', 'config']),
            },

            // shared: las mismas reglas de capas, sin depender de ningún módulo.
            { from: from('shared-domain'), allow: elements(['shared-domain']) },
            {
              from: from('shared-application'),
              allow: elements(['shared-domain', 'shared-application']),
            },
            {
              from: from('shared-infrastructure'),
              allow: elements([
                'shared-domain',
                'shared-application',
                'shared-infrastructure',
                'config',
                'i18n',
              ]),
            },

            // config: lectura y validación del entorno.
            { from: from('config'), allow: elements(['config']) },

            // Raíz de composición: registra los módulos y lo compartido.
            {
              from: from('app'),
              allow: elements([
                'module',
                'shared-infrastructure',
                'config',
                'i18n',
                'app',
              ]),
            },

            // Paquetes externos: application solo usa la inyección de dependencias de Nest y los
            // contratos; domain ninguno; el resto, cualquiera.
            {
              from: from('application', 'shared-application'),
              allow: packages(['@nestjs/common', '@fiaro-app/contracts']),
            },
            {
              from: from(
                'infrastructure',
                'shared-infrastructure',
                'module',
                'config',
                'app',
              ),
              allow: packages(),
            },
          ],
        },
      ],
    },
  },

  // Los comentarios de documentación siguen la sintaxis TSDoc (`@param nombre - texto`, `{@link X}`):
  // es la que entienden el editor y Compodoc.
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    plugins: { tsdoc },
    rules: { 'tsdoc/syntax': 'error' },
  },

  // Sin rutas relativas: todo import interno usa el alias de `paths` en tsconfig.json
  // (`@/` para src, `@test/` para test), así mover un archivo no rompe los imports de los demás.
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['./*', '../*'],
              message:
                'Usa el alias: `@/` para lo de src y `@test/` para lo de test.',
            },
          ],
        },
      ],
    },
  },

  // Código pequeño y legible (ARCHITECTURE.md §2): archivos y funciones cortos, con poca
  // ramificación. Los límites cuentan solo código, sin líneas en blanco ni comentarios.
  {
    files: ['src/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'max-lines': [
        'error',
        { max: 200, skipBlankLines: true, skipComments: true },
      ],
      'max-lines-per-function': [
        'error',
        { max: 50, skipBlankLines: true, skipComments: true },
      ],
      complexity: ['error', 10],
      'max-depth': ['error', 3],
    },
  },

  // Las pruebas son listas de casos, más largas que el código, pero también acotadas.
  {
    files: ['**/*.spec.ts', 'test/**/*.ts'],
    rules: {
      'max-lines': [
        'error',
        { max: 300, skipBlankLines: true, skipComments: true },
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
