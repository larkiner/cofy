import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../application/auth.service';
import { CarritoService } from '../../application/carrito.service';
import { MenuService } from '../../application/menu.service';
import { MenuItem } from '../../domain/menu/menu.model';

/**
 * Vista de Inicio (landing de marca): hero, recomendaciones destacadas,
 * historia, programa de fidelidad y horario/ubicación. La carta completa
 * con pestañas vive en su propia vista ({@link Menu}, ruta /menu).
 */
@Component({
  selector: 'app-inicio',
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio {
  private readonly menuService = inject(MenuService);
  protected readonly carrito = inject(CarritoService);
  protected readonly auth = inject(AuthService);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly items = signal<MenuItem[]>([]);

                    
  /** Imagen de fachada/ubicación pendiente de subir; mientras sea null, se
   * muestra el placeholder con motivo de café. */
  protected readonly mapaImagen: string | null = null;

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
  }

  protected agregar(item: MenuItem): void {
    this.carrito.agregar(item);
  }
}
