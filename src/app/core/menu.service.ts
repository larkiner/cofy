import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './api';
import { MenuItem, Sucursal } from './models';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly http = inject(HttpClient);

  obtenerMenu(): Observable<MenuItem[]> {
    return this.http.get<MenuItem[]>(`${API_URL}/menu`);
  }

  obtenerSucursales(): Observable<Sucursal[]> {
    return this.http.get<Sucursal[]>(`${API_URL}/sucursales`);
  }
}
