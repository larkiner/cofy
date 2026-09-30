import { TestBed } from '@angular/core/testing';
import { AvisoService } from './aviso.service';

describe('AvisoService', () => {
  let servicio: AvisoService;

  beforeEach(() => {
    vi.useFakeTimers();
    servicio = TestBed.inject(AvisoService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('avisa del producto agregado con el conteo en singular y plural', () => {
    servicio.avisarProductoAgregado('Latte', 1);
    expect(servicio.aviso()?.titulo).toBe('Latte agregado al carrito');
    expect(servicio.aviso()?.detalle).toBe('Llevas 1 producto en el carrito.');
    expect(servicio.aviso()?.accion?.ruta).toBe('/carrito');

    servicio.avisarProductoAgregado('Latte', 3);
    expect(servicio.aviso()?.detalle).toBe('Llevas 3 productos en el carrito.');
  });

  it('se cierra solo tras la duración, pero no antes', () => {
    servicio.avisarProductoAgregado('Latte', 1);
    vi.advanceTimersByTime(AvisoService.DURACION_MS - 1);
    expect(servicio.aviso()).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(servicio.aviso()).toBeNull();
  });

  it('pausar evita el cierre y reanudar lo programa con la duración completa', () => {
    servicio.avisarProductoAgregado('Latte', 1);
    servicio.pausar();
    vi.advanceTimersByTime(AvisoService.DURACION_MS * 3);
    expect(servicio.aviso()).not.toBeNull();

    servicio.reanudar();
    vi.advanceTimersByTime(AvisoService.DURACION_MS - 1);
    expect(servicio.aviso()).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(servicio.aviso()).toBeNull();
  });

  it('un segundo aviso reemplaza al primero con otro id y reinicia el tiempo', () => {
    servicio.avisarProductoAgregado('Latte', 1);
    const primero = servicio.aviso()!;
    vi.advanceTimersByTime(AvisoService.DURACION_MS - 100);

    servicio.avisarProductoAgregado('Americano', 2);
    expect(servicio.aviso()!.id).not.toBe(primero.id);
    expect(servicio.aviso()?.titulo).toBe('Americano agregado al carrito');

    vi.advanceTimersByTime(AvisoService.DURACION_MS - 1);
    expect(servicio.aviso()).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(servicio.aviso()).toBeNull();
  });

  it('cerrar lo quita de inmediato', () => {
    servicio.avisarProductoAgregado('Latte', 1);
    servicio.cerrar();
    expect(servicio.aviso()).toBeNull();
  });
});
