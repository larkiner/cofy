import { ViewportScroller } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationStart,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './application/auth.service';
import { CarritoService } from './application/carrito.service';
import { TemaService } from './application/tema.service';
import { AvisoFlotante } from './shared/ui/aviso/aviso';
import { Icono } from './shared/ui/icono/icono';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icono, AvisoFlotante],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly carrito = inject(CarritoService);
  protected readonly tema = inject(TemaService);
  private readonly router = inject(Router);

  private readonly encabezado = viewChild<ElementRef<HTMLElement>>('encabezado');
  private readonly contenedorCuenta = viewChild<ElementRef<HTMLElement>>('contenedorCuenta');
  private readonly botonCuenta = viewChild<ElementRef<HTMLButtonElement>>('botonCuenta');

  protected readonly cuentaAbierta = signal(false);
  protected readonly contadorRebota = signal(false);
  private cantidadPrevia = 0;

  /** El número del contador es aria-hidden, así que este texto es el único que lo anuncia. */
  protected readonly etiquetaCarrito = computed(() => {
    const cantidad = this.carrito.cantidadTotal();
    return cantidad > 0
      ? `Ver el carrito, ${cantidad} producto${cantidad === 1 ? '' : 's'}`
      : 'Ver el carrito';
  });

  constructor() {
    // Rebote del badge al agregar: se apaga y se prende en el siguiente frame para que la
    // animación se repita aunque se agregue varias veces seguidas.
    effect(() => {
      const cantidad = this.carrito.cantidadTotal();
      if (cantidad > this.cantidadPrevia) {
        this.contadorRebota.set(false);
        requestAnimationFrame(() => {
          this.contadorRebota.set(true);
          setTimeout(() => this.contadorRebota.set(false), 400);
        });
      }
      this.cantidadPrevia = cantidad;
    });

    // Angular ignora scroll-margin-top con routerLink + fragment: el offset evita que el ancla
    // quede bajo el encabezado pegajoso.
    inject(ViewportScroller).setOffset(() => [
      0,
      (this.encabezado()?.nativeElement.offsetHeight ?? 0) + 16,
    ]);

    this.router.events
      .pipe(
        filter((evento) => evento instanceof NavigationStart),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.cerrarCuenta());
  }

  protected alternarCuenta(): void {
    this.cuentaAbierta.update((abierta) => !abierta);
  }

  protected cerrarCuenta(): void {
    this.cuentaAbierta.set(false);
  }

  @HostListener('document:pointerdown', ['$event'])
  protected cerrarCuentaAlTocarFuera(evento: PointerEvent): void {
    if (!this.cuentaAbierta()) return;

    const contenedor = this.contenedorCuenta()?.nativeElement;
    if (contenedor && evento.target instanceof Node && contenedor.contains(evento.target)) return;

    this.cerrarCuenta();
  }

  @HostListener('document:keydown.escape')
  protected cerrarCuentaConEscape(): void {
    if (!this.cuentaAbierta()) return;

    this.cerrarCuenta();
    this.botonCuenta()?.nativeElement.focus();
  }

  protected cerrarSesion(): void {
    this.cerrarCuenta();
    this.auth.logout();
    this.carrito.vaciar();
    void this.router.navigateByUrl('/').then(() => this.botonCuenta()?.nativeElement.focus());
  }
}
