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
