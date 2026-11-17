import { CurrencyPipe } from '@angular/common';
import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { EMPTY, catchError, exhaustMap, filter, timer } from 'rxjs';
import { InternoService } from '../../../application/interno.service';
import { PedidoEmpleado } from '../../../domain/interno/interno.model';
import { Icono } from '../../../shared/ui/icono/icono';
import { ItemsPedido } from '../../../shared/ui/items-pedido/items-pedido';
import { etiquetaEstado } from '../../../shared/util/etiquetas';
import { textoEspera } from '../../../shared/util/espera';

/** Estados que todavía se pueden entregar (los mismos que acepta la API). */
const ENTREGABLES = ['PAGADO', 'EN_PREPARACION', 'LISTO'];

/** Código comparable: sin espacios, en mayúsculas y sin el prefijo `RET-`. */
const clave = (codigo: string) =>
  codigo
    .replace(/\s+/g, '')
    .toUpperCase()
    .replace(/^RET-?/, '');

/** Entrega en dos pasos: elegir el pedido (de la lista o por código) y confirmarlo. */
@Component({
  selector: 'app-entregar',
  imports: [CurrencyPipe, FormsModule, Icono, ItemsPedido],
  templateUrl: './entregar.html',
  styleUrl: './entregar.css',
})
export class Entregar {
  /** Cada cuánto se refresca la lista de pedidos listos (15 s). */
  static readonly INTERVALO_MS = 15_000;

  private readonly interno = inject(InternoService);
  private readonly injector = inject(Injector);
  private readonly tituloConfirmacion = viewChild<ElementRef<HTMLElement>>('tituloConfirmacion');
  private readonly campoCodigo = viewChild<ElementRef<HTMLInputElement>>('campoCodigo');

  protected codigo = '';
  protected readonly pedidos = signal<PedidoEmpleado[]>([]);
  protected readonly cargando = signal(true);
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly buscando = signal(false);
  protected readonly procesando = signal(false);
  protected readonly error = signal<string | null>(null);
  /** Pedido elegido, pendiente de confirmar la entrega (paso 2). */
  protected readonly seleccionado = signal<PedidoEmpleado | null>(null);
  /** Mensaje de la última entrega; vive en una región `role="status"` siempre presente. */
  protected readonly exito = signal('');
  private readonly ahora = signal(Date.now());

  /** Pedidos listos, del que más lleva esperando al más reciente. */
  protected readonly listos = computed(() =>
    this.pedidos()
      .filter((p) => p.estado === 'LISTO')
      .sort((a, b) => new Date(a.fechaPedido).getTime() - new Date(b.fechaPedido).getTime()),
  );

  /** Pedido elegido que todavía no está listo: se avisa antes de entregarlo. */
  protected readonly noEstaListo = computed(() => {
    const pedido = this.seleccionado();
    return !!pedido && pedido.estado !== 'LISTO';
  });

  protected readonly etiquetaEstado = etiquetaEstado;

  constructor() {
    this.cargar();
    // Refresco silencioso mientras la pestaña está visible (mismo patrón que el tablero).
    timer(Entregar.INTERVALO_MS, Entregar.INTERVALO_MS)
      .pipe(
        filter(() => !document.hidden),
        exhaustMap(() => this.interno.tablero(null, null).pipe(catchError(() => EMPTY))),
        takeUntilDestroyed(),
      )
      .subscribe((pedidos) => this.recibir(pedidos));
  }

  private recibir(pedidos: PedidoEmpleado[]): void {
    this.pedidos.set(pedidos);
    this.errorCarga.set(null);
    this.ahora.set(Date.now());
  }

  protected cargar(): void {
    this.interno.tablero(null, null).subscribe({
      next: (pedidos) => {
        this.recibir(pedidos);
        this.cargando.set(false);
      },
      error: () => {
        this.errorCarga.set('No se pudo cargar la lista de pedidos listos.');
        this.cargando.set(false);
      },
    });
  }

  protected espera(pedido: PedidoEmpleado): string {
    return textoEspera(pedido.fechaPedido, this.ahora());
  }

  protected elegir(pedido: PedidoEmpleado): void {
    this.error.set(null);
    this.seleccionar(pedido);
  }

  protected cancelar(): void {
    this.seleccionado.set(null);
    this.error.set(null);
    this.enfocarTrasRender(() => this.campoCodigo());
  }

  /** Pasa al paso 2 y lleva el foco al título de la confirmación (el formulario desaparece). */
  private seleccionar(pedido: PedidoEmpleado): void {
    this.seleccionado.set(pedido);
    this.enfocarTrasRender(() => this.tituloConfirmacion());
  }

  private enfocarTrasRender(elemento: () => ElementRef<HTMLElement> | undefined): void {
    afterNextRender(() => elemento()?.nativeElement.focus(), { injector: this.injector });
  }

  private buscarEnCargados(clavePedido: string): PedidoEmpleado | undefined {
    return this.pedidos().find(
      (p) =>
        ENTREGABLES.includes(p.estado) && !!p.codigoRetiro && clave(p.codigoRetiro) === clavePedido,
    );
  }

  /** Paso 1 por código: busca en los pedidos cargados y, si no está, vuelve a pedir la lista una vez. */
  protected buscar(): void {
    const buscado = clave(this.codigo);
    if (!buscado || this.buscando()) return;
    this.error.set(null);
    this.exito.set('');

    const encontrado = this.buscarEnCargados(buscado);
    if (encontrado) {
      this.seleccionar(encontrado);
      return;
    }

    this.buscando.set(true);
    this.interno.tablero(null, null).subscribe({
      next: (pedidos) => {
        this.recibir(pedidos);
        this.buscando.set(false);
        this.resolverBusqueda(this.buscarEnCargados(buscado));
      },
      error: () => {
        this.buscando.set(false);
        this.seleccionado.set(null);
        this.error.set('No se pudo buscar el pedido. Revisa la conexión e inténtalo de nuevo.');
      },
    });
  }

  private resolverBusqueda(pedido: PedidoEmpleado | undefined): void {
    if (pedido) {
      this.seleccionar(pedido);
    } else {
      this.seleccionado.set(null);
      this.error.set('No hay un pedido activo con ese código en esta sede.');
    }
  }

  /** Paso 2: confirma la entrega del pedido elegido. */
  protected confirmar(): void {
    const pedido = this.seleccionado();
    if (!pedido?.codigoRetiro || this.procesando()) return;
    this.error.set(null);
    this.exito.set('');
    this.procesando.set(true);

    this.interno.entregar(pedido.codigoRetiro).subscribe({
      next: () => {
        this.procesando.set(false);
        this.exito.set(
          pedido.clienteNombre
            ? `Pedido #${pedido.pedidoId} entregado a ${pedido.clienteNombre}`
            : `Pedido #${pedido.pedidoId} entregado`,
        );
        this.pedidos.update((lista) => lista.filter((p) => p.pedidoId !== pedido.pedidoId));
        this.seleccionado.set(null);
        this.codigo = '';
      },
      error: (err) => {
        this.procesando.set(false);
        this.error.set(
          err.status === 404
            ? 'Código de retiro no válido.'
            : err.status === 409
              ? 'El pedido no se puede entregar (¿ya fue entregado o no está pagado?).'
              : 'No se pudo procesar la entrega.',
        );
        // Si otro compañero ya lo entregó, la lista debe reflejarlo.
        if (err.status === 404 || err.status === 409) this.cargar();
      },
    });
  }
}
