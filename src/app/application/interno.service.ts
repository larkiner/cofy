import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Categoria, MetricaSucursal, PedidoEmpleado, PedidoInterno, ProductoAdmin,
  ProductoRequest, TrabajadorPerfil, Turno, TurnoRequest,
  VentaMostradorRequest, VentaMostradorResponse,
} from '../domain/interno/interno.model';
import { InternoRepository } from '../domain/interno/interno.repository';

/** Operaciones del panel interno (personal de la cafetería). */
@Injectable({ providedIn: 'root' })
export class InternoService {
  private readonly repo = inject(InternoRepository);

  // ---------------- Tablero de pedidos ----------------

  tablero(estado: string | null, sucursalId: number | null): Observable<PedidoEmpleado[]> {
    return this.repo.tablero(estado, sucursalId);
  }

  cambiarEstado(pedidoId: number, estado: string): Observable<PedidoInterno> {
    return this.repo.cambiarEstado(pedidoId, estado);
  }

  entregar(codigoRetiro: string): Observable<PedidoInterno> {
    return this.repo.entregar(codigoRetiro);
  }

  ventaMostrador(request: VentaMostradorRequest): Observable<VentaMostradorResponse> {
    return this.repo.ventaMostrador(request);
  }

  // ---------------- Inventario (admin) ----------------

  productos(): Observable<ProductoAdmin[]> {
    return this.repo.productos();
  }

  crearProducto(request: ProductoRequest): Observable<ProductoAdmin> {
    return this.repo.crearProducto(request);
  }

  actualizarProducto(id: number, request: ProductoRequest): Observable<ProductoAdmin> {
    return this.repo.actualizarProducto(id, request);
  }

  categorias(): Observable<Categoria[]> {
    return this.repo.categorias();
  }

  crearCategoria(nombre: string, descripcion: string | null): Observable<Categoria> {
    return this.repo.crearCategoria(nombre, descripcion);
  }

  // ---------------- Métricas / trabajadores / turnos ----------------

  metricas(sucursalId: number | null): Observable<MetricaSucursal[]> {
    return this.repo.metricas(sucursalId);
  }

  miPerfil(): Observable<TrabajadorPerfil> {
    return this.repo.miPerfil();
  }

  trabajadores(): Observable<TrabajadorPerfil[]> {
    return this.repo.trabajadores();
  }

  misTurnos(): Observable<Turno[]> {
    return this.repo.misTurnos();
  }

  crearTurno(request: TurnoRequest): Observable<Turno> {
    return this.repo.crearTurno(request);
  }
}
