import { Component, input } from '@angular/core';

/** Nombres de ícono soportados (trazo estilo Lucide, 2px, currentColor). */
export type NombreIcono =
  | 'sun'
  | 'moon'
  | 'plus'
  | 'minus'
  | 'x'
  | 'check'
  | 'ban'
  | 'home'
  | 'coffee'
  | 'shopping-bag'
  | 'user'
  | 'search'
  | 'refresh-cw'
  | 'map-pin'
  | 'phone'
  | 'log-out'
  | 'layout-dashboard'
  | 'chevron-right'
  | 'eye'
  | 'eye-off';

/**
 * Ícono en línea (SVG inline, sin sprite ni fuente de íconos). Decorativo
 * por defecto (`aria-hidden`): el nombre accesible lo aporta el texto o
 * el `aria-label` de alrededor (un botón, un enlace…). Si el ícono va
 * solo y necesita su propio nombre accesible, se le pasa `etiqueta`.
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
}
