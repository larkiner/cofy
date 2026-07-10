import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { InternoService } from '../../core/interno.service';
import { MetricaSucursal } from '../../core/models';

/** Métricas de ventas por sucursal y día (SUPERVISOR/ADMIN). */
@Component({
  selector: 'app-metricas',
  imports: [CurrencyPipe, DatePipe],
  templateUrl: './metricas.html',
  styleUrl: './interno.css',
})
export class Metricas {
  private readonly interno = inject(InternoService);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly metricas = signal<MetricaSucursal[]>([]);

  constructor() {
    this.interno.metricas(null).subscribe({
      next: metricas => {
        this.metricas.set(metricas);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las métricas.');
        this.cargando.set(false);
      },
    });
  }
}
