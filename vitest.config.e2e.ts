import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Igual que las pruebas unitarias: SWC emite la metadata de decoradores que necesita NestJS.
  // SWC aún no reconoce `es2025` (el target del tsconfig); `esnext` no transforma la sintaxis
  // y Node 24 la ejecuta tal cual. El build de producción sigue usando tsc.
  plugins: [swc.vite({ jsc: { target: 'esnext' } })],
  test: {
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
  },
});
