import { environment } from '../../../environments/environment';

/**
 * ¿La URL apunta a la API propia? Compara por prefijo exacto de `apiUrl` seguido de
 * `/`, `?`, `#` o fin de cadena, así `https://api.com/api.evil.com` o
 * `https://api.com/api-otro` no cuentan (un `includes`/`startsWith` simple sí las aceptaría).
 */
export function esUrlDeApi(url: string, base: string = environment.apiUrl): boolean {
  const apiUrl = base.replace(/\/+$/, '');
  if (!url.startsWith(apiUrl)) {
    return false;
  }
  const siguiente = url.charAt(apiUrl.length);
  return siguiente === '' || siguiente === '/' || siguiente === '?' || siguiente === '#';
}

/** Ruta de `url` relativa a la API, sin query ni fragmento (p. ej. `/auth/login`). */
export function rutaDeApi(url: string, base: string = environment.apiUrl): string {
  const apiUrl = base.replace(/\/+$/, '');
  return url.slice(apiUrl.length).split(/[?#]/)[0];
}
