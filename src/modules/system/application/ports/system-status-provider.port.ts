/** De dónde {@link GetHealthUseCase} saca el estado operativo del servicio. */
export interface SystemStatusProvider {
  /** Versión desplegada de la API, de `package.json`. */
  getAppVersion(): string;

  /** Si operaciones declaró una ventana de mantenimiento (`MAINTENANCE_MODE`). */
  isUnderMaintenance(): boolean;
}
