import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { AuthService } from '../../application/auth.service';
import { CarritoService } from '../../application/carrito.service';
import { MenuService } from '../../application/menu.service';
import { PedidoService } from '../../application/pedido.service';
import { Sucursal } from '../../domain/menu/menu.model';
import { PedidoCliente } from '../../domain/pedidos/pedido.model';

const METODOS_PAGO = ['TARJETA', 'PSE', 'NEQUI', 'DAVIPLATA'];

@Component({
  selector: 'app-carrito',
  imports: [CurrencyPipe, FormsModule, RouterLink],
  templateUrl: './carrito.html',
  styleUrl: './carrito.css',
})
export class Carrito {
  protected readonly carrito = inject(CarritoService);
  protected readonly auth = inject(AuthService);
  private readonly menuService = inject(MenuService);
  private readonly pedidoService = inject(PedidoService);
  private readonly router = inject(Router);

  protected readonly metodos = METODOS_PAGO;
  protected readonly sucursales = signal<Sucursal[]>([]);
  protected sucursalId: number | null = null;
  protected metodo = 'TARJETA';

  protected readonly procesando = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Pedido pagado con su código de retiro (pantalla de éxito). */
  protected readonly resultado = signal<PedidoCliente | null>(null);

  constructor() {
    this.menuService.obtenerSucursales().subscribe({
      next: sucursales => {
        this.sucursales.set(sucursales);
        if (sucursales.length > 0) {
          this.sucursalId = sucursales[0].id;
        }
      },
    });
  }

  /** Flujo completo: crear pedido -> pagar -> confirmar (pasarela simulada). */
  protected pedirYPagar(): void {
    if (!this.auth.logueado()) {
      this.router.navigateByUrl('/login');
      return;
    }
    if (this.sucursalId === null || this.carrito.lineas().length === 0) {
      return;
    }

    this.error.set(null);
    this.procesando.set(true);

    const items = this.carrito.lineas().map(l => ({
      productoId: l.producto.productoId,
      cantidad: l.cantidad,
    }));

    this.pedidoService.crear({ sucursalId: this.sucursalId, items }).pipe(
      switchMap(pedido => this.pedidoService.pagar(pedido.pedidoId, this.metodo).pipe(
        switchMap(() => this.pedidoService.confirmarPago(pedido.pedidoId)))),
    ).subscribe({
      next: pedidoPagado => {
        this.procesando.set(false);
        this.resultado.set(pedidoPagado);
        this.carrito.vaciar();
      },
      error: err => {
        this.procesando.set(false);
        this.error.set(err.status === 401
          ? 'Tu sesión expiró. Inicia sesión de nuevo.'
          : 'No se pudo procesar el pedido. Intenta de nuevo.');
      },
    });
  }
}
