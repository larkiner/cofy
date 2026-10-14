import { Component, computed, input } from '@angular/core';

/** Nombres de ícono soportados: exactamente los PNG de `public/iconos/`. */
export type NombreIcono =
  | 'sun'
  | 'moon'
  | 'plus'
  | 'minus'
  | 'x'
  | 'check'
  | 'check-circle'
  | 'ban'
  | 'coffee'
  | 'shopping-bag'
  | 'user'
  | 'search'
  | 'map-pin'
  | 'log-out'
  | 'chevron-right'
  | 'eye'
  | 'eye-off'
  | 'menu'
  | 'sprout'
  | 'imagen'
  | 'subir'
  | 'tablero'
  | 'entregar'
  | 'caja'
  | 'inventario'
  | 'grafica'
  | 'calendario'
  | 'actualizar'
  | 'editar'
  | 'reloj';

/**
 * Ícono del set único del proyecto: Icons8, pack Windows 11 Regular
 * (`fluent-systems-regular`). Cada glifo es un PNG de 96 px en
 * `public/iconos/<nombre>.png`, y se pinta con `currentColor` usando el
 * PNG como máscara CSS (el color lo da el texto que lo rodea, en ambos
 * temas). `cafeteria/icons8.json` es el candado del pack: todo ícono
 * nuevo sale de ese mismo pack. La licencia gratuita exige el crédito a
 * Icons8 que figura en el pie de la app.
 *
 * Decorativo por defecto (`aria-hidden`): el nombre accesible lo aporta el
 * texto o el `aria-label` de alrededor (un botón, un enlace…). Si el
 * ícono va solo y necesita su propio nombre accesible, se le pasa
 * `etiqueta`.
 */
@Component({
  selector: 'app-icono',
  standalone: true,
  templateUrl: './icono.html',
  styleUrl: './icono.css',
})
export class Icono {
  readonly nombre = input.required<NombreIcono>();
  readonly tamano = input<number>(20);
  readonly etiqueta = input<string | null>(null);

  /** `url()` relativa al `<base href>` del documento. */
  protected readonly mascara = computed(() => `url(iconos/${this.nombre()}.png)`);
}
