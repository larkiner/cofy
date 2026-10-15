import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InternoService } from '../../../application/interno.service';
import { MenuService } from '../../../application/menu.service';
import { VentaMostradorResponse } from '../../../domain/interno/interno.model';
import { MenuItem } from '../../../domain/menu/menu.model';
import { Esqueleto } from '../../../shared/ui/esqueleto/esqueleto';
import { Icono } from '../../../shared/ui/icono/icono';
import { etiquetaEstado, etiquetaMetodo } from '../../../shared/util/etiquetas';

interface LineaVenta {
  producto: MenuItem;
  cantidad: number;
}

const METODOS = ['EFECTIVO', 'TARJETA', 'NEQUI', 'DAVIPLATA', 'PSE'];

/**
 * Venta de mostrador: el cliente está en la tienda, el personal
 * arma el pedido y lo cobra al momento (queda PAGADO de una vez).
 */
@Component({
  selector: 'app-mostrador',
  imports: [CurrencyPipe, Esqueleto, FormsModule, Icono],
  templateUrl: './mostrador.html',
  styleUrl: './mostrador.css',
})
export class Mostrador {
  private readonly menuService = inject(MenuService);
  private readonly interno = inject(InternoService);

  protected readonly metodos = METODOS;
  protected metodo = 'EFECTIVO';

  protected readonly menu = signal<MenuItem[]>([]);
  protected readonly cargandoMenu = signal(true);
  protected readonly lineas = signal<LineaVenta[]>([]);
  protected readonly procesando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly resultado = signal<VentaMostradorResponse | null>(null);

  protected readonly total = computed(() =>
    this.lineas().reduce((acc, l) => acc + l.producto.precio * l.cantidad, 0));

  /** Número de artículos en la cuenta (suma de cantidades). */
  protected readonly articulos = computed(() =>
    this.lineas().reduce((acc, l) => acc + l.cantidad, 0));

  /** Cantidad en la cuenta por producto, para la insignia de cada tesela. */
  private readonly cantidades = computed(() =>
    new Map(this.lineas().map(l => [l.producto.productoId, l.cantidad])));

  /** Menú agrupado por categoría, conservando el orden de llegada. */
  protected readonly grupos = computed(() => {
    const mapa = new Map<string, MenuItem[]>();
    for (const item of this.menu()) {
      const grupo = mapa.get(item.categoria);
      if (grupo) grupo.push(item);
      else mapa.set(item.categoria, [item]);
    }
    return [...mapa.entries()].map(([categoria, items]) => ({ categoria, items }));
  });

  protected readonly etiquetaEstado = etiquetaEstado;
  protected readonly etiquetaMetodo = etiquetaMetodo;

  constructor() {
    this.menuService.obtenerMenu().subscribe({
      next: items => {
        this.menu.set(items);
        this.cargandoMenu.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el menú.');
        this.cargandoMenu.set(false);
      },
    });
  }

  protected cantidadDe(productoId: number): number {
    return this.cantidades().get(productoId) ?? 0;
  }

  protected agregar(producto: MenuItem): void {
    this.resultado.set(null);
    this.lineas.update(lineas => {
      const existente = lineas.find(l => l.producto.productoId === producto.productoId);
      if (existente) {
        return lineas.map(l => l === existente ? { ...l, cantidad: l.cantidad + 1 } : l);
      }
      return [...lineas, { producto, cantidad: 1 }];
    });
  }

  protected cambiarCantidad(productoId: number, delta: number): void {
    this.lineas.update(lineas =>
      lineas
        .map(l => l.producto.productoId === productoId ? { ...l, cantidad: l.cantidad + delta } : l)
        .filter(l => l.cantidad > 0));
  }

  protected cobrar(): void {
    if (this.lineas().length === 0) return;
    this.error.set(null);
    this.procesando.set(true);

    this.interno.ventaMostrador({
      items: this.lineas().map(l => ({ productoId: l.producto.productoId, cantidad: l.cantidad })),
      metodoPago: this.metodo,
    }).subscribe({
      next: venta => {
        this.procesando.set(false);
        this.resultado.set(venta);
        this.lineas.set([]);
      },
      error: err => {
        this.procesando.set(false);
        this.error.set(err.mensaje ?? 'No se pudo registrar la venta.');
      },
    });
  }
}
