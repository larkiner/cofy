import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AvisoService } from '../../../application/aviso.service';
import { Icono } from '../icono/icono';

/**
 * Aviso flotante (toast) global: confirma acciones como agregar al carrito. No roba el foco;
 * el anuncio para lectores de pantalla va en una región `status` aparte, solo con texto.
 */
@Component({
  selector: 'app-aviso',
  imports: [RouterLink, Icono],
  templateUrl: './aviso.html',
  styleUrl: './aviso.css',
})
export class AvisoFlotante {
  protected readonly avisos = inject(AvisoService);

  protected readonly anuncio = computed(() => {
    const aviso = this.avisos.aviso();
    return aviso ? `${aviso.titulo}. ${aviso.detalle ?? ''}` : '';
  });

  /** Reanuda el cierre solo si el foco salió del aviso (no al pasar entre sus botones). */
  protected alPerderFoco(evento: FocusEvent): void {
    const aviso = evento.currentTarget as HTMLElement;
    if (!aviso.contains(evento.relatedTarget as Node | null)) {
      this.avisos.reanudar();
    }
  }
}
