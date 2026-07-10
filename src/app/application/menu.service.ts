import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MenuItem, Sucursal } from '../domain/menu/menu.model';
import { MenuRepository } from '../domain/menu/menu.repository';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private readonly repo = inject(MenuRepository);

  obtenerMenu(): Observable<MenuItem[]> {
    return this.repo.obtenerMenu();
  }

  obtenerSucursales(): Observable<Sucursal[]> {
    return this.repo.obtenerSucursales();
  }
}
