import { Component, input } from '@angular/core';

/**
 * Foto de producto que SIEMPRE se ve completa dentro de su contenedor, sea cual
 * sea la proporción de la foto (vertical, horizontal o cuadrada): la foto se
 * ajusta (`contain`) y el sobrante se rellena con una copia suya desenfocada, en
 * vez de recortarla. Si la proporción coincide con la del contenedor se ve igual
 * que un `cover`. Llena a su contenedor (que debe tener tamaño propio).
 */
@Component({
  selector: 'app-imagen-producto',
  standalone: true,
  templateUrl: './imagen-producto.html',
  styleUrl: './imagen-producto.css',
})
export class ImagenProducto {
  readonly src = input.required<string>();
  /** Texto alternativo; vacío si la foto es decorativa (el nombre ya está al lado). */
  readonly alt = input<string>('');
}
