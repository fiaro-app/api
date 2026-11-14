import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * Dos proyectos, una sola configuración de compilación y de cobertura:
 * - `unit`: los `*.spec.ts` de `src`, junto al código que prueban. No necesitan infraestructura.
 * - `e2e`: los `*.e2e-spec.ts` de `test`, contra un PostgreSQL real (ver `test/support/global-setup.ts`).
 *
 * `vitest run --project unit` o `--project e2e` corre uno solo; `vitest run --coverage` corre
 * ambos y mide la cobertura de las dos suites juntas, que es la que lee SonarCloud.
 */
export default defineConfig({
  // SWC compila las pruebas como espera NestJS (metadata de decoradores para la inyección de
  // dependencias) y la cobertura de Vitest reconoce su código de decoradores y no lo cuenta.
  // SWC aún no reconoce `es2025` (el target del tsconfig); `esnext` no transforma la sintaxis
  // y Node 24 la ejecuta tal cual. El build de producción sigue usando tsc.
  // Los alias `@/` y `@test/` salen de `paths` en tsconfig.json: una sola definición para todo.
  resolve: { tsconfigPaths: true },
  plugins: [swc.vite({ jsc: { target: 'esnext' } })],
  test: {
    root: './',
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['src/**/*.spec.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'e2e',
          include: ['test/**/*.e2e-spec.ts'],
          // Crea una base de datos por corrida y le aplica las migraciones (ver el archivo).
          globalSetup: ['./test/support/global-setup.ts'],
          // Todas las suites comparten esa base de datos: una a la vez para que no se pisen.
          fileParallelism: false,
          // Cada inicio de sesión calcula un hash de contraseña, que es lento a propósito.
          testTimeout: 30_000,
        },
      },
    ],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      /**
       * Fuera solo lo que no es código de la aplicación: las pruebas, el punto de entrada
       * (`main.ts` solo hace `listen`; el smoke test del CI arranca la imagen de producción) y el
       * cliente que genera Prisma. Lo demás cuenta, incluido lo que solo cubren las pruebas e2e.
       */
      exclude: [
        'src/**/*.spec.ts',
        'src/**/__fixtures__/**',
        'src/main.ts',
        'src/**/generated/**',
      ],
      // lcov es el formato que lee SonarCloud; text lo muestra en la terminal.
      reporter: ['text', 'lcov'],
      thresholds: {
        // Cada archivo cumple el mínimo: un promedio alto no esconde un archivo sin probar.
        perFile: true,
        lines: 95,
        functions: 95,
        branches: 95,
        statements: 95,
      },
    },
  },
});
