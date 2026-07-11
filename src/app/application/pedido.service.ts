import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CrearPedidoRequest, PedidoCliente, PedidoCreado } from '../domain/pedidos/pedido.model';
import { PedidoRepository } from '../domain/pedidos/pedido.repository';

/** Pedidos del cliente autenticado (el JWT lo agrega el interceptor). */
@Injectable({ providedIn: 'root' })
export class PedidoService {
  private readonly repo = inject(PedidoRepository);

  crear(request: CrearPedidoRequest): Observable<PedidoCreado> {
    return this.repo.crear(request);
  }

  pagar(pedidoId: number, metodo: string): Observable<void> {
    return this.repo.pagar(pedidoId, metodo);
  }

  /** Simula la confirmación de la pasarela; devuelve el pedido con su código. */
  confirmarPago(pedidoId: number): Observable<PedidoCliente> {
    return this.repo.confirmarPago(pedidoId);
  }

  misPedidos(): Observable<PedidoCliente[]> {
    return this.repo.misPedidos();
  }
}
