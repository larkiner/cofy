import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InternoService } from '../../../application/interno.service';
import { MetricaSucursal } from '../../../domain/interno/interno.model';

interface PuntoSerie {
  fecha: string;
  total: number;
  pedidos: number;
  x: number;
  y: number;
  mostrarEtiqueta: boolean;
}

interface TotalSucursal {
  sucursalId: number;
  nombre: string;
  total: number;
  pedidos: number;
}

const ANCHO = 600;
const ALTO = 220;
const MARGEN = { arriba: 16, abajo: 28, izquierda: 8, derecha: 8 };

/** Métricas de ventas por sucursal y día, como dashboard (SUPERVISOR/ADMIN). */
@Component({
  selector: 'app-metricas',
  imports: [CurrencyPipe, DatePipe, FormsModule],
  templateUrl: './metricas.html',
  styleUrl: '../interno.css',
})
export class Metricas {
  private readonly interno = inject(InternoService);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly metricas = signal<MetricaSucursal[]>([]);
  protected readonly hoverPunto = signal<number | null>(null);

  protected readonly lineaAncho = ANCHO;
  protected readonly lineaAlto = ALTO;

  protected sucursalSeleccionada = '';

  protected readonly sucursales = computed(() => {
    const mapa = new Map<number, string>();
    for (const m of this.metricas()) mapa.set(m.sucursalId, m.sucursalNombre);
    return [...mapa.entries()]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  protected readonly metricasFiltradas = computed(() => {
    const id = this.sucursalSeleccionada ? Number(this.sucursalSeleccionada) : null;
    const todas = this.metricas();
    return id === null ? todas : todas.filter(m => m.sucursalId === id);
  });

  protected readonly kpis = computed(() => {
    const datos = this.metricasFiltradas();
    const totalVentas = datos.reduce((acc, m) => acc + m.totalVentas, 0);
    const totalPedidos = datos.reduce((acc, m) => acc + m.cantidadPedidos, 0);
    return {
      totalVentas,
      totalPedidos,
      ticketPromedio: totalPedidos === 0 ? 0 : totalVentas / totalPedidos,
      sucursalesActivas: new Set(datos.map(m => m.sucursalId)).size,
    };
  });

  protected readonly serieDiaria = computed<PuntoSerie[]>(() => {
    const mapa = new Map<string, { total: number; pedidos: number }>();
    for (const m of this.metricasFiltradas()) {
      const actual = mapa.get(m.fecha) ?? { total: 0, pedidos: 0 };
      actual.total += m.totalVentas;
      actual.pedidos += m.cantidadPedidos;
      mapa.set(m.fecha, actual);
    }
    const serie = [...mapa.entries()]
      .map(([fecha, v]) => ({ fecha, total: v.total, pedidos: v.pedidos }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha));

    const maxTotal = Math.max(...serie.map(p => p.total), 1);
    const anchoUtil = ANCHO - MARGEN.izquierda - MARGEN.derecha;
    const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo;
    const paso = serie.length > 1 ? anchoUtil / (serie.length - 1) : 0;
    const intervaloEtiqueta = Math.max(1, Math.ceil(serie.length / 6));

    return serie.map((p, i) => ({
      ...p,
      x: MARGEN.izquierda + paso * i,
      y: MARGEN.arriba + altoUtil * (1 - p.total / maxTotal),
      mostrarEtiqueta: i % intervaloEtiqueta === 0 || i === serie.length - 1,
    }));
  });

  protected readonly lineaPath = computed(() =>
    this.serieDiaria()
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' '),
  );

  protected readonly areaPath = computed(() => {
    const puntos = this.serieDiaria();
    if (puntos.length === 0) return '';
    const base = ALTO - MARGEN.abajo;
    const inicio = `M${puntos[0].x.toFixed(1)},${base}`;
    const linea = puntos.map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const fin = `L${puntos[puntos.length - 1].x.toFixed(1)},${base} Z`;
    return `${inicio} ${linea} ${fin}`;
  });

  protected readonly gridY = computed(() => {
    const maxTotal = Math.max(...this.serieDiaria().map(p => p.total), 1);
    const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo;
    const pasos = 4;
    return Array.from({ length: pasos + 1 }, (_, i) => {
      const valor = (maxTotal / pasos) * i;
      return { y: MARGEN.arriba + altoUtil * (1 - valor / maxTotal), valor };
    });
  });

  protected readonly porSucursal = computed<TotalSucursal[]>(() => {
    const mapa = new Map<number, TotalSucursal>();
    for (const m of this.metricasFiltradas()) {
      const actual = mapa.get(m.sucursalId) ?? {
        sucursalId: m.sucursalId,
        nombre: m.sucursalNombre,
        total: 0,
        pedidos: 0,
      };
      actual.total += m.totalVentas;
      actual.pedidos += m.cantidadPedidos;
      mapa.set(m.sucursalId, actual);
    }
    return [...mapa.values()].sort((a, b) => b.total - a.total);
  });

  protected readonly maxBarra = computed(() => Math.max(...this.porSucursal().map(s => s.total), 1));

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

  protected formatCompacto(valor: number): string {
    return '$' + new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 }).format(valor);
  }
}