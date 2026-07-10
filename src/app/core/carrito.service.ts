import { Injectable, computed, signal } from '@angular/core';
import { MenuItem } from './models';

export interface LineaCarrito {
  producto: MenuItem;
  cantidad: number;
}

/**
 * Carrito de compras en memoria (signals). La UI reacciona sola
 * a cualquier cambio: contador del header, totales, etc.
 */
@Injectable({ providedIn: 'root' })
export class CarritoService {
  private readonly lineasSignal = signal<LineaCarrito[]>([]);

  readonly lineas = this.lineasSignal.asReadonly();

  readonly cantidadTotal = computed(() =>
    this.lineasSignal().reduce((acc, l) => acc + l.cantidad, 0));

  readonly total = computed(() =>
    this.lineasSignal().reduce((acc, l) => acc + l.producto.precio * l.cantidad, 0));

  agregar(producto: MenuItem): void {
    this.lineasSignal.update(lineas => {
      const existente = lineas.find(l => l.producto.productoId === producto.productoId);
      if (existente) {
        return lineas.map(l => l === existente ? { ...l, cantidad: l.cantidad + 1 } : l);
      }
      return [...lineas, { producto, cantidad: 1 }];
    });
  }

  cambiarCantidad(productoId: number, delta: number): void {
    this.lineasSignal.update(lineas =>
      lineas
        .map(l => l.producto.productoId === productoId
          ? { ...l, cantidad: l.cantidad + delta }
          : l)
        .filter(l => l.cantidad > 0));
  }

  quitar(productoId: number): void {
    this.lineasSignal.update(lineas =>
      lineas.filter(l => l.producto.productoId !== productoId));
  }

  vaciar(): void {
    this.lineasSignal.set([]);
  }
}
