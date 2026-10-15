import { Component, computed, input } from '@angular/core';

/**
 * Código de retiro con forma de tiquete (la firma visual del sitio). Los grupos del código se
 * separan con espacio visual (margen), no con caracteres insertados: el texto es siempre el
 * código exacto, así que seleccionarlo y copiarlo da `RET-…` tal cual.
 * Variante `grande` (confirmación del pedido): sobre `--color-dark`; `compacto` (listas): borde fino.
 */
@Component({
  selector: 'app-codigo-retiro',
  templateUrl: './codigo-retiro.html',
  styleUrl: './codigo-retiro.css',
})
export class CodigoRetiro {
  readonly codigo = input.required<string>();
  readonly variante = input<'grande' | 'compacto'>('grande');

  /** Prefijo (`RET-`) y resto: dos tramos `inline` cuyo texto, unido, es el código exacto. */
  protected readonly tramos = computed(() => {
    const codigo = this.codigo();
    const corte = codigo.indexOf('-') + 1;
    return { prefijo: codigo.slice(0, corte), resto: codigo.slice(corte) };
  });
}
