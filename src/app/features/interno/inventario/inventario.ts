import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InternoService } from '../../../application/interno.service';
import { MenuService } from '../../../application/menu.service';
import { Categoria, ProductoAdmin } from '../../../domain/interno/interno.model';
import { Esqueleto } from '../../../shared/ui/esqueleto/esqueleto';
import { Icono } from '../../../shared/ui/icono/icono';
import { prepararImagen } from '../../../shared/util/preparar-imagen';

/** Formatos y tamaño que acepta la API para la foto de un producto. */
const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'];
/** Tope de la API, que se comprueba DESPUÉS de reducir la foto. */
const MAX_IMAGEN_BYTES = 5 * 1024 * 1024;
/** Tope de lo que se intenta abrir en el navegador (una foto de cámara pesa 3–15 MB). */
const MAX_ORIGINAL_BYTES = 30 * 1024 * 1024;

/** Inventario: gestión de categorías y productos (solo ADMIN). */
@Component({
  selector: 'app-inventario',
  imports: [CurrencyPipe, Esqueleto, FormsModule, Icono],
  templateUrl: './inventario.html',
  styleUrl: './inventario.css',
})
export class Inventario {
  private readonly interno = inject(InternoService);
  private readonly menuService = inject(MenuService);

  protected readonly categorias = signal<Categoria[]>([]);
  protected readonly productos = signal<ProductoAdmin[]>([]);
  protected readonly cargandoCategorias = signal(true);
  protected readonly cargandoProductos = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly mensaje = signal<string | null>(null);

  /** Productos totales y cuántos no están disponibles, para el resumen del encabezado. */
  protected readonly resumen = computed(() => {
    const todos = this.productos();
    return { total: todos.length, noDisponibles: todos.filter(p => p.disponible === 'N').length };
  });

  private readonly nombresCategoria = computed(() =>
    new Map(this.categorias().map(c => [c.id, c.nombre])));

  // ---- form de categoría ----
  protected catNombre = '';
  protected catDescripcion = '';

  // ---- form de producto (crear o editar) ----
  protected readonly editandoId = signal<number | null>(null);
  protected prodNombre = '';
  /** Nombre del producto que se está editando, fijo para el título del formulario. */
  protected nombreEditando = '';
  protected prodDescripcion = '';
  protected prodPrecio: number | null = null;
  protected prodCategoriaId: number | null = null;
  protected prodDisponible: 'S' | 'N' = 'S';
  protected prodImagenUrl = '';
  protected readonly subiendoImagen = signal(false);
  protected readonly errorImagen = signal<string | null>(null);

  constructor() {
    this.cargar();
  }

  protected cargar(): void {
    this.interno.categorias().subscribe({
      next: c => {
        this.categorias.set(c);
        this.cargandoCategorias.set(false);
      },
      error: () => this.cargandoCategorias.set(false),
    });
    this.interno.productos().subscribe({
      next: p => {
        this.productos.set(p);
        this.cargandoProductos.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el inventario.');
        this.cargandoProductos.set(false);
      },
    });
  }

  protected nombreCategoria(id: number): string {
    return this.nombresCategoria().get(id) ?? String(id);
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
      error: err => this.error.set(err.mensaje ?? 'No se pudo crear la categoría.'),
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
    this.nombreEditando = producto.nombre;

    // Lleva al formulario (que está en la columna lateral) y deja el cursor en el nombre.
    const formulario = document.getElementById('form-producto');
    formulario?.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
    document.getElementById('prod-nombre')?.focus({ preventScroll: true });
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
        this.menuService.invalidarMenu(); // el catálogo público cambió
        this.mensaje.set(id === null ? 'Producto creado.' : 'Producto actualizado.');
        this.cancelarEdicion();
        this.cargar();
      },
      error: err => this.error.set(err.mensaje ?? 'No se pudo guardar el producto.'),
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
      next: () => {
        this.menuService.invalidarMenu(); // el catálogo público cambió
        this.cargar();
      },
      error: err => this.error.set(err.mensaje ?? 'No se pudo cambiar la disponibilidad.'),
    });
  }

  /**
   * Toma la imagen del dispositivo (galería, cámara o carpeta), la reduce en el
   * navegador, la sube y deja su URL pública en el formulario; el producto la
   * guarda al pulsar "Crear"/"Guardar". Se valida aquí solo por comodidad
   * (respuesta inmediata): la API vuelve a comprobar tipo y tamaño.
   */
  protected seleccionarImagen(evento: Event): void {
    const entrada = evento.target as HTMLInputElement;
    const archivo = entrada.files?.[0];
    entrada.value = ''; // permite volver a elegir el mismo archivo
    if (!archivo) return;

    this.errorImagen.set(null);
    if (!TIPOS_IMAGEN.includes(archivo.type)) {
      this.errorImagen.set('Elige una imagen JPG, PNG o WEBP.');
      return;
    }
    if (archivo.size > MAX_ORIGINAL_BYTES) {
      this.errorImagen.set('La imagen es demasiado grande. Elige una de menos de 30 MB.');
      return;
    }

    this.subiendoImagen.set(true);
    prepararImagen(archivo).then(preparada => {
      if (preparada.size > MAX_IMAGEN_BYTES) {
        this.errorImagen.set('La imagen pesa más de 5 MB incluso reducida. Prueba con otra.');
        this.subiendoImagen.set(false);
        return;
      }
      this.interno.subirImagen(preparada).subscribe({
        next: ({ url }) => {
          this.prodImagenUrl = url;
          this.subiendoImagen.set(false);
        },
        error: err => {
          this.errorImagen.set(err.mensaje ?? 'No se pudo subir la imagen.');
          this.subiendoImagen.set(false);
        },
      });
    });
  }

  protected quitarImagen(): void {
    this.prodImagenUrl = '';
    this.errorImagen.set(null);
  }

  private limpiarFormProducto(): void {
    this.prodNombre = '';
    this.prodDescripcion = '';
    this.prodPrecio = null;
    this.prodCategoriaId = null;
    this.prodDisponible = 'S';
    this.prodImagenUrl = '';
    this.errorImagen.set(null);
  }

  private limpiarMensajes(): void {
    this.error.set(null);
    this.mensaje.set(null);
  }
}
