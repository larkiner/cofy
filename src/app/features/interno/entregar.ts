import { CurrencyPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InternoService } from '../../application/interno.service';
import { PedidoInterno } from '../../domain/interno/interno.model';

@Component({
  selector: 'app-entregar',
  imports: [CurrencyPipe, FormsModule],
  templateUrl: './entregar.html',
  styleUrl: './interno.css',
})
export class Entregar {
  private readonly interno = inject(InternoService);

  protected codigo = '';
  protected readonly procesando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly entregado = signal<PedidoInterno | null>(null);

  protected entregar(): void {
    if (!this.codigo.trim()) return;
    this.error.set(null);
    this.entregado.set(null);
    this.procesando.set(true);

    this.interno.entregar(this.codigo.trim()).subscribe({
      next: pedido => {
        this.procesando.set(false);
        this.entregado.set(pedido);
        this.codigo = '';
      },
      error: err => {
        this.procesando.set(false);
        this.error.set(err.status === 404
          ? 'Código de retiro no válido.'
          : err.status === 409
            ? 'El pedido no se puede entregar (¿ya fue entregado o no está pagado?).'
            : 'No se pudo procesar la entrega.');
      },
    });
  }
}
