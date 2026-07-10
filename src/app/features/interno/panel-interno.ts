import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';

/** Layout del panel interno: sub-navegación según el rol + contenido. */
@Component({
  selector: 'app-panel-interno',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './panel-interno.html',
  styleUrl: './panel-interno.css',
})
export class PanelInterno {
  protected readonly auth = inject(AuthService);

  protected readonly esSupervisorOAdmin = computed(() =>
    ['SUPERVISOR', 'ADMIN'].includes(this.auth.rol() ?? ''));
}
