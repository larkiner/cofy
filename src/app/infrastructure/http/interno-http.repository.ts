import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Categoria, MetricaSucursal, PedidoEmpleado, PedidoInterno, ProductoAdmin,
  ProductoRequest, TrabajadorPerfil, Turno, TurnoRequest,
  VentaMostradorRequest, VentaMostradorResponse,
} from '../../domain/interno/interno.model';
import { InternoRepository } from '../../domain/interno/interno.repository';
import { environment } from '../../../environments/environment';

/** Adaptador: operaciones del panel interno (personal de la cafetería) vía HTTP. */
@Injectable()
export class InternoHttpRepository extends InternoRepository {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/interno`;

  // ---------------- Tablero de pedidos ----------------

  tablero(estado: string | null, sucursalId: number | null): Observable<PedidoEmpleado[]> {
    let params = new HttpParams();
    if (estado) params = params.set('estado', estado);
    if (sucursalId !== null) params = params.set('sucursalId', sucursalId);
    return this.http.get<PedidoEmpleado[]>(`${this.base}/pedidos`, { params });
  }

  cambiarEstado(pedidoId: number, estado: string): Observable<PedidoInterno> {
    return this.http.put<PedidoInterno>(`${this.base}/pedidos/${pedidoId}/estado`, { estado });
  }

  entregar(codigoRetiro: string): Observable<PedidoInterno> {
    return this.http.post<PedidoInterno>(`${this.base}/pedidos/entregar`, { codigoRetiro });
  }

  ventaMostrador(request: VentaMostradorRequest): Observable<VentaMostradorResponse> {
    return this.http.post<VentaMostradorResponse>(`${this.base}/pedidos/mostrador`, request);
  }

  // ---------------- Inventario (admin) ----------------

  productos(): Observable<ProductoAdmin[]> {
    return this.http.get<ProductoAdmin[]>(`${this.base}/productos`);
  }

  crearProducto(request: ProductoRequest): Observable<ProductoAdmin> {
    return this.http.post<ProductoAdmin>(`${this.base}/productos`, request);
  }

  actualizarProducto(id: number, request: ProductoRequest): Observable<ProductoAdmin> {
    return this.http.put<ProductoAdmin>(`${this.base}/productos/${id}`, request);
  }

  categorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.base}/categorias`);
  }

  crearCategoria(nombre: string, descripcion: string | null): Observable<Categoria> {
    return this.http.post<Categoria>(`${this.base}/categorias`, { nombre, descripcion });
  }

  // ---------------- Métricas / trabajadores / turnos ----------------

  metricas(sucursalId: number | null): Observable<MetricaSucursal[]> {
    let params = new HttpParams();
    if (sucursalId !== null) params = params.set('sucursalId', sucursalId);
    return this.http.get<MetricaSucursal[]>(`${this.base}/metricas`, { params });
  }

  miPerfil(): Observable<TrabajadorPerfil> {
    return this.http.get<TrabajadorPerfil>(`${this.base}/me`);
  }

  trabajadores(): Observable<TrabajadorPerfil[]> {
    return this.http.get<TrabajadorPerfil[]>(`${this.base}/trabajadores`);
  }

  misTurnos(): Observable<Turno[]> {
    return this.http.get<Turno[]>(`${this.base}/turnos/mios`);
  }

  crearTurno(request: TurnoRequest): Observable<Turno> {
    return this.http.post<Turno>(`${this.base}/turnos`, request);
  }
}
