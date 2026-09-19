import { Observable } from 'rxjs';
import { MenuItem, Sucursal } from './menu.model';

/** Puerto: catálogo de menú y sucursales (público, sin auth). */
export abstract class MenuRepository {
  abstract obtenerMenu(): Observable<MenuItem[]>;
  abstract obtenerSucursales(): Observable<Sucursal[]>;

  /** Descarta el menú cacheado para forzar una recarga en la próxima lectura
   *  (p. ej. tras editar inventario en la misma sesión). */
  abstract invalidarMenu(): void;
}
