/**
 * Peers opcionales que algunos paquetes de runtime declaran hacia herramientas que solo usamos
 * en desarrollo, por paquete. La API no carga código que los importe: `vitest` y `mysql2` solo
 * los importa `better-auth/test`, `react` y `react-dom` solo `better-auth/react`, y `prisma` y
 * `typescript` no los importa ningún paquete de runtime.
 *
 * @type {ReadonlyMap<string, readonly string[]>}
 */
const DEV_ONLY_PEERS = new Map([
  ['@prisma/client', ['prisma', 'typescript']],
  ['@better-auth/prisma-adapter', ['prisma']],
  ['better-auth', ['mysql2', 'prisma', 'react', 'react-dom', 'vitest']],
]);

/**
 * Hook de pnpm: recibe el manifiesto de cada paquete antes de resolver sus dependencias.
 *
 * pnpm resuelve cada peer opcional con lo que ya está en el árbol del proyecto, también las
 * herramientas de desarrollo y sus dependencias, y lo anota en el lockfile como dependencia del
 * paquete. `pnpm install --prod` (la imagen `prod`) la conserva y arrastra el CLI de Prisma,
 * Vitest, TypeScript y sus árboles. Quitar el peer evita el enlace y el lockfile deja de listarlos.
 *
 * pnpm guarda el hash de este archivo en el lockfile (`pnpmfileChecksum`): cualquier cambio,
 * incluso a un comentario, exige `pnpm install` para regenerarlo.
 *
 * @param {{ name?: string, peerDependencies?: Record<string, string>, peerDependenciesMeta?: Record<string, unknown> }} pkg - manifiesto del paquete
 * @returns el mismo manifiesto, sin los peers de `DEV_ONLY_PEERS`
 */
function readPackage(pkg) {
  for (const peer of DEV_ONLY_PEERS.get(pkg.name ?? '') ?? []) {
    delete pkg.peerDependencies?.[peer];
    delete pkg.peerDependenciesMeta?.[peer];
  }
  return pkg;
}

module.exports = { hooks: { readPackage } };
