/** Margen de seguridad: el token se considera vencido 30 s antes de su `exp` real. */
export const MARGEN_EXPIRACION_MS = 30_000;

/**
 * Lee el claim `exp` del payload de un JWT (sin verificar la firma: eso es cosa del
 * backend) y lo devuelve en milisegundos epoch. `null` si el token está malformado
 * o no trae un `exp` numérico.
 */
export function leerExpiracionMs(token: string): number | null {
  const partes = token.split('.');
  if (partes.length !== 3 || !partes[1]) {
    return null;
  }
  try {
    const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const relleno = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const bytes = Uint8Array.from(atob(relleno), (c) => c.charCodeAt(0));
    const payload: unknown = JSON.parse(new TextDecoder().decode(bytes));
    const exp = (payload as { exp?: unknown } | null)?.exp;
    return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * ¿El token ya no sirve? Un token malformado o sin `exp` cuenta como vencido
 * (no se puede garantizar que siga vigente).
 */
export function tokenVencido(
  token: string,
  ahoraMs: number = Date.now(),
  margenMs: number = MARGEN_EXPIRACION_MS,
): boolean {
  const expMs = leerExpiracionMs(token);
  return expMs === null || expMs - margenMs <= ahoraMs;
}
