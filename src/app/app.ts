import { NgTemplateOutlet, ViewportScroller } from '@angular/common';
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
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from './application/auth.service';
import { AvisoService } from './application/aviso.service';
import { CarritoService } from './application/carrito.service';
import { TemaService } from './application/tema.service';
import { AvisoFlotante } from './shared/ui/aviso/aviso';
import { Icono } from './shared/ui/icono/icono';
import { etiquetaRol } from './shared/util/etiquetas';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgTemplateOutlet, Icono, AvisoFlotante],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly carrito = inject(CarritoService);
  protected readonly tema = inject(TemaService);
  private readonly avisos = inject(AvisoService);
  private readonly router = inject(Router);

  private readonly principal = viewChild<ElementRef<HTMLElement>>('principal');
  private readonly encabezado = viewChild<ElementRef<HTMLElement>>('encabezado');
  private readonly contenedorCuenta = viewChild<ElementRef<HTMLElement>>('contenedorCuenta');
  private readonly botonCuenta = viewChild<ElementRef<HTMLButtonElement>>('botonCuenta');
  private readonly contenedorMenu = viewChild<ElementRef<HTMLElement>>('contenedorMenu');
  private readonly botonMenu = viewChild<ElementRef<HTMLButtonElement>>('botonMenu');

  protected readonly cuentaAbierta = signal(false);
  /** Menú desplegable del móvil (navegación + tema + cuenta); en escritorio no se muestra. */
  protected readonly menuAbierto = signal(false);
  /** Hay una navegación en curso (p. ej. cargando el código de la página): barra de progreso. */
  protected readonly navegando = signal(false);
  protected readonly contadorRebota = signal(false);
  private cantidadPrevia = 0;

  /** Rol de la sesión en palabras del negocio ("Cliente", "Administrador"), no el valor crudo. */
  protected readonly rolLegible = computed(() => {
    const rol = this.auth.rol();
    return rol ? etiquetaRol(rol) : '';
  });

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
      .subscribe(() => {
        this.cerrarMenus();
        // El aviso de "agregado al carrito" no debe acompañar a la página siguiente (p. ej.
        // taparía el botón de continuar en /carrito).
        this.avisos.cerrar();
        this.navegando.set(true);
      });

    this.router.events
      .pipe(
        filter(
          (evento) =>
            evento instanceof NavigationEnd ||
            evento instanceof NavigationCancel ||
            evento instanceof NavigationError,
        ),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.navegando.set(false));
  }

  /**
   * Enlace "Saltar al contenido": mueve el foco al `<main>`. No usa `href="#…"`, que con
   * `<base href="/">` navegaría a la raíz.
   */
  protected saltarAlContenido(evento: Event): void {
    evento.preventDefault();
    this.principal()?.nativeElement.focus();
  }

  protected alternarCuenta(): void {
    this.cuentaAbierta.update((abierta) => !abierta);
  }

  protected cerrarCuenta(): void {
    this.cuentaAbierta.set(false);
  }

  protected alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }

  /** Cierra el panel de cuenta (escritorio) y el menú desplegable (móvil). */
  protected cerrarMenus(): void {
    this.cuentaAbierta.set(false);
    this.menuAbierto.set(false);
  }

  @HostListener('document:pointerdown', ['$event'])
  protected cerrarAlTocarFuera(evento: PointerEvent): void {
    if (!(evento.target instanceof Node)) return;

    if (this.cuentaAbierta() && !this.contenedorCuenta()?.nativeElement.contains(evento.target)) {
      this.cerrarCuenta();
    }
    if (this.menuAbierto() && !this.contenedorMenu()?.nativeElement.contains(evento.target)) {
      this.menuAbierto.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected cerrarConEscape(): void {
    if (this.cuentaAbierta()) {
      this.cerrarCuenta();
      this.botonCuenta()?.nativeElement.focus();
    }
    if (this.menuAbierto()) {
      this.menuAbierto.set(false);
      this.botonMenu()?.nativeElement.focus();
    }
  }

  /** Devuelve el foco al control de cuenta que se ve: el icono (escritorio) o el menú (móvil). */
  private enfocarControlDeCuenta(): void {
    const cuenta = this.botonCuenta()?.nativeElement;
    const control = cuenta && cuenta.offsetParent !== null ? cuenta : this.botonMenu()?.nativeElement;
    control?.focus();
  }

  protected cerrarSesion(): void {
    this.cerrarMenus();
    this.auth.logout();
    this.carrito.vaciar();
    void this.router.navigateByUrl('/').then(() => this.enfocarControlDeCuenta());
  }
}
