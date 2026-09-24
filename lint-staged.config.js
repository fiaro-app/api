const prettier =
  'prettier --write --cache --cache-location node_modules/.cache/prettier/.prettier-cache';

/**
 * Se ejecuta en cada commit (hook pre-commit) y solo sobre los archivos en staging: el tiempo
 * del commit depende de lo que cambiaste, no del tamaño del proyecto.
 *
 * @type {import('lint-staged').Configuration}
 */
export default {
  '*.ts': [
    'eslint --fix --max-warnings 0',
    prettier,
    // Solo las pruebas que importan (directa o indirectamente) los archivos cambiados.
    'vitest related --run --project unit --passWithNoTests',
  ],
  '*.js': ['eslint --fix --max-warnings 0', prettier],
  '*.{json,yml,yaml}': prettier,
};
