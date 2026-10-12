import { Component, model } from '@angular/core';
import { Icono } from '../icono/icono';

/**
 * Botón de ojo para mostrar u ocultar el valor de un campo de contraseña.
 * Siempre visible (no depende del foco ni de que ya haya texto escrito).
 *
 * Se coloca dentro de un contenedor con `position: relative` junto al
 * `<input>`; el componente se ancla solo al borde derecho. El input
 * alterna su `type` con el signal enlazado:
 *
 *   <span class="campo-password">
 *     <input [type]="verPassword() ? 'text' : 'password'" … />
 *     <app-alternar-password [(visible)]="verPassword" />
 *   </span>
 */
@Component({
  selector: 'app-alternar-password',
  imports: [Icono],
  templateUrl: './alternar-password.html',
  styleUrl: './alternar-password.css',
})
export class AlternarPassword {
  readonly visible = model(false);

  protected alternar(): void {
    this.visible.update(v => !v);
  }
}
