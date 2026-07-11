import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PedidoService } from '../../application/pedido.service';
import { PedidoCliente } from '../../domain/pedidos/pedido.model';

@Component({
  selector: 'app-mis-pedidos',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  templateUrl: './mis-pedidos.html',
  styleUrl: './mis-pedidos.css',
})
export class MisPedidos {
  private readonly pedidoService = inject(PedidoService);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly pedidos = signal<PedidoCliente[]>([]);

  constructor() {
    this.pedidoService.misPedidos().subscribe({
      next: pedidos => {
        this.pedidos.set(pedidos);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar tus pedidos.');
        this.cargando.set(false);
      },
    });
  }
}
