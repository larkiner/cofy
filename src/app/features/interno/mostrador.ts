import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InternoService } from '../../core/interno.service';
import { MenuService } from '../../core/menu.service';
import { MenuItem, VentaMostradorResponse } from '../../core/models';

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
  imports: [CurrencyPipe, FormsModule],
  templateUrl: './mostrador.html',
  styleUrl: './interno.css',
})
export class Mostrador {
  private readonly menuService = inject(MenuService);
  private readonly interno = inject(InternoService);

  protected readonly metodos = METODOS;
  protected metodo = 'EFECTIVO';

  protected readonly menu = signal<MenuItem[]>([]);
  protected readonly lineas = signal<LineaVenta[]>([]);
  protected readonly procesando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly resultado = signal<VentaMostradorResponse | null>(null);

  protected readonly total = computed(() =>
    this.lineas().reduce((acc, l) => acc + l.producto.precio * l.cantidad, 0));

  constructor() {
    this.menuService.obtenerMenu().subscribe({
      next: items => this.menu.set(items),
      error: () => this.error.set('No se pudo cargar el menú.'),
    });
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
      error: () => {
        this.procesando.set(false);
        this.error.set('No se pudo registrar la venta.');
      },
    });
  }
}
