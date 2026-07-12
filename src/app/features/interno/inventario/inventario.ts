import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InternoService } from '../../../application/interno.service';
import { Categoria, ProductoAdmin } from '../../../domain/interno/interno.model';

/** Inventario: gestión de categorías y productos (solo ADMIN). */
@Component({
  selector: 'app-inventario',
  imports: [CurrencyPipe, FormsModule],
  templateUrl: './inventario.html',
  styleUrl: '../interno.css',
})
export class Inventario {
  private readonly interno = inject(InternoService);

  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly productos = signal<ProductoAdmin[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly mensaje = signal<string | null>(null);

  // ---- form de categoría ----
  protected catNombre = '';
  protected catDescripcion = '';

  // ---- form de producto (crear o editar) ----
  protected readonly editandoId = signal<number | null>(null);
  protected prodNombre = '';
  protected prodDescripcion = '';
  protected prodPrecio: number | null = null;
  protected prodCategoriaId: number | null = null;
  protected prodDisponible: 'S' | 'N' = 'S';
  protected prodImagenUrl = '';

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.interno.categorias().subscribe({ next: c => this.categorias.set(c) });
    this.interno.productos().subscribe({
      next: p => this.productos.set(p),
      error: () => this.error.set('No se pudo cargar el inventario.'),
    });
  }

  protected nombreCategoria(id: number): string {
    return this.categorias().find(c => c.id === id)?.nombre ?? String(id);
  }

  // ---------------- categorías ----------------

  protected crearCategoria(): void {
    if (!this.catNombre.trim()) return;
    this.limpiarMensajes();
    this.interno.crearCategoria(this.catNombre.trim(), this.catDescripcion || null).subscribe({
      next: () => {
        this.mensaje.set('Categoría creada.');
        this.catNombre = '';
        this.catDescripcion = '';
        this.cargar();
      },
      error: err => this.error.set(err.status === 409
        ? 'Ya existe una categoría con ese nombre.'
        : 'No se pudo crear la categoría.'),
    });
  }

  // ---------------- productos ----------------

  protected editar(producto: ProductoAdmin): void {
    this.limpiarMensajes();
    this.editandoId.set(producto.id);
    this.prodNombre = producto.nombre;
    this.prodDescripcion = producto.descripcion ?? '';
    this.prodPrecio = producto.precio;
    this.prodCategoriaId = producto.categoriaId;
    this.prodDisponible = producto.disponible;
    this.prodImagenUrl = producto.imagenUrl ?? '';
  }

  protected cancelarEdicion(): void {
    this.editandoId.set(null);
    this.limpiarFormProducto();
  }

  protected guardarProducto(): void {
    if (!this.prodNombre.trim() || this.prodPrecio === null || this.prodCategoriaId === null) return;
    this.limpiarMensajes();

    const request = {
      nombre: this.prodNombre.trim(),
      descripcion: this.prodDescripcion || undefined,
      precio: this.prodPrecio,
      categoriaId: this.prodCategoriaId,
      disponible: this.prodDisponible,
      imagenUrl: this.prodImagenUrl || undefined,
    };

    const id = this.editandoId();
    const operacion = id === null
      ? this.interno.crearProducto(request)
      : this.interno.actualizarProducto(id, request);

    operacion.subscribe({
      next: () => {
        this.mensaje.set(id === null ? 'Producto creado.' : 'Producto actualizado.');
        this.cancelarEdicion();
        this.cargar();
      },
      error: () => this.error.set('No se pudo guardar el producto.'),
    });
  }

  /** Atajo: alternar disponibilidad sin abrir el formulario. */
  protected alternarDisponible(producto: ProductoAdmin): void {
    this.limpiarMensajes();
    this.interno.actualizarProducto(producto.id, {
      nombre: producto.nombre,
      descripcion: producto.descripcion ?? undefined,
      precio: producto.precio,
      categoriaId: producto.categoriaId,
      disponible: producto.disponible === 'S' ? 'N' : 'S',
      imagenUrl: producto.imagenUrl ?? undefined,
    }).subscribe({
      next: () => this.cargar(),
      error: () => this.error.set('No se pudo cambiar la disponibilidad.'),
    });
  }

  private limpiarFormProducto(): void {
    this.prodNombre = '';
    this.prodDescripcion = '';
    this.prodPrecio = null;
    this.prodCategoriaId = null;
    this.prodDisponible = 'S';
    this.prodImagenUrl = '';
  }

  private limpiarMensajes(): void {
    this.error.set(null);
    this.mensaje.set(null);
  }
}
