import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/auth.service';

/** Placeholder: el panel interno completo (tablero, entrega, inventario) se construye en el siguiente paso. */
@Component({
  selector: 'app-panel-interno',
  template: `
    <section style="max-width: 600px; margin: 3rem auto; padding: 0 1rem; text-align: center;">
      <h1 style="color: var(--cafe-oscuro);">Panel interno</h1>
      <p style="color: var(--cafe-medio); margin-top: 0.5rem;">
        Sesión activa como <strong>{{ auth.rol() }}</strong> ({{ auth.email() }}).
        El tablero de pedidos, entrega e inventario se construyen en el siguiente paso.
      </p>
    </section>
  `,
})
export class PanelInterno {
  protected readonly auth = inject(AuthService);
}
