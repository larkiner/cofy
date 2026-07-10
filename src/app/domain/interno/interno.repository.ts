import { Observable } from 'rxjs';
import {
  Categoria, MetricaSucursal, PedidoEmpleado, PedidoInterno, ProductoAdmin,
  ProductoRequest, TrabajadorPerfil, Turno, TurnoRequest,
  VentaMostradorRequest, VentaMostradorResponse,
} from './interno.model';

/** Puerto: operaciones del panel interno (personal de la cafetería). */
export abstract class InternoRepository {
  // ---------------- Tablero de pedidos ----------------
  abstract tablero(estado: string | null, sucursalId: number | null): Observable<PedidoEmpleado[]>;
  abstract cambiarEstado(pedidoId: number, estado: string): Observable<PedidoInterno>;
  abstract entregar(codigoRetiro: string): Observable<PedidoInterno>;
  abstract ventaMostrador(request: VentaMostradorRequest): Observable<VentaMostradorResponse>;

  // ---------------- Inventario (admin) ----------------
  abstract productos(): Observable<ProductoAdmin[]>;
  abstract crearProducto(request: ProductoRequest): Observable<ProductoAdmin>;
  abstract actualizarProducto(id: number, request: ProductoRequest): Observable<ProductoAdmin>;
  abstract categorias(): Observable<Categoria[]>;
  abstract crearCategoria(nombre: string, descripcion: string | null): Observable<Categoria>;

  // ---------------- Métricas / trabajadores / turnos ----------------
  abstract metricas(sucursalId: number | null): Observable<MetricaSucursal[]>;
  abstract miPerfil(): Observable<TrabajadorPerfil>;
  abstract trabajadores(): Observable<TrabajadorPerfil[]>;
  abstract misTurnos(): Observable<Turno[]>;
  abstract crearTurno(request: TurnoRequest): Observable<Turno>;
}
