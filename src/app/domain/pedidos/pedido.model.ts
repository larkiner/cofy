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
