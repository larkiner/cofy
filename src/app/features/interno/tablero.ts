import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InternoService } from '../../core/interno.service';
import { PedidoEmpleado } from '../../core/models';

/** Siguiente paso de cada estado en el flujo de barra. */
const SIGUIENTE: Record<string, { estado: string; etiqueta: string }> = {
  PAGADO: { estado: 'EN_PREPARACION', etiqueta: 'Iniciar preparación' },
  EN_PREPARACION: { estado: 'LISTO', etiqueta: 'Marcar LISTO' },
};

@Component({
  selector: 'app-tablero',
  imports: [CurrencyPipe, DatePipe, FormsModule],
  templateUrl: './tablero.html',
  styleUrl: './interno.css',
})
export class Tablero {
  private readonly interno = inject(InternoService);

  protected readonly estados = ['PAGADO', 'EN_PREPARACION', 'LISTO', 'ENTREGADO', 'PENDIENTE_PAGO'];
  protected filtroEstado = '';

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pedidos = signal<PedidoEmpleado[]>([]);

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.interno.tablero(this.filtroEstado || null, null).subscribe({
      next: pedidos => {
        this.pedidos.set(pedidos);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el tablero.');
        this.cargando.set(false);
      },
    });
  }

  protected accionDe(pedido: PedidoEmpleado) {
    return SIGUIENTE[pedido.estado] ?? null;
  }

  protected avanzar(pedido: PedidoEmpleado): void {
    const accion = this.accionDe(pedido);
    if (!accion) return;
    this.interno.cambiarEstado(pedido.pedidoId, accion.estado).subscribe({
      next: () => this.cargar(),
      error: () => this.error.set('No se pudo cambiar el estado del pedido #' + pedido.pedidoId),
    });
  }
}
