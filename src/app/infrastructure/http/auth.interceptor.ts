import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SesionPort } from '../../domain/auth/sesion.port';

/**
 * Agrega "Authorization: Bearer <token>" a toda petición saliente
 * cuando hay sesión activa. Así ningún servicio tiene que acordarse
 * de poner el header.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(SesionPort).obtenerToken();
  if (token) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};
