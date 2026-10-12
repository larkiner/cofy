import { CurrencyPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CarritoService } from '../../application/carrito.service';
import { Icono } from '../../shared/ui/icono/icono';

/**
 * Carrito (/carrito): revisar y editar las líneas del pedido. La sucursal de retiro, el método
 * de pago y la confirmación viven en su propia página, el checkout (/checkout).
 */
@Component({
  selector: 'app-carrito',
  imports: [CurrencyPipe, Icono, RouterLink],
  templateUrl: './carrito.html',
  styleUrl: './carrito.css',
})
export class Carrito {
  protected readonly carrito = inject(CarritoService);
}
