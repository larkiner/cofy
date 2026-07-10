// ============================================================
// Modelos TypeScript: espejo de los JSON que devuelve el backend
// ============================================================

// ---------- Menú y sucursales (público) ----------

export interface MenuItem {
  productoId: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  imagenUrl: string | null;
  categoriaId: number;
  categoria: string;
}

export interface Sucursal {
  id: number;
  nombre: string;
  direccion: string;
  telefono: string | null;
}

// ---------- Autenticación ----------

export interface RegistroRequest {
  nombre: string;
  email: string;
  telefono?: string;
  password: string;
  sucursalId?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  email: string;
  rol: string; // CLIENTE | BARISTA | CAJERO | SUPERVISOR | ADMIN
}

// ---------- Pedidos del cliente ----------

export interface ItemPedidoRequest {
  productoId: number;
  cantidad: number;
}

export interface CrearPedidoRequest {
  sucursalId: number;
  items: ItemPedidoRequest[];
}

export interface PedidoCreado {
  pedidoId: number;
  total: number;
  estado: string;
}

export interface PedidoCliente {
  pedidoId: number;
  clienteId: number;
  codigoRetiro: string | null;
  fechaPedido: string;
  fechaEntrega: string | null;
  estado: string;
  total: number;
  sucursalNombre: string;
  sucursalDireccion: string;
}

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
  fecha: string;       // yyyy-MM-dd
  horaInicio: string;  // yyyy-MM-ddTHH:mm:ss
  horaFin: string;
}
