import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../application/auth.service';
import { AvisoService } from '../../application/aviso.service';
import { CarritoService } from '../../application/carrito.service';
import { MenuService } from '../../application/menu.service';
import { MenuItem, Sucursal } from '../../domain/menu/menu.model';
import { InicioComunidad } from './secciones/comunidad/comunidad';
import { EstadoDestacados, InicioDestacados } from './secciones/destacados/destacados';
import { InicioHero } from './secciones/hero/hero';
import { InicioHistoria } from './secciones/historia/historia';
import { InicioSucursales } from './secciones/sucursales/sucursales';

/**
 * Vista de Inicio (landing de marca). Orquesta las secciones: hero, recomendaciones,
 * historia, comunidad (solo sin sesión) y sucursales. Carga el menú y las sucursales y
 * maneja "Agregar"; las secciones solo reciben entradas y emiten salidas. La carta completa
 * vive en su propia vista ({@link Menu}, ruta /menu).
 */
@Component({
  selector: 'app-inicio',
  imports: [InicioHero, InicioDestacados, InicioHistoria, InicioComunidad, InicioSucursales],
  templateUrl: './inicio.html',
})
export class Inicio {
  private readonly menuService = inject(MenuService);
  private readonly carrito = inject(CarritoService);
  protected readonly auth = inject(AuthService);
  private readonly avisos = inject(AvisoService);

  private readonly cargando = signal(true);
  private readonly fallo = signal(false);
  private readonly items = signal<MenuItem[]>([]);

  /** `null` mientras cargan; `[]` si la API falla o no devuelve sucursales. */
  protected readonly sucursales = signal<Sucursal[] | null>(null);

  protected readonly estadoMenu = computed<EstadoDestacados>(() =>
    this.cargando() ? 'cargando' : this.fallo() ? 'error' : 'listo',
  );

  /**
   * "Lo más pedido": ítems marcados como destacados. Si el backend aún no
   * envía la marca, se muestran los tres primeros como selección por defecto.
   */
  protected readonly destacados = computed<MenuItem[]>(() => {
    const marcados = this.items().filter((item) => item.destacado);
    return marcados.length > 0 ? marcados.slice(0, 3) : this.items().slice(0, 3);
  });

  constructor() {
    this.menuService.obtenerMenu().subscribe({
      next: (items) => {
        this.items.set(items);
        this.cargando.set(false);
      },
      error: () => {
        this.fallo.set(true);
        this.cargando.set(false);
      },
    });

    this.menuService.obtenerSucursales().subscribe({
      next: (lista) => this.sucursales.set(lista),
      error: () => this.sucursales.set([]),
    });
  }

  protected agregar(item: MenuItem): void {
    this.carrito.agregar(item);
    this.avisos.avisarProductoAgregado(item.nombre, this.carrito.cantidadTotal());
  }
}
