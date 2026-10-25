import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse, LoginRequest, RegistroRequest } from '../domain/auth/auth.model';
import { AuthRepository } from '../domain/auth/auth.repository';
import { MARGEN_EXPIRACION_MS, leerExpiracionMs, tokenVencido } from '../domain/auth/jwt';
import { SesionPort } from '../domain/auth/sesion.port';

/** Rutas que exigen sesión: si otra pestaña cierra la sesión, esta sale de ellas. */
const PREFIJOS_PROTEGIDOS = ['/mis-pedidos', '/perfil', '/checkout', '/interno'];

/** `setTimeout` desborda con más de 2^31-1 ms (~24,8 días): se acota y se re-evalúa. */
const MAX_TIMER_MS = 2_147_483_647;

/**
 * Sesión del usuario: login/registro/logout contra el backend (vía AuthRepository) y
 * persistencia del JWT (vía SesionPort). El estado (email/rol) se expone
 * como signals para que la UI reaccione sola. También cierra la sesión local cuando el
 * token vence (al iniciar, por temporizador, o por un 401 detectado en el interceptor)
 * y se mantiene sincronizada con las demás pestañas.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authRepo = inject(AuthRepository);
  private readonly sesion = inject(SesionPort);
  private readonly router = inject(Router);

  private readonly emailSignal = signal<string | null>(this.sesion.obtenerEmail());
  private readonly rolSignal = signal<string | null>(this.sesion.obtenerRol());
  private temporizador: ReturnType<typeof setTimeout> | null = null;

  readonly email = this.emailSignal.asReadonly();
  readonly rol = this.rolSignal.asReadonly();
  readonly logueado = computed(() => this.emailSignal() !== null);
  readonly esCliente = computed(() => this.rolSignal() === 'CLIENTE');
  readonly esPersonal = computed(() =>
    ['BARISTA', 'CAJERO', 'SUPERVISOR', 'ADMIN'].includes(this.rolSignal() ?? ''));
  readonly esAdmin = computed(() => this.rolSignal() === 'ADMIN');

  constructor() {
    // Token guardado ya vencido (o corrupto): se descarta sin llamar a la API.
    this.revisarSesionGuardada();

    const dejarDeEscuchar = this.sesion.alCambiarEnOtraPestana(() => this.sincronizarConAlmacen());
    inject(DestroyRef).onDestroy(() => {
      dejarDeEscuchar();
      this.cancelarTemporizador();
    });
  }

  get token(): string | null {
    return this.sesion.obtenerToken();
  }

  registrar(datos: RegistroRequest): Observable<AuthResponse> {
    return this.authRepo.registrar(datos).pipe(tap(res => this.guardarSesion(res)));
  }

  login(datos: LoginRequest): Observable<AuthResponse> {
    return this.authRepo.login(datos).pipe(tap(res => this.guardarSesion(res)));
  }

  /**
   * Cierra la sesión: la UI y el almacenamiento local se limpian al instante y la
   * revocación del token en el servidor va en segundo plano (si falla —red caída,
   * 401— no importa: la sesión local ya está cerrada y no se muestra ningún error).
   */
  logout(): void {
    const token = this.sesion.obtenerToken();
    this.limpiarLocal();
    if (token) {
      this.authRepo.logout(token).subscribe({ error: () => undefined });
    }
  }

  /**
   * La sesión dejó de ser válida (token vencido o rechazado con 401): se cierra solo
   * la sesión local y se lleva al usuario al login con el aviso `?sesion=expirada`.
   * Sin sesión activa no hace nada, así varias llamadas seguidas navegan una sola vez.
   */
  expirarSesion(): void {
    if (!this.sesion.obtenerToken() && !this.logueado()) {
      return;
    }
    this.limpiarLocal();
    if (!this.router.url.startsWith('/login')) {
      void this.router.navigate(['/login'], { queryParams: { sesion: 'expirada' } });
    }
  }

  private guardarSesion(res: AuthResponse): void {
    this.sesion.guardar(res);
    this.emailSignal.set(res.email);
    this.rolSignal.set(res.rol);
    this.programarExpiracion();
  }

  private limpiarLocal(): void {
    this.cancelarTemporizador();
    this.sesion.limpiar();
    this.emailSignal.set(null);
    this.rolSignal.set(null);
  }

  private revisarSesionGuardada(): void {
    const token = this.sesion.obtenerToken();
    if (!token) {
      // Email/rol sueltos sin token: estado incoherente, se descarta.
      if (this.emailSignal() !== null || this.rolSignal() !== null) {
        this.limpiarLocal();
      }
      return;
    }
    if (tokenVencido(token)) {
      this.limpiarLocal();
      return;
    }
    this.programarExpiracion();
  }

  /** Cierra la sesión local al llegar a `exp` (menos el margen). */
  private programarExpiracion(): void {
    this.cancelarTemporizador();
    const token = this.sesion.obtenerToken();
    const expMs = token ? leerExpiracionMs(token) : null;
    if (expMs === null) {
      return;
    }
    const restante = expMs - MARGEN_EXPIRACION_MS - Date.now();
    if (restante <= 0) {
      this.expirarSesion();
      return;
    }
    // Si faltaba más que el tope del timer, al despertar se vuelve a evaluar.
    this.temporizador = setTimeout(
      () => this.programarExpiracion(),
      Math.min(restante, MAX_TIMER_MS),
    );
  }

  private cancelarTemporizador(): void {
    if (this.temporizador !== null) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
  }

  /** Otra pestaña inició o cerró sesión: este estado en memoria se alinea con el almacenamiento. */
  private sincronizarConAlmacen(): void {
    const habiaSesion = this.emailSignal() !== null;
    const token = this.sesion.obtenerToken();
    if (!token) {
      this.cancelarTemporizador();
      this.emailSignal.set(null);
      this.rolSignal.set(null);
      if (habiaSesion && PREFIJOS_PROTEGIDOS.some(p => this.router.url.startsWith(p))) {
        void this.router.navigateByUrl('/');
      }
      return;
    }
    this.emailSignal.set(this.sesion.obtenerEmail());
    this.rolSignal.set(this.sesion.obtenerRol());
    this.programarExpiracion();
  }
}
