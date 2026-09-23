import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // SWC compila las pruebas como espera NestJS (metadata de decoradores para la inyección de
  // dependencias) y la cobertura de Vitest reconoce su código de decoradores y no lo cuenta.
  // SWC aún no reconoce `es2025` (el target del tsconfig); `esnext` no transforma la sintaxis
  // y Node 24 la ejecuta tal cual. El build de producción sigue usando tsc.
  plugins: [swc.vite({ jsc: { target: 'esnext' } })],
  test: {
    root: './',
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // main.ts y los módulos de Nest solo arman la aplicación: los cubren las pruebas e2e.
      exclude: ['src/**/*.spec.ts', 'src/main.ts', 'src/**/*.module.ts'],
      // lcov es el formato que lee SonarCloud; text lo muestra en la terminal.
      reporter: ['text', 'lcov'],
      // El mismo mínimo que exige la quality gate de SonarCloud para código nuevo.
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
