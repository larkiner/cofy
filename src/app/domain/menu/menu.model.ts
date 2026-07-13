// ---------- Menú y sucursales (público) ----------

export interface MenuItem {
  productoId: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  imagenUrl: string | null;
  categoriaId: number;
  categoria: string;
  /** Marca curada de "lo más pedido". Opcional: el backend puede no enviarlo. */
  destacado?: boolean;
}

export interface Sucursal {
  id: number;
  nombre: string;
  direccion: string;
  telefono: string | null;
}
