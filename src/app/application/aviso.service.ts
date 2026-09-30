import { Injectable, signal } from '@angular/core';

export interface Aviso {
  id: number;
  titulo: string;
  detalle?: string;
  accion?: { texto: string; ruta: string };
}

/** Aviso flotante (toast) único: uno nuevo reemplaza al anterior y reinicia el tiempo. */
@Injectable({ providedIn: 'root' })
export class AvisoService {
  static readonly DURACION_MS = 4000;

  private readonly avisoSignal = signal<Aviso | null>(null);
  readonly aviso = this.avisoSignal.asReadonly();

  private siguienteId = 1;
  private temporizador: ReturnType<typeof setTimeout> | null = null;

  mostrar(aviso: Omit<Aviso, 'id'>): void {
    this.avisoSignal.set({ ...aviso, id: this.siguienteId++ });
    this.programarCierre();
  }

  avisarProductoAgregado(nombre: string, cantidadEnCarrito: number): void {
    this.mostrar({
      titulo: `${nombre} agregado al carrito`,
      detalle: `Llevas ${cantidadEnCarrito} producto${cantidadEnCarrito === 1 ? '' : 's'} en el carrito.`,
      accion: { texto: 'Ver carrito', ruta: '/carrito' },
    });
  }

  cerrar(): void {
    this.limpiar();
    this.avisoSignal.set(null);
  }

  /** Detiene el cierre automático mientras el usuario lee o interactúa con el aviso. */
  pausar(): void {
    this.limpiar();
  }

  reanudar(): void {
    if (this.avisoSignal()) {
      this.programarCierre();
    }
  }

  private programarCierre(): void {
    this.limpiar();
    this.temporizador = setTimeout(() => this.cerrar(), AvisoService.DURACION_MS);
  }

  private limpiar(): void {
    if (this.temporizador !== null) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
  }
}
