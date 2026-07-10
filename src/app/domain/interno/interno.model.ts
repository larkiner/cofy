import { ItemPedidoRequest } from '../pedidos/pedido.model';

// ---------- Panel interno (personal) ----------

export interface PedidoEmpleado {
  pedidoId: number;
  codigoRetiro: string | null;
  fechaPedido: string;
  fechaEntrega: string | null;
  estado: string;
  total: number;
  sucursalId: number;
  trabajadorId: number | null;
  clienteId: number | null;
  clienteNombre: string | null;
  clienteTelefono: string | null;
}

export interface PedidoInterno {
  id: number;
  estado: string;
  trabajadorId: number | null;
  fechaEntrega: string | null;
  codigoRetiro: string | null;
  clienteId: number | null;
  sucursalId: number;
  total: number;
  fechaPedido: string;
}

export interface VentaMostradorRequest {
  items: ItemPedidoRequest[];
  metodoPago: string;
}

export interface VentaMostradorResponse {
  pedidoId: number;
  total: number;
  estado: string;
  codigoRetiro: string | null;
}

// ---------- Inventario (admin) ----------

export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string | null;
}

export interface ProductoAdmin {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  categoriaId: number;
  disponible: 'S' | 'N';
  imagenUrl: string | null;
}

export interface ProductoRequest {
  nombre: string;
  descripcion?: string;
  precio: number;
  categoriaId: number;
  disponible?: 'S' | 'N';
  imagenUrl?: string;
}

// ---------- Metricas, trabajadores y turnos ----------

export interface MetricaSucursal {
  sucursalId: number;
  fecha: string;
  sucursalNombre: string;
  cantidadPedidos: number;
  totalVentas: number;
}

export interface TrabajadorPerfil {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  rol: string;
  sucursalId: number;
  sucursalNombre: string;
  fechaContratacion: string;
  estado: string;
}

export interface Turno {
  id: number;
  trabajadorId: number;
  fecha: string;
  horaInicio: string;
  horaFin: string | null;
}

export interface TurnoRequest {
  trabajadorId: number;
  fecha: string; // yyyy-MM-dd
  horaInicio: string; // yyyy-MM-ddTHH:mm:ss
  horaFin: string;
}
