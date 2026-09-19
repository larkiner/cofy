import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../application/auth.service';
import { CarritoService } from '../../application/carrito.service';
import { MenuService } from '../../application/menu.service';
import { MenuItem } from '../../domain/menu/menu.model';

interface GrupoCategoria {
  categoria: string;
  items: MenuItem[];
}

/**
 * Vista de la Carta (menú completo con pestañas por categoría). La landing
 * de marca (hero, destacados, historia, rewards, horario) vive en su propia
 * vista ({@link Inicio}, ruta /).
 */
@Component({
  selector: 'app-menu',
  imports: [CurrencyPipe],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu {
  private readonly menuService = inject(MenuService);
  protected readonly carrito = inject(CarritoService);
  protected readonly auth = inject(AuthService);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly items = signal<MenuItem[]>([]);

  /** Categoría seleccionada en las pestañas del menú (null = la primera disponible). */
  protected readonly categoriaActiva = signal<string | null>(null);

  /** Menú agrupado por categoría, en el orden en que llega del backend. */
  protected readonly grupos = computed<GrupoCategoria[]>(() => {
    const porCategoria = new Map<string, MenuItem[]>();
    for (const item of this.items()) {
      const lista = porCategoria.get(item.categoria) ?? [];
      lista.push(item);
      porCategoria.set(item.categoria, lista);
    }
    return [...porCategoria.entries()].map(([categoria, items]) => ({ categoria, items }));
  });

  /** Nombres de categoría para las pestañas. */
  protected readonly categorias = computed(() => this.grupos().map(g => g.categoria));

  /** Categoría realmente resaltada: la seleccionada, o la primera si aún no hay selección. */
  protected readonly categoriaResaltada = computed(
    () => this.categoriaActiva() ?? this.grupos()[0]?.categoria ?? null,
  );

  /** Ítems del grupo activo (o el primero, si aún no se ha seleccionado ninguno). */
  protected readonly itemsActivos = computed<MenuItem[]>(() => {
    const grupos = this.grupos();
    const activa = this.categoriaActiva();
    const grupo = grupos.find(g => g.categoria === activa) ?? grupos[0];
    return grupo?.items ?? [];
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

  protected seleccionarCategoria(categoria: string): void {
    this.categoriaActiva.set(categoria);
  }

  protected agregar(item: MenuItem): void {
    this.carrito.agregar(item);
  }
}
