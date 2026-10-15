import { CurrencyPipe, NgTemplateOutlet } from '@angular/common';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { AuthService } from '../../application/auth.service';
import { AvisoService } from '../../application/aviso.service';
import { CarritoService } from '../../application/carrito.service';
import { MenuService } from '../../application/menu.service';
import { MenuItem } from '../../domain/menu/menu.model';
import { EstadoVacio } from '../../shared/ui/estado-vacio/estado-vacio';
import { Esqueleto } from '../../shared/ui/esqueleto/esqueleto';
import { Icono } from '../../shared/ui/icono/icono';
import { ImagenProducto } from '../../shared/ui/imagen-producto/imagen-producto';

interface GrupoCategoria {
  categoria: string;
  items: MenuItem[];
}

/**
 * Vista de la Carta: barra lateral con buscador e índice de categorías, y una
 * categoría a la vez en la rejilla de tarjetas (en móvil, el índice queda fijo bajo el
 * header y los productos pasan a filas compactas con foto). Al buscar, los resultados se
 * muestran agrupados por categoría. La landing de marca (hero, destacados,
 * historia, rewards, horario) vive en su propia vista ({@link Inicio}, ruta /).
 */
@Component({
  selector: 'app-menu',
  imports: [CurrencyPipe, NgTemplateOutlet, EstadoVacio, Esqueleto, Icono, ImagenProducto],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu {
  private readonly menuService = inject(MenuService);
  protected readonly carrito = inject(CarritoService);
  protected readonly auth = inject(AuthService);
  private readonly avisos = inject(AvisoService);

  private readonly contenido = viewChild<ElementRef<HTMLElement>>('contenido');

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly items = signal<MenuItem[]>([]);

  /** Categoría seleccionada en el índice (null = la primera disponible). */
  protected readonly categoriaActiva = signal<string | null>(null);

  /** Texto del buscador: filtra nombre y descripción en todas las categorías. */
  protected readonly busqueda = signal('');

  /** Menú agrupado por categoría, en el orden en que llega del backend. */
  protected readonly grupos = computed<GrupoCategoria[]>(() => {
    const porCategoria = new Map<string, MenuItem[]>();
    for (const item of this.items()) {
      const lista = porCategoria.get(item.categoria) ?? [];
      lista.push(item);
      porCategoria.set(item.categoria, lista);
    }
    return [...porCategoria.entries()].map(([categoria, items]) => ({ categoria, items }));
  });

  /** Nombres de categoría para el índice. */
  protected readonly categorias = computed(() => this.grupos().map((g) => g.categoria));

  /** Categoría realmente resaltada: la seleccionada, o la primera si aún no hay selección. */
  protected readonly categoriaResaltada = computed(
    () => this.categoriaActiva() ?? this.grupos()[0]?.categoria ?? null,
  );

  /** Ítems del grupo activo (o el primero, si aún no se ha seleccionado ninguno). */
  protected readonly itemsActivos = computed<MenuItem[]>(() => {
    const grupos = this.grupos();
    const activa = this.categoriaActiva();
    const grupo = grupos.find((g) => g.categoria === activa) ?? grupos[0];
    return grupo?.items ?? [];
  });

  private readonly consulta = computed(() => this.normalizar(this.busqueda()));

  /** Coincidencias de la búsqueda en todas las categorías; vacío si no hay consulta. */
  protected readonly resultadosBusqueda = computed<GrupoCategoria[]>(() => {
    const consulta = this.consulta();
    if (!consulta) return [];
    return this.grupos()
      .map((grupo) => ({
        categoria: grupo.categoria,
        items: grupo.items.filter(
          (item) =>
            this.normalizar(item.nombre).includes(consulta) ||
            this.normalizar(item.descripcion ?? '').includes(consulta),
        ),
      }))
      .filter((grupo) => grupo.items.length > 0);
  });

  /** Hay una búsqueda activa que no encontró ningún producto. */
  protected readonly sinResultados = computed(
    () => this.consulta().length > 0 && this.resultadosBusqueda().length === 0,
  );

  /** Texto para el lector de pantalla: solo se anuncia mientras hay búsqueda. */
  protected readonly mensajeResultados = computed(() => {
    if (!this.consulta() || this.cargando() || this.error()) return '';
    const total = this.resultadosBusqueda().reduce((suma, g) => suma + g.items.length, 0);
    if (total === 0) return 'Sin resultados';
    return total === 1 ? '1 resultado' : `${total} resultados`;
  });

  constructor() {
    this.cargar();
  }

  /** Pide la carta al backend; también la usa el botón «Reintentar» del estado de error. */
  protected cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.menuService.obtenerMenu().subscribe({
      next: (items) => {
        this.items.set(items);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar la carta. Revisa tu conexión e inténtalo de nuevo.');
        this.cargando.set(false);
      },
    });
  }

  protected buscar(valor: string): void {
    this.busqueda.set(valor);
  }

  protected borrarBusqueda(): void {
    this.busqueda.set('');
  }

  /** Activa solo si no hay búsqueda: mientras se busca ninguna categoría queda resaltada. */
  protected esActiva(categoria: string): boolean {
    return !this.consulta() && categoria === this.categoriaResaltada();
  }

  protected seleccionarCategoria(categoria: string): void {
    this.busqueda.set('');
    this.categoriaActiva.set(categoria);
    this.mostrarInicioDelContenido();
  }

  protected agregar(item: MenuItem): void {
    this.carrito.agregar(item);
    this.avisos.avisarProductoAgregado(item.nombre, this.carrito.cantidadTotal());
  }

  /** Minúsculas y sin tildes, para que «cafe» encuentre «Café». */
  private normalizar(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  /**
   * El índice queda fijo (barra lateral en escritorio, franja bajo el header en móvil): el
   * contenido puede quedar por encima de la pantalla. Se vuelve a su inicio, respetando el
   * `scroll-margin-top` que deja libres el header y el índice.
   */
  private mostrarInicioDelContenido(): void {
    const contenido = this.contenido()?.nativeElement;
    if (!contenido || typeof window === 'undefined') return;

    const margen = parseFloat(getComputedStyle(contenido).scrollMarginTop) || 0;
    if (contenido.getBoundingClientRect().top >= margen) return;

    const sinMovimiento =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    contenido.scrollIntoView({ block: 'start', behavior: sinMovimiento ? 'auto' : 'smooth' });
  }
}
