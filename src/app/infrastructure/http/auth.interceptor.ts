import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../../application/auth.service';
import { tokenVencido } from '../../domain/auth/jwt';
import { SesionPort } from '../../domain/auth/sesion.port';
import { esUrlDeApi, rutaDeApi } from './url-api';

/**
 * Un 401 en estas rutas NO significa "sesión caducada": credenciales malas (login),
 * contraseña actual incorrecta (password) o el propio cierre de sesión (logout).
 */
const RUTAS_SIN_CIERRE_POR_401 = [
  '/auth/login',
  '/auth/registro',
  '/auth/password',
  '/auth/logout',
];

/**
 * Agrega "Authorization: Bearer <token>" a las peticiones a la API propia
 * (`environment.apiUrl`) cuando hay sesión activa; a otros hosts nunca se les envía.
 * Así ningún servicio tiene que acordarse de poner el header. Además:
 * - respeta un `Authorization` explícito (p. ej. el del logout);
 * - si el token guardado ya venció, cierra la sesión local y manda la petición sin token;
 * - si la API responde 401 a una petición que sí llevaba el token de la sesión actual,
 *   cierra la sesión local y lleva al login (`AuthService.expirarSesion`). El error se
 *   sigue propagando intacto.
 *
 * `AuthService` se resuelve con `inject()` al ejecutarse la petición (no al construir
 * `HttpClient`), por eso no hay dependencia circular con `AuthHttpRepository`.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!esUrlDeApi(req.url) || req.headers.has('Authorization')) {
    return next(req);
  }
  const sesion = inject(SesionPort);
  const token = sesion.obtenerToken();
  if (!token) {
    return next(req);
  }

  const auth = inject(AuthService);
  if (tokenVencido(token)) {
    auth.expirarSesion();
    return next(req);
  }

  const exenta = RUTAS_SIN_CIERRE_POR_401.includes(rutaDeApi(req.url));
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError((error) => {
      // Solo si la sesión sigue siendo la misma: así varios 401 simultáneos cierran una vez.
      const es401 = (error as { status?: number }).status === 401;
      if (es401 && !exenta && sesion.obtenerToken() === token) {
        auth.expirarSesion();
      }
      return throwError(() => error);
    }),
  );
};
