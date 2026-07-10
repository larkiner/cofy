import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Solo ADMIN (inventario). */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.esAdmin() ? true : router.parseUrl('/interno');
};

/** Solo SUPERVISOR o ADMIN (métricas, asignar turnos). */
export const supervisorGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return ['SUPERVISOR', 'ADMIN'].includes(auth.rol() ?? '')
    ? true
    : router.parseUrl('/interno');
};
