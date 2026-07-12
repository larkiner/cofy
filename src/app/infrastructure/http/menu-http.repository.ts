import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MenuItem, Sucursal } from '../../domain/menu/menu.model';
import { MenuRepository } from '../../domain/menu/menu.repository';
import { environment } from '../../../environments/environment';

/** Adaptador: catálogo de menú y sucursales vía HTTP. */
@Injectable()
export class MenuHttpRepository extends MenuRepository {
  private readonly http = inject(HttpClient);

  obtenerMenu(): Observable<MenuItem[]> {
    return this.http.get<MenuItem[]>(`${environment.apiUrl}/menu`);
  }

  obtenerSucursales(): Observable<Sucursal[]> {
    return this.http.get<Sucursal[]>(`${environment.apiUrl}/sucursales`);
  }
}
