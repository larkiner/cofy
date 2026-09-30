import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ClienteService } from '../../application/cliente.service';
import { PedidoService } from '../../application/pedido.service';
import { ClientePerfil } from '../../domain/cliente/cliente.model';
import { PedidoCliente } from '../../domain/pedidos/pedido.model';

/**
 * Vista "Mi cuenta": datos del cliente autenticado, edición de nombre/teléfono
 * e historial de compras. Combina ClienteService (perfil) y PedidoService.
 */
@Component({
  selector: 'app-perfil',
  imports: [FormsModule, RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css',
})
export class Perfil {
  private readonly clienteService = inject(ClienteService);
  private readonly pedidoService = inject(PedidoService);

  // Perfil
  protected readonly perfil = signal<ClientePerfil | null>(null);
  protected readonly cargandoPerfil = signal(true);
  protected readonly errorPerfil = signal<string | null>(null);

  // Historial
  protected readonly pedidos = signal<PedidoCliente[]>([]);
  protected readonly cargandoPedidos = signal(true);
  protected readonly errorPedidos = signal<string | null>(null);

  // Formulario de edición
  protected readonly editando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly errorGuardar = signal<string | null>(null);
  protected readonly guardado = signal(false);
  protected nombre = '';
  protected telefono = '';

  constructor() {
    this.clienteService.miPerfil().subscribe({
      next: perfil => {
        this.perfil.set(perfil);
        this.cargandoPerfil.set(false);
      },
      error: () => {
        this.errorPerfil.set('No se pudo cargar tu perfil.');
        this.cargandoPerfil.set(false);
      },
    });

    this.pedidoService.misPedidos().subscribe({
      next: pedidos => {
        this.pedidos.set(pedidos);
        this.cargandoPedidos.set(false);
      },
      error: () => {
        this.errorPedidos.set('No se pudo cargar tu historial de compras.');
        this.cargandoPedidos.set(false);
      },
    });
  }

  protected iniciarEdicion(): void {
    const perfil = this.perfil();
    if (!perfil) return;
    this.nombre = perfil.nombre;
    this.telefono = perfil.telefono ?? '';
    this.errorGuardar.set(null);
    this.guardado.set(false);
    this.editando.set(true);
  }

  protected cancelar(): void {
    this.editando.set(false);
    this.errorGuardar.set(null);
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
      next: perfil => {
        this.perfil.set(perfil);
        this.guardando.set(false);
        this.editando.set(false);
        this.guardado.set(true);
      },
      error: () => {
        this.guardando.set(false);
        this.errorGuardar.set('No se pudieron guardar los cambios. Revisa los datos.');
      },
    });
  }
}
