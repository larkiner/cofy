import { Component, input } from '@angular/core';
import { Icono, NombreIcono } from '../icono/icono';

/**
 * Estado vacío: icono, título y, por proyección de contenido, un texto (contenido por defecto)
 * y una acción (un elemento con el atributo `accion`). `nivel` fija el nivel del encabezado
 * según donde se use (h2 por defecto; h3 dentro de una sección que ya tiene h2).
 *
 *   <app-estado-vacio icono="shopping-bag" titulo="El carrito está vacío">
 *     <p>Agrega productos desde la carta.</p>
 *     <a accion class="boton" routerLink="/menu">Explorar la carta</a>
 *   </app-estado-vacio>
 */
@Component({
  selector: 'app-estado-vacio',
  imports: [Icono],
  templateUrl: './estado-vacio.html',
  styleUrl: './estado-vacio.css',
})
export class EstadoVacio {
  readonly icono = input.required<NombreIcono>();
  readonly titulo = input.required<string>();
  readonly nivel = input<2 | 3>(2);
}
