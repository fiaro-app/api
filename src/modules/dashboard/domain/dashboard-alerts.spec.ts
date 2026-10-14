import { describe, expect, it } from 'vitest';
import { buildDashboardAlerts } from '@/modules/dashboard/domain/dashboard-alerts.js';

describe('buildDashboardAlerts', () => {
  it('sin nada que avisar, no da ninguna alerta', () => {
    expect(
      buildDashboardAlerts({
        collectorsWithoutRouteStarted: 0,
        settlementsWithDifferences: 0,
      }),
    ).toEqual([]);
  });

  it('un cobrador sin ruta, en singular', () => {
    expect(
      buildDashboardAlerts({
        collectorsWithoutRouteStarted: 1,
        settlementsWithDifferences: 0,
      }),
    ).toEqual(['1 cobrador aún no ha iniciado su ruta hoy.']);
  });

  it('varios cobradores sin ruta, en plural', () => {
    expect(
      buildDashboardAlerts({
        collectorsWithoutRouteStarted: 3,
        settlementsWithDifferences: 0,
      }),
    ).toEqual(['3 cobradores aún no han iniciado su ruta hoy.']);
  });

  it('un cuadre con diferencias, en singular', () => {
    expect(
      buildDashboardAlerts({
        collectorsWithoutRouteStarted: 0,
        settlementsWithDifferences: 1,
      }),
    ).toEqual(['1 cuadre tiene diferencias pendientes de revisar.']);
  });

  it('varios cuadres con diferencias, en plural', () => {
    expect(
      buildDashboardAlerts({
        collectorsWithoutRouteStarted: 0,
        settlementsWithDifferences: 2,
      }),
    ).toEqual(['2 cuadres tienen diferencias pendientes de revisar.']);
  });

  it('las dos alertas juntas, en el orden del cobrador primero', () => {
    expect(
      buildDashboardAlerts({
        collectorsWithoutRouteStarted: 1,
        settlementsWithDifferences: 1,
      }),
    ).toEqual([
      '1 cobrador aún no ha iniciado su ruta hoy.',
      '1 cuadre tiene diferencias pendientes de revisar.',
    ]);
  });
});
