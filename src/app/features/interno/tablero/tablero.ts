import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { EMPTY, catchError, exhaustMap, filter, timer } from 'rxjs';
import { InternoService } from '../../../application/interno.service';
import { PedidoEmpleado } from '../../../domain/interno/interno.model';

/** Siguiente paso de cada estado en el flujo de barra. */
const SIGUIENTE: Record<string, { estado: string; etiqueta: string }> = {
  PAGADO: { estado: 'EN_PREPARACION', etiqueta: 'Iniciar preparación' },
  EN_PREPARACION: { estado: 'LISTO', etiqueta: 'Marcar LISTO' },
};

@Component({
  selector: 'app-tablero',
  imports: [CurrencyPipe, DatePipe, FormsModule],
  templateUrl: './tablero.html',
  styleUrl: '../interno.css',
})
export class Tablero {
  /** Cada cuánto se refresca el tablero solo (15 s). */
  static readonly INTERVALO_MS = 15_000;

  private readonly interno = inject(InternoService);

  protected readonly estados = [
    'PAGADO',
    'EN_PREPARACION',
    'LISTO',
    'ENTREGADO',
    'PENDIENTE_PAGO',
    'CANCELADO',
  ];
  protected filtroEstado = '';

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pedidos = signal<PedidoEmpleado[]>([]);
  protected readonly actualizadoEn = signal<Date | null>(null);

  constructor() {
    this.cargar();
    this.refrescarAutomaticamente();
  }

  /**
   * Refresco silencioso: sin pantalla de "Cargando", sin borrar los datos si
   * falla una lectura y sin pedir nada mientras la pestaña está oculta.
   * `exhaustMap` evita encimar peticiones si la API tarda más que el intervalo.
   */
  private refrescarAutomaticamente(): void {
    timer(Tablero.INTERVALO_MS, Tablero.INTERVALO_MS)
      .pipe(
        filter(() => !document.hidden),
        exhaustMap(() =>
          this.interno.tablero(this.filtroEstado || null, null).pipe(catchError(() => EMPTY)),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((pedidos) => {
        this.pedidos.set(pedidos);
        this.error.set(null);
        this.actualizadoEn.set(new Date());
      });
  }

  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.interno.tablero(this.filtroEstado || null, null).subscribe({
      next: (pedidos) => {
        this.pedidos.set(pedidos);
        this.actualizadoEn.set(new Date());
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
