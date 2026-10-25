import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { AuthResponse, LoginRequest, RegistroRequest } from '../domain/auth/auth.model';
import { AuthRepository } from '../domain/auth/auth.repository';
import { SesionPort } from '../domain/auth/sesion.port';
import { AuthService } from './auth.service';

function jwt(expMs: number): string {
  const b64url = (o: object) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64url({ alg: 'HS256' })}.${b64url({ exp: Math.floor(expMs / 1000) })}.f`;
}

class SesionFalsa extends SesionPort {
  token: string | null = null;
  email: string | null = null;
  rol: string | null = null;
  oyentes: Array<() => void> = [];
  obtenerToken = () => this.token;
  obtenerEmail = () => this.email;
  obtenerRol = () => this.rol;
  guardar(d: AuthResponse) {
    this.token = d.token;
    this.email = d.email;
    this.rol = d.rol;
  }
  limpiar() {
    this.token = this.email = this.rol = null;
  }
  alCambiarEnOtraPestana(cb: () => void) {
    this.oyentes.push(cb);
    return () => (this.oyentes = this.oyentes.filter((o) => o !== cb));
  }
  /** Simula el evento `storage` de otra pestaña. */
  otraPestanaCambio() {
    this.oyentes.forEach((o) => o());
  }
}

class RepoFalso extends AuthRepository {
  logoutRes$: Observable<void> = of(undefined);
  tokensRevocados: string[] = [];
  respuestaLogin!: AuthResponse;
  registrar(_: RegistroRequest) {
    return of(this.respuestaLogin);
  }
  login(_: LoginRequest) {
    return of(this.respuestaLogin);
  }
  logout(token: string) {
    this.tokensRevocados.push(token);
    return this.logoutRes$;
  }
}

describe('AuthService', () => {
  const HORA = 3_600_000;
  let sesion: SesionFalsa;
  let repo: RepoFalso;

  const crear = () => TestBed.inject(AuthService);
  let tokenVigente: string;

  beforeEach(() => {
    vi.useFakeTimers();
    tokenVigente = jwt(Date.now() + HORA);
    sesion = new SesionFalsa();
    repo = new RepoFalso();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SesionPort, useValue: sesion },
        { provide: AuthRepository, useValue: repo },
      ],
    });
  });

  afterEach(() => vi.useRealTimers());

  describe('logout', () => {
    it('limpia la sesión local y revoca el token en el servidor', () => {
      sesion.guardar({ token: tokenVigente, email: 'a@b.co', rol: 'CLIENTE' });
      const auth = crear();
      expect(auth.logueado()).toBe(true);

      auth.logout();

      expect(sesion.token).toBeNull();
      expect(auth.logueado()).toBe(false);
      expect(auth.rol()).toBeNull();
      expect(repo.tokensRevocados).toEqual([tokenVigente]);
    });

    it('sin token no llama a la API', () => {
      const auth = crear();
      auth.logout();
      expect(repo.tokensRevocados).toEqual([]);
    });

    it('si la revocación falla (red caída, 401) la sesión local queda cerrada y no hay error', () => {
      sesion.guardar({ token: tokenVigente, email: 'a@b.co', rol: 'CLIENTE' });
      repo.logoutRes$ = throwError(() => ({ status: 0 }));
      const auth = crear();
      expect(() => auth.logout()).not.toThrow();
      expect(sesion.token).toBeNull();
      expect(auth.logueado()).toBe(false);
    });
  });

  describe('expiración', () => {
    it('al iniciar con un token vencido limpia la sesión sin llamar a la API', () => {
      sesion.guardar({ token: jwt(Date.now() - HORA), email: 'a@b.co', rol: 'CLIENTE' });
      const auth = crear();
      expect(auth.logueado()).toBe(false);
      expect(sesion.token).toBeNull();
      expect(repo.tokensRevocados).toEqual([]);
    });

    it('al iniciar con un token malformado limpia la sesión', () => {
      sesion.guardar({ token: 'basura', email: 'a@b.co', rol: 'CLIENTE' });
      const auth = crear();
      expect(auth.logueado()).toBe(false);
      expect(sesion.email).toBeNull();
    });

    it('al iniciar con un token vigente conserva la sesión', () => {
      sesion.guardar({ token: jwt(Date.now() + HORA), email: 'a@b.co', rol: 'CLIENTE' });
      const auth = crear();
      expect(auth.logueado()).toBe(true);
      expect(auth.rol()).toBe('CLIENTE');
    });

    it('cierra la sesión local al llegar al exp y lleva al login', () => {
      const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      sesion.guardar({ token: jwt(Date.now() + HORA), email: 'a@b.co', rol: 'CLIENTE' });
      const auth = crear();

      vi.advanceTimersByTime(HORA - 60_000);
      expect(auth.logueado()).toBe(true);

      vi.advanceTimersByTime(60_000);
      expect(auth.logueado()).toBe(false);
      expect(sesion.token).toBeNull();
      expect(navegar).toHaveBeenCalledWith(['/login'], { queryParams: { sesion: 'expirada' } });
    });

    it('el login programa el temporizador y el logout lo cancela', () => {
      const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      repo.respuestaLogin = { token: jwt(Date.now() + HORA), email: 'a@b.co', rol: 'CLIENTE' };
      const auth = crear();
      auth.login({ email: 'a@b.co', password: 'x' }).subscribe();
      expect(auth.logueado()).toBe(true);

      auth.logout();
      vi.advanceTimersByTime(2 * HORA);
      expect(navegar).not.toHaveBeenCalled();
    });

    it('un exp muy lejano (más de 2^31-1 ms) no dispara el cierre antes de tiempo', () => {
      const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
      const DIAS_40 = 40 * 24 * HORA;
      sesion.guardar({ token: jwt(Date.now() + DIAS_40), email: 'a@b.co', rol: 'CLIENTE' });
      const auth = crear();

      vi.advanceTimersByTime(30 * 24 * HORA);
      expect(auth.logueado()).toBe(true);
      expect(navegar).not.toHaveBeenCalled();

      vi.advanceTimersByTime(10 * 24 * HORA);
      expect(auth.logueado()).toBe(false);
    });
  });

  describe('sincronización entre pestañas', () => {
    it('si otra pestaña cierra sesión, esta limpia su estado', () => {
      sesion.guardar({ token: jwt(Date.now() + HORA), email: 'a@b.co', rol: 'CLIENTE' });
      const auth = crear();
      expect(auth.logueado()).toBe(true);

      sesion.limpiar(); // lo que hizo la otra pestaña en localStorage
      sesion.otraPestanaCambio();

      expect(auth.logueado()).toBe(false);
      expect(auth.rol()).toBeNull();
    });

    it('si otra pestaña inicia sesión, esta adopta el nuevo usuario', () => {
      const auth = crear();
      expect(auth.logueado()).toBe(false);

      sesion.guardar({ token: jwt(Date.now() + HORA), email: 'nuevo@b.co', rol: 'ADMIN' });
      sesion.otraPestanaCambio();

      expect(auth.email()).toBe('nuevo@b.co');
      expect(auth.esAdmin()).toBe(true);
    });
  });
});
