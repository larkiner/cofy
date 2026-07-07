import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MenuService } from '../../core/menu.service';
import { MenuItem } from '../../core/models';

interface GrupoCategoria {
  categoria: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-menu',
  imports: [CurrencyPipe],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu {
  private readonly menuService = inject(MenuService);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly items = signal<MenuItem[]>([]);

  /** Menú agrupado por categoría para pintarlo en secciones. */
  protected readonly grupos = computed<GrupoCategoria[]>(() => {
    const porCategoria = new Map<string, MenuItem[]>();
    for (const item of this.items()) {
      const lista = porCategoria.get(item.categoria) ?? [];
      lista.push(item);
      porCategoria.set(item.categoria, lista);
    }
    return [...porCategoria.entries()].map(([categoria, items]) => ({ categoria, items }));
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
}
