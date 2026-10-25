import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../application/auth.service';
import { AuthResponse } from '../../domain/auth/auth.model';
import { AuthRepository } from '../../domain/auth/auth.repository';
import { SesionPort } from '../../domain/auth/sesion.port';
import { AuthHttpRepository } from './auth-http.repository';
import { authInterceptor } from './auth.interceptor';
import { errorInterceptor } from './error.interceptor';
import { ngrokWarningInterceptor } from './ngrok-warning.interceptor';

function jwt(expMs: number): string {
  const b64url = (o: object) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64url({ alg: 'HS256' })}.${b64url({ sub: 'a@b.co', exp: Math.floor(expMs / 1000) })}.f`;
}

class SesionFalsa extends SesionPort {
  token: string | null = null;
  email: string | null = null;
  rol: string | null = null;
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
  alCambiarEnOtraPestana = () => () => undefined;
}

@Component({ template: '' })
class Vacio {}

describe('authInterceptor', () => {
  const api = environment.apiUrl;
  const HORA = 3_600_000;
  let sesion: SesionFalsa;
  let http: HttpClient;
  let ctrl: HttpTestingController;
  let router: Router;
  let navegar: ReturnType<typeof vi.spyOn>;

  function sesionActiva(token: string) {
    sesion.token = token;
    sesion.email = 'a@b.co';
    sesion.rol = 'CLIENTE';
  }

  beforeEach(() => {
    sesion = new SesionFalsa();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'login', component: Vacio },
          { path: '**', component: Vacio },
        ]),
        // Mismo orden que app.config.ts: valida que no hay dependencia circular (NG0200).
        provideHttpClient(
          withInterceptors([authInterceptor, ngrokWarningInterceptor, errorInterceptor]),
        ),
        provideHttpClientTesting(),
        { provide: SesionPort, useValue: sesion },
        { provide: AuthRepository, useClass: AuthHttpRepository },
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => ctrl.verify());

  it('pone el Bearer a las peticiones a la API', () => {
    sesionActiva(jwt(Date.now() + HORA));
    http.get(`${api}/pedidos`).subscribe();
    const req = ctrl.expectOne(`${api}/pedidos`);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${sesion.token}`);
    req.flush([]);
  });

  it('no pone el Bearer ni la cabecera de ngrok a otro host', () => {
    sesionActiva(jwt(Date.now() + HORA));
    for (const url of [
      'https://otro-host.com/api/menu',
      `${api}.evil.com/menu`,
      'https://papaya-unpeeled-hydrated.ngrok-free.dev.evil.com/api/menu',
    ]) {
      http.get(url).subscribe();
      const req = ctrl.expectOne(url);
      expect(req.request.headers.has('Authorization')).toBe(false);
      expect(req.request.headers.has('ngrok-skip-browser-warning')).toBe(false);
      req.flush({});
    }
  });

  it('la cabecera de ngrok sí va a la API', () => {
    http.get(`${api}/menu`).subscribe();
    const req = ctrl.expectOne(`${api}/menu`);
    expect(req.request.headers.get('ngrok-skip-browser-warning')).toBe('true');
    req.flush([]);
  });

  it('no sobrescribe un Authorization explícito', () => {
    sesionActiva(jwt(Date.now() + HORA));
    http
      .post(`${api}/auth/logout`, null, { headers: { Authorization: 'Bearer viejo' } })
      .subscribe();
    const req = ctrl.expectOne(`${api}/auth/logout`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer viejo');
    req.flush(null);
  });

  it('el logout del repositorio envía el Bearer del token capturado', () => {
    TestBed.inject(AuthRepository).logout('tok-capturado').subscribe();
    const req = ctrl.expectOne(`${api}/auth/logout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Authorization')).toBe('Bearer tok-capturado');
    req.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('con token vencido: cierra la sesión local y envía la petición sin token', () => {
    sesionActiva(jwt(Date.now() - HORA));
    http.get(`${api}/menu`).subscribe();
    const req = ctrl.expectOne(`${api}/menu`);
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(sesion.token).toBeNull();
    expect(TestBed.inject(AuthService).logueado()).toBe(false);
    req.flush([]);
  });

  it('401 en una petición con token: cierra la sesión, navega al login y propaga el error', () => {
    sesionActiva(jwt(Date.now() + HORA));
    let status: number | undefined;
    http.get(`${api}/pedidos`).subscribe({ error: (e) => (status = e.status) });
    ctrl.expectOne(`${api}/pedidos`).flush({ message: 'x' }, { status: 401, statusText: 'No' });

    expect(status).toBe(401);
    expect(sesion.token).toBeNull();
    expect(TestBed.inject(AuthService).logueado()).toBe(false);
    expect(navegar).toHaveBeenCalledWith(['/login'], { queryParams: { sesion: 'expirada' } });
  });

  it.each(['/auth/login', '/auth/registro', '/auth/password', '/auth/logout'])(
    'un 401 en %s no cierra la sesión',
    (ruta) => {
      sesionActiva(jwt(Date.now() + HORA));
      http.post(`${api}${ruta}`, {}).subscribe({ error: () => undefined });
      ctrl.expectOne(`${api}${ruta}`).flush({}, { status: 401, statusText: 'No' });
      expect(sesion.token).not.toBeNull();
      expect(navegar).not.toHaveBeenCalled();
    },
  );

  it('un 403 no cierra la sesión', () => {
    sesionActiva(jwt(Date.now() + HORA));
    http.get(`${api}/a`).subscribe({ error: () => undefined });
    ctrl.expectOne(`${api}/a`).flush({}, { status: 403, statusText: 'No' });
    expect(sesion.token).not.toBeNull();
    expect(navegar).not.toHaveBeenCalled();
  });

  it('varios 401 simultáneos navegan una sola vez', () => {
    sesionActiva(jwt(Date.now() + HORA));
    http.get(`${api}/a`).subscribe({ error: () => undefined });
    http.get(`${api}/b`).subscribe({ error: () => undefined });
    ctrl.expectOne(`${api}/a`).flush({}, { status: 401, statusText: 'No' });
    ctrl.expectOne(`${api}/b`).flush({}, { status: 401, statusText: 'No' });
    expect(navegar).toHaveBeenCalledTimes(1);
  });

  it('un 401 que llega con una sesión distinta (nuevo login) no la cierra', () => {
    sesionActiva(jwt(Date.now() + HORA));
    http.get(`${api}/a`).subscribe({ error: () => undefined });
    const req = ctrl.expectOne(`${api}/a`);
    sesionActiva(jwt(Date.now() + 2 * HORA)); // el usuario volvió a entrar mientras tanto
    req.flush({}, { status: 401, statusText: 'No' });
    expect(sesion.token).not.toBeNull();
    expect(navegar).not.toHaveBeenCalled();
  });

  it('no navega si ya está en el login', () => {
    sesionActiva(jwt(Date.now() + HORA));
    vi.spyOn(router, 'url', 'get').mockReturnValue('/login?sesion=expirada');
    http.get(`${api}/a`).subscribe({ error: () => undefined });
    ctrl.expectOne(`${api}/a`).flush({}, { status: 401, statusText: 'No' });
    expect(sesion.token).toBeNull();
    expect(navegar).not.toHaveBeenCalled();
  });
});
