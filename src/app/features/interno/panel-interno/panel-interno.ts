import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../application/auth.service';
import { Icono } from '../../../shared/ui/icono/icono';
import { etiquetaRol } from '../etiquetas';

/** Layout del panel interno: barra lateral según el rol + contenido. */
@Component({
  selector: 'app-panel-interno',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icono],
  templateUrl: './panel-interno.html',
  styleUrl: './panel-interno.css',
})
export class PanelInterno {
  protected readonly auth = inject(AuthService);

  protected readonly esSupervisorOAdmin = computed(() =>
    ['SUPERVISOR', 'ADMIN'].includes(this.auth.rol() ?? ''));

  /** Rol del usuario en palabras (p. ej. "Administrador"); vacío si no hay sesión. */
  protected readonly rolLegible = computed(() => {
    const rol = this.auth.rol();
    return rol ? etiquetaRol(rol) : '';
  });
}
