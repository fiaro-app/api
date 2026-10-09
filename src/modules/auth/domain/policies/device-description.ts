/** Cómo se describe el dispositivo de una sesión, para que la persona lo reconozca. */
export interface DeviceDescription {
  /** El navegador o la app (`Chrome`, `Safari`, `App móvil`...), o `null` si no se reconoce. */
  readonly client: string | null;
  /** El sistema operativo (`Windows`, `macOS`, `Android`, `iOS`...), o `null` si no se reconoce. */
  readonly os: string | null;
  /** Texto listo para mostrar: «Chrome en Windows», «App móvil en Android»... */
  readonly label: string;
}

/** Reglas en orden: la primera que coincide gana. Edge, Opera y Samsung llevan «Chrome» en su agente. */
const CLIENT_RULES: readonly (readonly [RegExp, string])[] = [
  [/\bEdg(e|A|iOS)?\//, 'Edge'],
  [/\bOPR\/|\bOpera\b/, 'Opera'],
  [/\bSamsungBrowser\//, 'Samsung Internet'],
  [/\bFirefox\/|\bFxiOS\//, 'Firefox'],
  [/\bChrome\/|\bCriOS\//, 'Chrome'],
  [/\bSafari\//, 'Safari'],
  [/\bokhttp\/|\bCFNetwork\/|\bExpo\b/, 'App móvil'],
];

/** Reglas en orden. iPhone/iPad llevan «like Mac OS X», así que van antes que macOS. */
const OS_RULES: readonly (readonly [RegExp, string])[] = [
  [
    /\biPhone\b|\biPad\b|\biPod\b|\bDarwin\/.*\bCFNetwork\b|\bCFNetwork\/.*\bDarwin\//,
    'iOS',
  ],
  [/\bAndroid\b|\bokhttp\//, 'Android'],
  [/\bWindows\b/, 'Windows'],
  [/\bCrOS\b/, 'ChromeOS'],
  [/\bMac OS X\b|\bMacintosh\b/, 'macOS'],
  [/\bLinux\b/, 'Linux'],
];

/**
 * Describe el dispositivo de una sesión a partir de su `User-Agent`, con lo justo para que la
 * persona reconozca «Esta sesión · Chrome» o «App móvil en Android» en su lista de sesiones. No es
 * una detección exhaustiva: lo que no reconoce queda en `null`, y sin nada reconocible el texto es
 * «Dispositivo desconocido».
 *
 * @param userAgent - La cabecera `User-Agent` que guardó la sesión, o `null` si no hubo.
 */
export function describeDevice(userAgent: string | null): DeviceDescription {
  if (userAgent === null || userAgent.trim() === '') {
    return { client: null, os: null, label: 'Dispositivo desconocido' };
  }
  const client = firstMatch(CLIENT_RULES, userAgent);
  const os = firstMatch(OS_RULES, userAgent);
  return { client, os, label: labelOf(client, os) };
}

function firstMatch(
  rules: readonly (readonly [RegExp, string])[],
  userAgent: string,
): string | null {
  return rules.find(([pattern]) => pattern.test(userAgent))?.[1] ?? null;
}

function labelOf(client: string | null, os: string | null): string {
  if (client !== null && os !== null) {
    return `${client} en ${os}`;
  }
  return client ?? os ?? 'Dispositivo desconocido';
}
