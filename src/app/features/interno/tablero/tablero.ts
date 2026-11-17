import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EMPTY, catchError, exhaustMap, filter, timer } from 'rxjs';
import { AuthService } from '../../../application/auth.service';
import { InternoService } from '../../../application/interno.service';
import { MenuService } from '../../../application/menu.service';
import { PedidoEmpleado } from '../../../domain/interno/interno.model';
import { Sucursal } from '../../../domain/menu/menu.model';
import { Esqueleto } from '../../../shared/ui/esqueleto/esqueleto';
import { Icono } from '../../../shared/ui/icono/icono';
import { ItemsPedido } from '../../../shared/ui/items-pedido/items-pedido';
import { etiquetaEstado } from '../../../shared/util/etiquetas';
import { minutosEspera, textoEspera } from '../../../shared/util/espera';

/** Siguiente paso de cada estado en el flujo de barra. */
const SIGUIENTE: Record<string, { estado: string; etiqueta: string }> = {
  PAGADO: { estado: 'EN_PREPARACION', etiqueta: 'Iniciar preparación' },
  EN_PREPARACION: { estado: 'LISTO', etiqueta: 'Marcar listo' },
};

/** Columnas del tablero, en el orden del flujo de barra. */
const COLUMNAS = [
  { estado: 'PAGADO', titulo: 'Por preparar' },
  { estado: 'EN_PREPARACION', titulo: 'En preparación' },
  { estado: 'LISTO', titulo: 'Listos para entregar' },
];

/** Estados en los que un pedido que lleva demasiado esperando se marca como demorado. */
const ESTADOS_CON_ALERTA = ['PAGADO', 'EN_PREPARACION'];

const tiempo = (pedido: PedidoEmpleado) => new Date(pedido.fechaPedido).getTime();

@Component({
  selector: 'app-tablero',
  imports: [CurrencyPipe, DatePipe, Esqueleto, FormsModule, Icono, ItemsPedido, RouterLink],
  templateUrl: './tablero.html',
})
export class Tablero {
  /** Cada cuánto se refresca el tablero solo (15 s). */
  static readonly INTERVALO_MS = 15_000;
  /** Cada cuánto se renueva el "hace N min" de las tarjetas (30 s). */
  static readonly INTERVALO_ESPERA_MS = 30_000;
  /** Un pedido por preparar o en preparación que pasa de estos minutos se marca como demorado. */
  static readonly MINUTOS_ALERTA = 10;

  private readonly interno = inject(InternoService);
  private readonly menu = inject(MenuService);
  private readonly auth = inject(AuthService);

  protected readonly estados = [
    'PAGADO',
    'EN_PREPARACION',
    'LISTO',
    'ENTREGADO',
    'PENDIENTE_PAGO',
    'CANCELADO',
  ];
  protected filtroEstado = '';
  protected filtroSede = '';

  /** Solo supervisor y admin ven todas las sedes y pueden elegir una; el resto ya viene limitado por la API. */
  protected readonly veVariasSedes = computed(() => {
    const rol = this.auth.rol();
    return rol === 'SUPERVISOR' || rol === 'ADMIN';
  });
  protected readonly sedes = signal<Sucursal[]>([]);
  private readonly nombresSede = computed(
    () => new Map(this.sedes().map((s) => [s.id, s.nombre] as const)),
  );
  /** Con el selector en "Todas" cada tarjeta indica su sede. */
  protected readonly mostrarSedeEnTarjeta = signal(true);

  protected readonly cargando = signal(true);
  /** Fallo al leer el tablero; solo reemplaza el tablero si todavía no hay datos. */
  protected readonly errorCarga = signal<string | null>(null);
  /** Fallo al avanzar un pedido concreto, por número de pedido; se muestra dentro de su tarjeta. */
  protected readonly erroresAccion = signal<Readonly<Record<number, string>>>({});
  /** Pedidos con un cambio de estado en curso: su botón queda bloqueado. */
  protected readonly ocupados = signal<ReadonlySet<number>>(new Set());
  /** Texto para el lector de pantalla tras cada avance. */
  protected readonly anuncio = signal('');
  protected readonly pedidos = signal<PedidoEmpleado[]>([]);
  protected readonly actualizadoEn = signal<Date | null>(null);
  /** Reloj de las esperas: se renueva cada 30 s. */
  private readonly ahora = signal(Date.now());

  /** Pedidos en curso por columna, del más antiguo al más reciente. */
  protected readonly columnas = computed(() =>
    COLUMNAS.map((columna) => ({
      ...columna,
      pedidos: this.pedidos()
        .filter((p) => p.estado === columna.estado)
        .sort((a, b) => tiempo(a) - tiempo(b)),
    })),
  );

  /** Pedidos fuera del flujo de barra (pendientes de pago, entregados, cancelados), recientes primero. */
  protected readonly otros = computed(() =>
    this.pedidos()
      .filter((p) => !COLUMNAS.some((c) => c.estado === p.estado))
      .sort((a, b) => tiempo(b) - tiempo(a)),
  );

  protected readonly etiquetaEstado = etiquetaEstado;

  constructor() {
    this.cargar();
    this.refrescarAutomaticamente();
    this.renovarEsperas();
    if (this.veVariasSedes()) this.cargarSedes();
  }

  private cargarSedes(): void {
    // Si falla, simplemente no hay selector ni etiquetas de sede: el tablero sigue igual.
    this.menu.obtenerSucursales().subscribe({
      next: (sedes) => this.sedes.set(sedes),
      error: () => this.sedes.set([]),
    });
  }

  private get sucursalId(): number | null {
    return this.filtroSede ? Number(this.filtroSede) : null;
  }

  private renovarEsperas(): void {
    timer(Tablero.INTERVALO_ESPERA_MS, Tablero.INTERVALO_ESPERA_MS)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.ahora.set(Date.now()));
  }

  /**
   * Refresco silencioso: sin pantalla de "Cargando", sin borrar los datos si
   * falla una lectura y sin pedir nada mientras la pestaña está oculta.
   * `exhaustMap` evita encimar peticiones si la API tarda más que el intervalo.
   */
  private refrescarAutomaticamente(): void {
    timer(Tablero.INTERVALO_MS, Tablero.INTERVALO_MS)
      .pipe(
        filter(() => !document.hidden),
        exhaustMap(() =>
          this.interno
            .tablero(this.filtroEstado || null, this.sucursalId)
            .pipe(catchError(() => EMPTY)),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((pedidos) => this.recibir(pedidos));
  }

  private recibir(pedidos: PedidoEmpleado[]): void {
    this.pedidos.set(pedidos);
    this.errorCarga.set(null);
    this.actualizadoEn.set(new Date());
    this.ahora.set(Date.now());
    this.mostrarSedeEnTarjeta.set(this.sucursalId === null);
  }

  /** Cambio de filtro: se descartan los datos del filtro anterior y se muestra la carga. */
  protected cambiarFiltro(): void {
    this.pedidos.set([]);
    this.cargar();
  }

  /** Lectura del tablero. `silencioso` no muestra el esqueleto (recarga tras avanzar un pedido). */
  protected cargar(silencioso = false): void {
    if (!silencioso) this.cargando.set(true);
    this.interno.tablero(this.filtroEstado || null, this.sucursalId).subscribe({
      next: (pedidos) => {
        this.recibir(pedidos);
        this.cargando.set(false);
      },
      error: () => {
        this.errorCarga.set('No se pudo cargar el tablero.');
        this.cargando.set(false);
      },
    });
  }

  protected accionDe(pedido: PedidoEmpleado) {
    return SIGUIENTE[pedido.estado] ?? null;
  }

  protected estaOcupado(pedido: PedidoEmpleado): boolean {
    return this.ocupados().has(pedido.pedidoId);
  }

  protected nombreSede(pedido: PedidoEmpleado): string | null {
    return this.nombresSede().get(pedido.sucursalId) ?? null;
  }

  protected espera(pedido: PedidoEmpleado): string {
    return textoEspera(pedido.fechaPedido, this.ahora());
  }

  protected demorado(pedido: PedidoEmpleado): boolean {
    return (
      ESTADOS_CON_ALERTA.includes(pedido.estado) &&
      minutosEspera(pedido.fechaPedido, this.ahora()) > Tablero.MINUTOS_ALERTA
    );
  }

  private marcarOcupado(id: number, ocupado: boolean): void {
    this.ocupados.update((actuales) => {
      const nuevos = new Set(actuales);
      if (ocupado) nuevos.add(id);
      else nuevos.delete(id);
      return nuevos;
    });
  }

  private fijarErrorAccion(id: number, mensaje: string | null): void {
    this.erroresAccion.update((actuales) => {
      const resto = { ...actuales };
      delete resto[id];
      return mensaje === null ? resto : { ...resto, [id]: mensaje };
    });
  }

  protected avanzar(pedido: PedidoEmpleado): void {
    const accion = this.accionDe(pedido);
    if (!accion || this.estaOcupado(pedido)) return;
    const id = pedido.pedidoId;
    this.marcarOcupado(id, true);
    this.fijarErrorAccion(id, null);

    this.interno.cambiarEstado(id, accion.estado).subscribe({
      next: () => {
        // El servidor ya confirmó: se refleja al instante y la recarga silenciosa lo concilia.
        this.pedidos.update((lista) =>
          lista.map((p) => (p.pedidoId === id ? { ...p, estado: accion.estado } : p)),
        );
        this.marcarOcupado(id, false);
        this.anuncio.set(`Pedido #${id} pasó a ${etiquetaEstado(accion.estado)}`);
        this.cargar(true);
      },
      error: (err) => {
        this.marcarOcupado(id, false);
        this.fijarErrorAccion(
          id,
          `No se pudo cambiar el estado del pedido #${id}. Inténtalo de nuevo.`,
        );
        // 409: alguien más lo cambió; se vuelve a leer para mostrar el estado real.
        if (err?.status === 409) this.cargar(true);
      },
    });
  }
}
