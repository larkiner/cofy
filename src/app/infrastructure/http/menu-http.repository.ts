import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, Observable, shareReplay, throwError } from 'rxjs';
import { MenuItem, Sucursal } from '../../domain/menu/menu.model';
import { MenuRepository } from '../../domain/menu/menu.repository';
import { environment } from '../../../environments/environment';

/**
 * Adaptador: catálogo de menú y sucursales vía HTTP.
 *
 * Ambas listas se cachean con `shareReplay(1)`: son públicas, se leen en cada
 * navegación (Inicio, Menú, mostrador…) y cambian poco, así que se piden una
 * vez y las siguientes lecturas reusan el resultado sin volver a la red. Si la
 * petición falla, se descarta el caché para permitir reintento en la próxima
 * lectura (si no, `shareReplay` repetiría el error para siempre).
 */
@Injectable()
export class MenuHttpRepository extends MenuRepository {
  private readonly http = inject(HttpClient);

  private menuCache$?: Observable<MenuItem[]>;
  private sucursalesCache$?: Observable<Sucursal[]>;

  obtenerMenu(): Observable<MenuItem[]> {
    this.menuCache$ ??= this.http.get<MenuItem[]>(`${environment.apiUrl}/menu`).pipe(
      catchError(err => {
        this.menuCache$ = undefined;
        return throwError(() => err);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.menuCache$;
  }

  obtenerSucursales(): Observable<Sucursal[]> {
    this.sucursalesCache$ ??= this.http.get<Sucursal[]>(`${environment.apiUrl}/sucursales`).pipe(
      catchError(err => {
        this.sucursalesCache$ = undefined;
        return throwError(() => err);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.sucursalesCache$;
  }

  invalidarMenu(): void {
    this.menuCache$ = undefined;
  }
}
