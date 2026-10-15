import { DatePipe } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClienteService } from '../../application/cliente.service';
import { PedidoService } from '../../application/pedido.service';
import { ClientePerfil } from '../../domain/cliente/cliente.model';
import { PedidoCliente } from '../../domain/pedidos/pedido.model';
import { EstadoVacio } from '../../shared/ui/estado-vacio/estado-vacio';
import { Esqueleto } from '../../shared/ui/esqueleto/esqueleto';
import { Icono } from '../../shared/ui/icono/icono';
import { modoDePedido, TarjetaPedido } from '../../shared/ui/tarjeta-pedido/tarjeta-pedido';

/** Cuántos pedidos se muestran en «Pedidos recientes»; el resto está en «Mis pedidos». */
const PEDIDOS_RECIENTES = 3;

/**
 * Vista «Mi cuenta»: datos del cliente autenticado con edición de nombre y teléfono, y sus tres
 * pedidos más recientes. Combina ClienteService (perfil) y PedidoService (el API devuelve los
 * pedidos del más nuevo al más antiguo).
 */
@Component({
  selector: 'app-perfil',
  imports: [DatePipe, EstadoVacio, Esqueleto, FormsModule, Icono, RouterLink, TarjetaPedido],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil {
  private readonly clienteService = inject(ClienteService);
  private readonly pedidoService = inject(PedidoService);
  private readonly injector = inject(Injector);

  // Perfil
  protected readonly perfil = signal<ClientePerfil | null>(null);
  protected readonly cargandoPerfil = signal(true);
  protected readonly errorPerfil = signal<string | null>(null);

  // Pedidos recientes
  protected readonly pedidos = signal<PedidoCliente[]>([]);
  protected readonly cargandoPedidos = signal(true);
  protected readonly errorPedidos = signal<string | null>(null);
  protected readonly recientes = computed(() => this.pedidos().slice(0, PEDIDOS_RECIENTES));

  // Formulario de edición
  protected readonly editando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorGuardar = signal<string | null>(null);
  protected readonly guardado = signal(false);
  protected nombre = '';
  protected telefono = '';

  private readonly primerCampo = viewChild<ElementRef<HTMLInputElement>>('primerCampo');
  private readonly botonEditar = viewChild<ElementRef<HTMLButtonElement>>('botonEditar');

  constructor() {
    this.clienteService.miPerfil().subscribe({
      next: (perfil) => {
        this.perfil.set(perfil);
        this.cargandoPerfil.set(false);
      },
      error: () => {
        this.errorPerfil.set('No se pudo cargar tu perfil.');
        this.cargandoPerfil.set(false);
      },
    });

    this.pedidoService.misPedidos().subscribe({
      next: (pedidos) => {
        this.pedidos.set(pedidos);
        this.cargandoPedidos.set(false);
      },
      error: () => {
        this.errorPedidos.set('No se pudo cargar tu historial de compras.');
        this.cargandoPedidos.set(false);
      },
    });
  }

  protected modoDe(pedido: PedidoCliente) {
    return modoDePedido(pedido.estado);
  }

  protected iniciarEdicion(): void {
    const perfil = this.perfil();
    if (!perfil) return;
    this.nombre = perfil.nombre;
    this.telefono = perfil.telefono ?? '';
    this.errorGuardar.set(null);
    this.guardado.set(false);
    this.editando.set(true);
    this.enfocar(this.primerCampo);
  }

  protected cancelar(): void {
    this.editando.set(false);
    this.errorGuardar.set(null);
    this.enfocar(this.botonEditar);
  }

  protected guardar(): void {
    this.errorGuardar.set(null);
    const nombre = this.nombre.trim();

    if (!nombre) {
      this.errorGuardar.set('El nombre es obligatorio.');
      return;
    }
    if (!/^\d{10}$/.test(this.telefono)) {
      this.errorGuardar.set('El teléfono debe tener exactamente 10 dígitos.');
      return;
    }

    this.guardando.set(true);
    this.clienteService.actualizar({ nombre, telefono: this.telefono }).subscribe({
      next: (perfil) => {
        this.perfil.set(perfil);
        this.guardando.set(false);
        this.editando.set(false);
        this.guardado.set(true);
        this.enfocar(this.botonEditar);
      },
      error: () => {
        this.guardando.set(false);
        this.errorGuardar.set('No se pudieron guardar los cambios. Revisa los datos.');
      },
    });
  }

  /** Mueve el foco al elemento cuando la vista ya se pintó (el formulario y el botón alternan). */
  private enfocar(elemento: () => ElementRef<HTMLElement> | undefined): void {
    afterNextRender(() => elemento()?.nativeElement.focus(), { injector: this.injector });
  }
}
