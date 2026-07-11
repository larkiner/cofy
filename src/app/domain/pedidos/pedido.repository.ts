import { Observable } from 'rxjs';
import { CrearPedidoRequest, PedidoCliente, PedidoCreado } from './pedido.model';

/** Puerto: pedidos del cliente autenticado. */
export abstract class PedidoRepository {
  abstract crear(request: CrearPedidoRequest): Observable<PedidoCreado>;
  abstract pagar(pedidoId: number, metodo: string): Observable<void>;
  abstract confirmarPago(pedidoId: number): Observable<PedidoCliente>;
  abstract misPedidos(): Observable<PedidoCliente[]>;
}
