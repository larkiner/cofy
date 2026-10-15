import { Component, computed, input } from '@angular/core';
import { Icono } from '../icono/icono';

const PASOS = [
  { estado: 'PAGADO', texto: 'Pagado' },
  { estado: 'EN_PREPARACION', texto: 'En preparación' },
  { estado: 'LISTO', texto: 'Listo para retirar' },
] as const;

/**
 * Seguimiento visual de un pedido en curso: tres pasos (Pagado, En preparación, Listo para
 * retirar). El paso actual lleva `aria-current="step"` y los completados, el icono `check`.
 * Solo se dibuja con estado PAGADO, EN_PREPARACION o LISTO; con cualquier otro no muestra nada.
 */
@Component({
  selector: 'app-seguimiento-pedido',
  imports: [Icono],
  templateUrl: './seguimiento-pedido.html',
  styleUrl: './seguimiento-pedido.css',
})
export class SeguimientoPedido {
  readonly estado = input.required<string>();

  /** Pasos con su situación, o `null` si el estado no admite seguimiento. */
  protected readonly pasos = computed(() => {
    const actual = PASOS.findIndex((p) => p.estado === this.estado());
    if (actual < 0) return null;
    return PASOS.map((p, i) => ({ texto: p.texto, hecho: i < actual, actual: i === actual }));
  });
}
