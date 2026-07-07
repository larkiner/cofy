import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Solo deja pasar a BARISTA/CAJERO/SUPERVISOR/ADMIN; a los demás los manda al login. */
export const personalGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.esPersonal() ? true : router.parseUrl('/login');
};
