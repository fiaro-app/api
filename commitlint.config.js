/**
 * Mensajes de commit con Conventional Commits (`feat:`, `fix:`, `docs:`...), la convención que
 * ya usa el historial del repo. Se valida en el hook commit-msg.
 *
 * @type {import('@commitlint/types').UserConfig}
 */
export default {
  extends: ['@commitlint/config-conventional'],
};
