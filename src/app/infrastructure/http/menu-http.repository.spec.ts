import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { MenuHttpRepository } from './menu-http.repository';

describe('MenuHttpRepository (caché con TTL)', () => {
  let repo: MenuHttpRepository;
  let http: HttpTestingController;
  const urlMenu = `${environment.apiUrl}/menu`;
  const urlSucursales = `${environment.apiUrl}/sucursales`;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [MenuHttpRepository, provideHttpClient(), provideHttpClientTesting()],
    });
    repo = TestBed.inject(MenuHttpRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('reusa el menú cacheado dentro del TTL sin otra petición', () => {
    repo.obtenerMenu().subscribe();
    http.expectOne(urlMenu).flush([]);

    vi.advanceTimersByTime(MenuHttpRepository.TTL_MS - 1);
    repo.obtenerMenu().subscribe();
    http.expectNone(urlMenu);
  });

  it('vuelve a pedir el menú cuando pasa el TTL', () => {
    repo.obtenerMenu().subscribe();
    http.expectOne(urlMenu).flush([]);

    vi.advanceTimersByTime(MenuHttpRepository.TTL_MS);
    repo.obtenerMenu().subscribe();
    http.expectOne(urlMenu).flush([]);
  });

  it('vuelve a pedir las sucursales cuando pasa el TTL', () => {
    repo.obtenerSucursales().subscribe();
    http.expectOne(urlSucursales).flush([]);

    vi.advanceTimersByTime(MenuHttpRepository.TTL_MS - 1);
    repo.obtenerSucursales().subscribe();
    http.expectNone(urlSucursales);

    vi.advanceTimersByTime(1);
    repo.obtenerSucursales().subscribe();
    http.expectOne(urlSucursales).flush([]);
  });

  it('invalidarMenu fuerza una petición nueva aunque el caché esté vigente', () => {
    repo.obtenerMenu().subscribe();
    http.expectOne(urlMenu).flush([]);

    repo.invalidarMenu();
    repo.obtenerMenu().subscribe();
    http.expectOne(urlMenu).flush([]);
  });

  it('descarta el caché si la petición falla para permitir reintento', () => {
    repo.obtenerMenu().subscribe({ error: () => undefined });
    http.expectOne(urlMenu).flush('error', { status: 500, statusText: 'Error' });

    repo.obtenerMenu().subscribe();
    http.expectOne(urlMenu).flush([]);
  });
});
