import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { CrearPedidoRequest, PedidoCliente, PedidoCreado } from '../../domain/pedidos/pedido.model';
import { PedidoRepository } from '../../domain/pedidos/pedido.repository';
import { environment } from '../../../environments/environment';

/** Adaptador: pedidos del cliente autenticado vía HTTP (el JWT lo agrega el interceptor). */
@Injectable()
export class PedidoHttpRepository extends PedidoRepository {
  private readonly http = inject(HttpClient);

  crear(request: CrearPedidoRequest): Observable<PedidoCreado> {
    return this.http.post<PedidoCreado>(`${environment.apiUrl}/pedidos`, request);
  }

  pagar(pedidoId: number, metodo: string): Observable<void> {
    return this.http.post<void>(`${environment.apiUrl}/pedidos/${pedidoId}/pago`, { metodo });
  }

  /** Simula la confirmación de la pasarela; devuelve el pedido con su código. */
  confirmarPago(pedidoId: number): Observable<PedidoCliente> {
    return this.http.post<PedidoCliente>(`${environment.apiUrl}/pedidos/${pedidoId}/pago/confirmar`, {});
  }

  misPedidos(): Observable<PedidoCliente[]> {
    return this.http.get<PedidoCliente[]>(`${environment.apiUrl}/pedidos`);
  }
}
