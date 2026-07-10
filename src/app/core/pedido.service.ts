import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from './api';
import { CrearPedidoRequest, PedidoCliente, PedidoCreado } from './models';

/** Pedidos del cliente autenticado (el JWT lo agrega el interceptor). */
@Injectable({ providedIn: 'root' })
export class PedidoService {
  private readonly http = inject(HttpClient);

  crear(request: CrearPedidoRequest): Observable<PedidoCreado> {
    return this.http.post<PedidoCreado>(`${API_URL}/pedidos`, request);
  }

  pagar(pedidoId: number, metodo: string): Observable<void> {
    return this.http.post<void>(`${API_URL}/pedidos/${pedidoId}/pago`, { metodo });
  }

  /** Simula la confirmación de la pasarela; devuelve el pedido con su código. */
  confirmarPago(pedidoId: number): Observable<PedidoCliente> {
    return this.http.post<PedidoCliente>(`${API_URL}/pedidos/${pedidoId}/pago/confirmar`, {});
  }

  misPedidos(): Observable<PedidoCliente[]> {
    return this.http.get<PedidoCliente[]>(`${API_URL}/pedidos`);
  }
}
