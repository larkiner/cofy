import { esUrlDeApi, rutaDeApi } from './url-api';

describe('esUrlDeApi', () => {
  const base = 'https://papaya-unpeeled-hydrated.ngrok-free.dev/api';

  it('acepta la URL base y las rutas, con query o fragmento', () => {
    expect(esUrlDeApi(base, base)).toBe(true);
    expect(esUrlDeApi(`${base}/menu`, base)).toBe(true);
    expect(esUrlDeApi(`${base}?x=1`, base)).toBe(true);
    expect(esUrlDeApi(`${base}/menu?x=1#a`, base)).toBe(true);
  });

  it('rechaza otros hosts y prefijos engañosos', () => {
    expect(
      esUrlDeApi('https://papaya-unpeeled-hydrated.ngrok-free.dev.evil.com/api/menu', base),
    ).toBe(false);
    expect(esUrlDeApi(`${base}.evil.com/menu`, base)).toBe(false);
    expect(esUrlDeApi(`${base}-otro/menu`, base)).toBe(false);
    expect(esUrlDeApi(`https://evil.com/?u=${base}`, base)).toBe(false);
    expect(esUrlDeApi('/assets/logo.svg', base)).toBe(false);
  });

  it('tolera una base con barra final', () => {
    expect(esUrlDeApi(`${base}/menu`, `${base}/`)).toBe(true);
  });

  it('rutaDeApi devuelve la ruta sin query', () => {
    expect(rutaDeApi(`${base}/auth/login?x=1`, base)).toBe('/auth/login');
    expect(rutaDeApi(`${base}/menu`, base)).toBe('/menu');
  });
});
