import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthResponse, LoginRequest, RegistroRequest } from '../domain/auth/auth.model';
import { AuthRepository } from '../domain/auth/auth.repository';
import { SesionPort } from '../domain/auth/sesion.port';

/**
 * Sesión del usuario: login/registro contra el backend (vía AuthRepository) y
 * persistencia del JWT (vía SesionPort). El estado (email/rol) se expone
 * como signals para que la UI reaccione sola.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authRepo = inject(AuthRepository);
  private readonly sesion = inject(SesionPort);

  private readonly emailSignal = signal<string | null>(this.sesion.obtenerEmail());
  private readonly rolSignal = signal<string | null>(this.sesion.obtenerRol());

  readonly email = this.emailSignal.asReadonly();
  readonly rol = this.rolSignal.asReadonly();
  readonly logueado = computed(() => this.emailSignal() !== null);
  readonly esCliente = computed(() => this.rolSignal() === 'CLIENTE');
  readonly esPersonal = computed(() =>
    ['BARISTA', 'CAJERO', 'SUPERVISOR', 'ADMIN'].includes(this.rolSignal() ?? ''));
  readonly esAdmin = computed(() => this.rolSignal() === 'ADMIN');

  get token(): string | null {
    return this.sesion.obtenerToken();
  }

  registrar(datos: RegistroRequest): Observable<AuthResponse> {
    return this.authRepo.registrar(datos).pipe(tap(res => this.guardarSesion(res)));
  }

  login(datos: LoginRequest): Observable<AuthResponse> {
    return this.authRepo.login(datos).pipe(tap(res => this.guardarSesion(res)));
  }

  logout(): void {
    this.sesion.limpiar();
    this.emailSignal.set(null);
    this.rolSignal.set(null);
  }

  private guardarSesion(res: AuthResponse): void {
    this.sesion.guardar(res);
    this.emailSignal.set(res.email);
    this.rolSignal.set(res.rol);
  }
}
