import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../application/auth.service';
import { AvisoService } from '../../application/aviso.service';
import { CarritoService } from '../../application/carrito.service';
import { MenuService } from '../../application/menu.service';
import { MenuItem, Sucursal } from '../../domain/menu/menu.model';
import { Icono } from '../../shared/ui/icono/icono';
import { InicioSucursales } from './secciones/sucursales/sucursales';

/**
 * Vista de Inicio (landing de marca): hero, recomendaciones destacadas,
 * historia, programa de fidelidad y sucursales/horario. La carta completa
 * vive en su propia vista ({@link Menu}, ruta /menu).
 */
@Component({
  selector: 'app-inicio',
  imports: [CurrencyPipe, Icono, RouterLink, InicioSucursales],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio {
  private readonly menuService = inject(MenuService);
  protected readonly carrito = inject(CarritoService);
  protected readonly auth = inject(AuthService);
  private readonly avisos = inject(AvisoService);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly items = signal<MenuItem[]>([]);

  /** `null` mientras cargan; `[]` si la API falla o no devuelve sucursales. */
  protected readonly sucursales = signal<Sucursal[] | null>(null);

  /**
   * "Lo más pedido": ítems marcados como destacados. Si el backend aún no
   * envía la marca, se muestran los tres primeros como selección por defecto.
   */
  protected readonly destacados = computed<MenuItem[]>(() => {
    const marcados = this.items().filter(item => item.destacado);
    return marcados.length > 0 ? marcados.slice(0, 3) : this.items().slice(0, 3);
  });

  constructor() {
    this.menuService.obtenerMenu().subscribe({
      next: items => {
        this.items.set(items);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el menú. ¿Está corriendo el backend?');
        this.cargando.set(false);
      },
    });

    this.menuService.obtenerSucursales().subscribe({
      next: lista => this.sucursales.set(lista),
      error: () => this.sucursales.set([]),
    });
  }

  protected agregar(item: MenuItem): void {
    this.carrito.agregar(item);
    this.avisos.avisarProductoAgregado(item.nombre, this.carrito.cantidadTotal());
  }
}
