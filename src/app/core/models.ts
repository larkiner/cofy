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
