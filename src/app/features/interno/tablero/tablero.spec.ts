import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { InternoService } from '../../../application/interno.service';
import { Tablero } from './tablero';

describe('Tablero (refresco automático)', () => {
  let tablero = vi.fn();

  function crear() {
    TestBed.configureTestingModule({
      providers: [{ provide: InternoService, useValue: { tablero, cambiarEstado: vi.fn() } }],
    });
    return TestBed.createComponent(Tablero);
  }

  beforeEach(() => {
    vi.useFakeTimers();
    tablero = vi.fn(() => of([]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('carga al iniciar y vuelve a pedir el tablero cada INTERVALO_MS', () => {
    const fixture = crear();
    fixture.detectChanges();
    expect(tablero).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(Tablero.INTERVALO_MS - 1);
    expect(tablero).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(tablero).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(Tablero.INTERVALO_MS);
    expect(tablero).toHaveBeenCalledTimes(3);
  });

  it('no pide nada mientras la pestaña está oculta', () => {
    const fixture = crear();
    fixture.detectChanges();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);

    vi.advanceTimersByTime(Tablero.INTERVALO_MS * 3);
    expect(tablero).toHaveBeenCalledTimes(1);
  });

  it('si un refresco falla conserva los datos y no muestra error', () => {
    const fixture = crear();
    fixture.detectChanges();
    tablero.mockReturnValue(throwError(() => new Error('sin red')));

    vi.advanceTimersByTime(Tablero.INTERVALO_MS);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('No se pudo cargar el tablero');
  });

  it('deja de refrescar al destruir el componente', () => {
    const fixture = crear();
    fixture.detectChanges();
    fixture.destroy();

    vi.advanceTimersByTime(Tablero.INTERVALO_MS * 3);
    expect(tablero).toHaveBeenCalledTimes(1);
  });
});
