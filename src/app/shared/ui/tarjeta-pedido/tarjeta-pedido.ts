import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { PedidoCliente } from '../../../domain/pedidos/pedido.model';
import { etiquetaEstado } from '../../util/etiquetas';
import { CodigoRetiro } from '../codigo-retiro/codigo-retiro';
import { SeguimientoPedido } from '../seguimiento-pedido/seguimiento-pedido';

export type ModoTarjetaPedido = 'en-curso' | 'historial';

/** Estados de un pedido que el cliente todavía tiene que ir a retirar. */
const ESTADOS_EN_CURSO = ['PAGADO', 'EN_PREPARACION', 'LISTO'];

/** Modo que le corresponde a un pedido según su estado (en curso o historial). */
export function modoDePedido(estado: string): ModoTarjetaPedido {
  return ESTADOS_EN_CURSO.includes(estado) ? 'en-curso' : 'historial';
}

/**
 * Pedido del cliente, compartido por «Mis pedidos» y el perfil.
 * - `en-curso` (PAGADO, EN_PREPARACION, LISTO): tiquete compacto con el código de retiro,
 *   seguimiento, sucursal, fecha y total.
 * - `historial` (ENTREGADO, CANCELADO, PENDIENTE_PAGO…): fila compacta con píldora de estado,
 *   fecha y total; el código va solo como texto pequeño, nunca como tiquete.
 * El estado siempre se muestra con su etiqueta legible, nunca el valor crudo de la API.
 */
@Component({
  selector: 'app-tarjeta-pedido',
  imports: [CodigoRetiro, CurrencyPipe, DatePipe, SeguimientoPedido],
  templateUrl: './tarjeta-pedido.html',
  styleUrl: './tarjeta-pedido.css',
})
export class TarjetaPedido {
  readonly pedido = input.required<PedidoCliente>();
  readonly modo = input<ModoTarjetaPedido>('historial');

  protected readonly etiqueta = computed(() => etiquetaEstado(this.pedido().estado));
}
