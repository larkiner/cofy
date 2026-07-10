import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MenuItem, Sucursal } from '../../domain/menu/menu.model';
import { MenuRepository } from '../../domain/menu/menu.repository';
import { API_URL } from '../api';

/** Adaptador: catálogo de menú y sucursales vía HTTP. */
@Injectable()
export class MenuHttpRepository extends MenuRepository {
  private readonly http = inject(HttpClient);

  obtenerMenu(): Observable<MenuItem[]> {
    return this.http.get<MenuItem[]>(`${API_URL}/menu`);
  }

  obtenerSucursales(): Observable<Sucursal[]> {
    return this.http.get<Sucursal[]>(`${API_URL}/sucursales`);
  }
}
