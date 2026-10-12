import { Component, computed, input } from '@angular/core';

export type VarianteEsqueleto =
  | 'producto'
  | 'destacado'
  | 'fila'
  | 'sucursal'
  | 'texto'
  | 'tabla'
  | 'metricas';

/** Cantidad de piezas por defecto de cada variante (las de métricas son fijas). */
const CANTIDAD_POR_DEFECTO: Record<VarianteEsqueleto, number> = {
  producto: 6,
  destacado: 3,
  fila: 3,
  sucursal: 2,
  texto: 3,
  tabla: 5,
  metricas: 1,
};

/**
 * Esqueleto de carga: bloques con un brillo suave que reservan el espacio del contenido que
 * está por llegar. La región se anuncia una sola vez (`role="status"`, `aria-busy`) con
 * `etiqueta`; las piezas son decorativas. Con "reducir movimiento" el brillo se apaga.
 */
@Component({
  selector: 'app-esqueleto',
  templateUrl: './esqueleto.html',
  styleUrl: './esqueleto.css',
})
export class Esqueleto {
  readonly variante = input.required<VarianteEsqueleto>();
  readonly cantidad = input<number | null>(null);
  readonly etiqueta = input('Cargando…');

  protected readonly piezas = computed(() => {
    const n = this.cantidad() ?? CANTIDAD_POR_DEFECTO[this.variante()];
    return Array.from({ length: n }, (_, i) => i);
  });
}
