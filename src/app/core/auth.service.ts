import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_URL } from './api';
import { AuthResponse, LoginRequest, RegistroRequest } from './models';

const TOKEN_KEY = 'cafeteria_token';
const EMAIL_KEY = 'cafeteria_email';
const ROL_KEY = 'cafeteria_rol';

/**
 * Sesión del usuario: login/registro contra el backend y
 * almacenamiento del JWT en localStorage. El estado (email/rol)
 * se expone como signals para que la UI reaccione sola.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  private readonly emailSignal = signal<string | null>(localStorage.getItem(EMAIL_KEY));
  private readonly rolSignal = signal<string | null>(localStorage.getItem(ROL_KEY));

  readonly email = this.emailSignal.asReadonly();
  readonly rol = this.rolSignal.asReadonly();
  readonly logueado = computed(() => this.emailSignal() !== null);
  readonly esCliente = computed(() => this.rolSignal() === 'CLIENTE');
  readonly esPersonal = computed(() =>
    ['BARISTA', 'CAJERO', 'SUPERVISOR', 'ADMIN'].includes(this.rolSignal() ?? ''));
  readonly esAdmin = computed(() => this.rolSignal() === 'ADMIN');

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  registrar(datos: RegistroRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/auth/registro`, datos)
      .pipe(tap(res => this.guardarSesion(res)));
  }

  login(datos: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API_URL}/auth/login`, datos)
      .pipe(tap(res => this.guardarSesion(res)));
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(ROL_KEY);
    this.emailSignal.set(null);
    this.rolSignal.set(null);
  }

  private guardarSesion(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(EMAIL_KEY, res.email);
    localStorage.setItem(ROL_KEY, res.rol);
    this.emailSignal.set(res.email);
    this.rolSignal.set(res.rol);
  }
}
