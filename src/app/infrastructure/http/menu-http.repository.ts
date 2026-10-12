import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, Observable, shareReplay, throwError } from 'rxjs';
import { MenuItem, Sucursal } from '../../domain/menu/menu.model';
import { MenuRepository } from '../../domain/menu/menu.repository';
import { environment } from '../../../environments/environment';

/** Entrada de caché: la petición compartida y el instante en que se lanzó. */
interface EntradaCache<T> {
  datos$: Observable<T>;
  creadaEn: number;
}

/**
 * Adaptador: catálogo de menú y sucursales vía HTTP.
 *
 * Ambas listas se cachean con `shareReplay(1)`: son públicas, se leen en cada
 * navegación (Inicio, Menú, mostrador…) y cambian poco, así que se piden una
 * vez y las siguientes lecturas reusan el resultado sin volver a la red.
 * El caché caduca a los `TTL_MS`: así un cambio de precio o de disponibilidad
 * llega a una pestaña que lleva abierta mucho tiempo sin recargarla. Si la
 * petición falla, se descarta el caché para permitir reintento en la próxima
 * lectura (si no, `shareReplay` repetiría el error para siempre).
 */
@Injectable()
export class MenuHttpRepository extends MenuRepository {
  /** Vida máxima del caché en el navegador (5 minutos). */
  static readonly TTL_MS = 5 * 60 * 1000;

  private readonly http = inject(HttpClient);

  private menuCache?: EntradaCache<MenuItem[]>;
  private sucursalesCache?: EntradaCache<Sucursal[]>;

  obtenerMenu(): Observable<MenuItem[]> {
    if (!this.vigente(this.menuCache)) {
      this.menuCache = this.crearEntrada<MenuItem[]>(`${environment.apiUrl}/menu`, (entrada) => {
        if (this.menuCache === entrada) this.menuCache = undefined;
      });
    }
    return this.menuCache!.datos$;
  }

  obtenerSucursales(): Observable<Sucursal[]> {
    if (!this.vigente(this.sucursalesCache)) {
      this.sucursalesCache = this.crearEntrada<Sucursal[]>(
        `${environment.apiUrl}/sucursales`,
        (entrada) => {
          if (this.sucursalesCache === entrada) this.sucursalesCache = undefined;
        },
      );
    }
    return this.sucursalesCache!.datos$;
  }

  invalidarMenu(): void {
    this.menuCache = undefined;
  }

  private vigente<T>(entrada: EntradaCache<T> | undefined): boolean {
    return !!entrada && Date.now() - entrada.creadaEn < MenuHttpRepository.TTL_MS;
  }

  private crearEntrada<T>(
    url: string,
    descartar: (entrada: EntradaCache<T>) => void,
  ): EntradaCache<T> {
    const entrada: EntradaCache<T> = {
      creadaEn: Date.now(),
      datos$: this.http.get<T>(url).pipe(
        catchError((err) => {
          // Solo se descarta si esta entrada sigue siendo la vigente.
          descartar(entrada);
          return throwError(() => err);
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
      ),
    };
    return entrada;
  }
}
