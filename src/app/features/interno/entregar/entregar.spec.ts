import { TestBed } from '@angular/core/testing';
import { ComponentFixture } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { InternoService } from '../../../application/interno.service';
import { PedidoEmpleado } from '../../../domain/interno/interno.model';
import { Entregar } from './entregar';

function pedido(parcial: Partial<PedidoEmpleado> = {}): PedidoEmpleado {
  return {
    pedidoId: 12,
    codigoRetiro: 'RET-1A2B3C4D',
    fechaPedido: new Date().toISOString(),
    fechaEntrega: null,
    estado: 'LISTO',
    total: 14000,
    sucursalId: 1,
    trabajadorId: null,
    clienteId: 3,
    clienteNombre: 'Ana',
    clienteTelefono: '3001234567',
    items: [{ producto: 'Cappuccino', cantidad: 2 }],
    ...parcial,
  };
}

describe('Entregar', () => {
  let tablero = vi.fn();
  let entregar = vi.fn();

  function crear(): ComponentFixture<Entregar> {
    TestBed.configureTestingModule({
      providers: [{ provide: InternoService, useValue: { tablero, entregar } }],
    });
    const fixture = TestBed.createComponent(Entregar);
    fixture.detectChanges();
    return fixture;
  }

  const el = (f: ComponentFixture<Entregar>) => f.nativeElement as HTMLElement;

  async function buscar(fixture: ComponentFixture<Entregar>, codigo: string) {
    fixture.componentInstance['codigo'] = codigo;
    fixture.componentInstance['buscar']();
    fixture.detectChanges();
  }

  const confirmar = (f: ComponentFixture<Entregar>) =>
    Array.from(el(f).querySelectorAll<HTMLButtonElement>('.acciones-confirmacion .boton')).find(
      (b) => b.textContent?.includes('Confirmar entrega'),
    )!;
  const cancelar = (f: ComponentFixture<Entregar>) =>
    Array.from(el(f).querySelectorAll<HTMLButtonElement>('.acciones-confirmacion .boton')).find(
      (b) => b.textContent?.includes('Cancelar'),
    )!;

  beforeEach(() => {
    vi.useFakeTimers();
    tablero = vi.fn(() => of([pedido()]));
    entregar = vi.fn(() => of({ id: 12 }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('carga al entrar y lista los pedidos listos con sus ítems', () => {
    tablero.mockReturnValue(of([pedido(), pedido({ pedidoId: 13, estado: 'PAGADO' })]));
    const fixture = crear();

    expect(tablero).toHaveBeenCalledWith(null, null);
    const tarjetas = el(fixture).querySelectorAll('.tarjeta-listo');
    expect(tarjetas.length).toBe(1);
    expect(tarjetas[0].textContent).toContain('#12');
    expect(tarjetas[0].textContent?.replace(/\s+/g, ' ')).toContain('2× Cappuccino');
  });

  it('refresca la lista en silencio cada INTERVALO_MS', () => {
    crear();
    expect(tablero).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(Entregar.INTERVALO_MS);
    expect(tablero).toHaveBeenCalledTimes(2);
  });

  it('tocar una tarjeta de la lista abre la confirmación', () => {
    const fixture = crear();
    el(fixture).querySelector<HTMLButtonElement>('.tarjeta-listo')!.click();
    fixture.detectChanges();

    expect(el(fixture).querySelector('.confirmacion')?.textContent).toContain('Pedido #12');
    expect(el(fixture).querySelector('.confirmacion')?.textContent).toContain('3001234567');
  });

  it('busca por código con el prefijo RET-, sin él, con espacios y en minúsculas', async () => {
    for (const codigo of ['RET-1A2B3C4D', '1a2b3c4d', ' ret-1a2b 3c4d ']) {
      TestBed.resetTestingModule();
      const fixture = crear();
      await buscar(fixture, codigo);
      expect(el(fixture).querySelector('.confirmacion')).not.toBeNull();
      // Estaba entre los pedidos cargados: no hace falta volver a pedir la lista.
      expect(tablero).toHaveBeenCalledTimes(1);
      tablero.mockClear();
    }
  });

  it('si no está cargado vuelve a pedir la lista una vez y luego avisa', async () => {
    const fixture = crear();
    await buscar(fixture, 'RET-NOEXISTE');

    expect(tablero).toHaveBeenCalledTimes(2);
    expect(el(fixture).querySelector('.confirmacion')).toBeNull();
    expect(el(fixture).querySelector('[role="alert"]')?.textContent).toContain(
      'No hay un pedido activo con ese código en esta sede.',
    );
  });

  it('encuentra un pedido que aparece al volver a pedir la lista', async () => {
    tablero.mockReturnValueOnce(of([]));
    const fixture = crear();
    tablero.mockReturnValue(of([pedido()]));
    await buscar(fixture, 'RET-1A2B3C4D');

    expect(el(fixture).querySelector('.confirmacion')).not.toBeNull();
  });

  it('avisa si el pedido todavía no está listo', async () => {
    tablero.mockReturnValue(of([pedido({ estado: 'EN_PREPARACION' })]));
    const fixture = crear();
    await buscar(fixture, 'RET-1A2B3C4D');

    expect(el(fixture).querySelector('.aviso-no-listo')?.textContent).toContain(
      'Este pedido todavía no está marcado como listo',
    );
  });

  it('confirmar llama a entregar una sola vez, anuncia el éxito y quita el pedido de la lista', async () => {
    const fixture = crear();
    await buscar(fixture, 'RET-1A2B3C4D');

    confirmar(fixture).click();
    fixture.detectChanges();
    confirmar(fixture)?.click();

    expect(entregar).toHaveBeenCalledTimes(1);
    expect(entregar).toHaveBeenCalledWith('RET-1A2B3C4D');
    expect(el(fixture).querySelector('[role="status"]')?.textContent).toContain(
      'Pedido #12 entregado a Ana',
    );
    expect(el(fixture).querySelector('.tarjeta-listo')).toBeNull();
    expect(fixture.componentInstance['codigo']).toBe('');
  });

  it('cancelar no llama a entregar y vuelve a la búsqueda', async () => {
    const fixture = crear();
    await buscar(fixture, 'RET-1A2B3C4D');

    cancelar(fixture).click();
    fixture.detectChanges();

    expect(entregar).not.toHaveBeenCalled();
    expect(el(fixture).querySelector('.confirmacion')).toBeNull();
    expect(el(fixture).querySelector('input[name="codigo"]')).not.toBeNull();
  });

  it('un 404 al entregar muestra el mensaje de código no válido', async () => {
    entregar.mockReturnValue(throwError(() => ({ status: 404 })));
    const fixture = crear();
    await buscar(fixture, 'RET-1A2B3C4D');

    confirmar(fixture).click();
    fixture.detectChanges();

    expect(el(fixture).querySelector('[role="alert"]')?.textContent).toContain(
      'Código de retiro no válido.',
    );
  });

  it('un 409 al entregar muestra que no se puede entregar', async () => {
    entregar.mockReturnValue(throwError(() => ({ status: 409 })));
    const fixture = crear();
    await buscar(fixture, 'RET-1A2B3C4D');

    confirmar(fixture).click();
    fixture.detectChanges();

    expect(el(fixture).querySelector('[role="alert"]')?.textContent).toContain(
      'El pedido no se puede entregar',
    );
  });
});
