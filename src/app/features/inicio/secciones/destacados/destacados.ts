import { CurrencyPipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MenuItem } from '../../../../domain/menu/menu.model';
import { Esqueleto } from '../../../../shared/ui/esqueleto/esqueleto';
import { Icono } from '../../../../shared/ui/icono/icono';

export type EstadoDestacados = 'cargando' | 'error' | 'listo';

/**
 * Recomendaciones de temporada (#destacados). Recibe los ítems ya elegidos por el inicio y el
 * estado de la carga; emite `agregar` al pulsar "Agregar". Con el menú cargado pero sin
 * recomendaciones, la sección no se muestra. En móvil es una fila deslizable con `scroll-snap`.
 */
@Component({
  selector: 'app-inicio-destacados',
  imports: [CurrencyPipe, Esqueleto, Icono, RouterLink],
  templateUrl: './destacados.html',
  styleUrl: './destacados.css',
})
export class InicioDestacados {
  readonly estado = input.required<EstadoDestacados>();
  readonly items = input.required<MenuItem[]>();
  /** Falso para el personal: ellos no hacen pedidos desde la página pública. */
  readonly puedeAgregar = input(true);
  readonly agregar = output<MenuItem>();
}
