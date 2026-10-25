import { MARGEN_EXPIRACION_MS, leerExpiracionMs, tokenVencido } from './jwt';

/** Arma un JWT (sin firma real) con el payload dado, en base64url. */
function jwt(payload: object): string {
  const b64url = (o: object) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url(payload)}.firma`;
}

describe('jwt', () => {
  const AHORA = Date.UTC(2026, 9, 25, 12, 0, 0);
  const enSegundos = (ms: number) => Math.floor(ms / 1000);

  it('lee el exp del payload en milisegundos', () => {
    expect(leerExpiracionMs(jwt({ sub: 'a@b.co', exp: 1_800_000_000 }))).toBe(1_800_000_000_000);
  });

  it('decodifica base64url con caracteres - y _ en el payload', () => {
    // Los bytes 0xFB 0xFF generan "+/" en base64 estándar, es decir "-_" en base64url.
    const payload = btoa('{"x":"ûÿ???>>>","exp":1800000000}')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(leerExpiracionMs(`a.${payload}.c`)).toBe(1_800_000_000_000);
  });

  it('un token vigente no está vencido', () => {
    const token = jwt({ exp: enSegundos(AHORA + 24 * 3_600_000) });
    expect(tokenVencido(token, AHORA)).toBe(false);
  });

  it('un token pasado de exp está vencido', () => {
    const token = jwt({ exp: enSegundos(AHORA - 1000) });
    expect(tokenVencido(token, AHORA)).toBe(true);
  });

  it('aplica el margen de seguridad antes del exp', () => {
    expect(tokenVencido(jwt({ exp: enSegundos(AHORA + MARGEN_EXPIRACION_MS - 1000) }), AHORA)).toBe(
      true,
    );
    expect(tokenVencido(jwt({ exp: enSegundos(AHORA + MARGEN_EXPIRACION_MS + 5000) }), AHORA)).toBe(
      false,
    );
  });

  it('un token malformado cuenta como vencido', () => {
    expect(tokenVencido('', AHORA)).toBe(true);
    expect(tokenVencido('abc', AHORA)).toBe(true);
    expect(tokenVencido('a.b', AHORA)).toBe(true);
    expect(tokenVencido('a.%%%.c', AHORA)).toBe(true);
    expect(tokenVencido(`a.${btoa('no es json')}.c`, AHORA)).toBe(true);
    expect(leerExpiracionMs('abc')).toBeNull();
  });

  it('un token sin exp (o con exp no numérico) cuenta como vencido', () => {
    expect(leerExpiracionMs(jwt({ sub: 'a@b.co' }))).toBeNull();
    expect(tokenVencido(jwt({ sub: 'a@b.co' }), AHORA)).toBe(true);
    expect(tokenVencido(jwt({ exp: 'mañana' }), AHORA)).toBe(true);
  });
});
