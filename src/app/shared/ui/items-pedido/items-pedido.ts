import { Component, input } from '@angular/core';
import { ItemTablero } from '../../../domain/interno/interno.model';

/**
 * Lista de lo que hay que preparar de un pedido ("2× Cappuccino"). Si la API todavía no manda
 * los ítems (versión anterior) no pinta nada.
 */
@Component({
  selector: 'app-items-pedido',
  templateUrl: './items-pedido.html',
})
export class ItemsPedido {
  readonly items = input<ItemTablero[] | undefined>([]);
  /** Tamaño de lectura a distancia (tablero de barra). */
  readonly grande = input(false);
  /** Una sola línea de texto ("2× Latte · 1× Pan de Bono"), válida dentro de un botón. */
  readonly enLinea = input(false);
}
