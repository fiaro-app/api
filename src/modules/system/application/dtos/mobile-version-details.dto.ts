/**
 * Versión mínima y más reciente de la app móvil, con dónde descargarla (PRODUCT.md §10:
 * version-gate obligatorio). La app la consulta antes de mostrar cualquier pantalla.
 */
export interface MobileVersionDetails {
  /** Por debajo de esta versión, la app bloquea con una pantalla de actualización. */
  readonly minimumSupportedVersion: string;
  /** La versión más reciente publicada, para mostrarla en esa pantalla. */
  readonly latestVersion: string;
  /** De dónde descargar el APK más reciente. */
  readonly downloadUrl: string;
}
