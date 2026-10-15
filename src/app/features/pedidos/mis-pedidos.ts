import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PedidoService } from '../../application/pedido.service';
import { PedidoCliente } from '../../domain/pedidos/pedido.model';
import { EstadoVacio } from '../../shared/ui/estado-vacio/estado-vacio';
import { Esqueleto } from '../../shared/ui/esqueleto/esqueleto';
import { Icono } from '../../shared/ui/icono/icono';
import { modoDePedido, TarjetaPedido } from '../../shared/ui/tarjeta-pedido/tarjeta-pedido';

/**
 * Vista «Mis pedidos»: los pedidos por retirar arriba («En curso»), los que esperan pago y el
 * historial («Anteriores»). No se refresca sola: el botón «Actualizar» vuelve a pedirlos.
 */
@Component({
  selector: 'app-mis-pedidos',
  imports: [DatePipe, EstadoVacio, Esqueleto, Icono, RouterLink, TarjetaPedido],
  templateUrl: './mis-pedidos.html',
  styleUrl: './mis-pedidos.css',
})
export class MisPedidos {
  private readonly pedidoService = inject(PedidoService);

  /** Primera carga, sin nada que mostrar todavía (esqueleto). */
  protected readonly cargando = signal(true);
  /** Recarga manual con la lista ya a la vista (se conserva mientras llega la respuesta). */
  protected readonly actualizando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly pedidos = signal<PedidoCliente[]>([]);
  protected readonly actualizadoA = signal<Date | null>(null);

  protected readonly enCurso = computed(() =>
    this.pedidos().filter((p) => modoDePedido(p.estado) === 'en-curso'),
  );
  protected readonly pendientes = computed(() =>
    this.pedidos().filter((p) => p.estado === 'PENDIENTE_PAGO'),
  );
  protected readonly anteriores = computed(() =>
    this.pedidos().filter(
      (p) => modoDePedido(p.estado) === 'historial' && p.estado !== 'PENDIENTE_PAGO',
    ),
  );

  constructor() {
    this.cargar();
  }

  /** Pide los pedidos; también lo usan «Actualizar» y «Reintentar». */
  protected cargar(): void {
    this.error.set(null);
    if (this.actualizadoA() === null) this.cargando.set(true);
    else this.actualizando.set(true);

    this.pedidoService.misPedidos().subscribe({
      next: (pedidos) => {
        this.pedidos.set(pedidos);
        this.actualizadoA.set(new Date());
        this.cargando.set(false);
        this.actualizando.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar tus pedidos. Revisa tu conexión e inténtalo de nuevo.');
        this.cargando.set(false);
        this.actualizando.set(false);
      },
    });
  }
}
