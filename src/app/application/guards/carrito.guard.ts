import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CarritoService } from '../carrito.service';

/**
 * El checkout solo tiene sentido con productos: el carrito vive en memoria, así que al recargar
 * `/checkout` (o entrar escribiendo la URL) se vuelve al carrito en vez de mostrar un pedido vacío.
 */
export const carritoConProductosGuard: CanActivateFn = () => {
  const carrito = inject(CarritoService);
  const router = inject(Router);
  return carrito.lineas().length > 0 ? true : router.parseUrl('/carrito');
};
