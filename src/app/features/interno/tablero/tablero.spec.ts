import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { AuthService } from '../../../application/auth.service';
import { InternoService } from '../../../application/interno.service';
import { MenuService } from '../../../application/menu.service';
import { PedidoEmpleado } from '../../../domain/interno/interno.model';
import { Tablero } from './tablero';

function pedido(parcial: Partial<PedidoEmpleado> = {}): PedidoEmpleado {
  return {
    pedidoId: 12,
    codigoRetiro: 'RET-1A2B3C4D',
    fechaPedido: new Date().toISOString(),
    fechaEntrega: null,
    estado: 'PAGADO',
    total: 14000,
    sucursalId: 1,
    trabajadorId: null,
    clienteId: 3,
    clienteNombre: 'Ana',
    clienteTelefono: null,
    ...parcial,
  };
}

describe('Tablero', () => {
  let tablero = vi.fn();
  let cambiarEstado = vi.fn();
  let obtenerSucursales = vi.fn();
  const rol = signal<string | null>('BARISTA');

  function crear(): ComponentFixture<Tablero> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: InternoService, useValue: { tablero, cambiarEstado } },
        { provide: MenuService, useValue: { obtenerSucursales } },
        { provide: AuthService, useValue: { rol } },
      ],
    });
    return TestBed.createComponent(Tablero);
  }

  const texto = (fixture: ComponentFixture<Tablero>) =>
    (fixture.nativeElement as HTMLElement).textContent ?? '';
  const boton = (fixture: ComponentFixture<Tablero>) =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.pedido .boton')!;

  beforeEach(() => {
    vi.useFakeTimers();
    rol.set('BARISTA');
    tablero = vi.fn(() => of([]));
    cambiarEstado = vi.fn(() => of({}));
    obtenerSucursales = vi.fn(() =>
      of([
        { id: 1, nombre: 'Centro', direccion: '', telefono: null },
        { id: 2, nombre: 'Poblado', direccion: '', telefono: null },
      ]),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('refresco automático', () => {
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
      tablero.mockReturnValue(of([pedido()]));
      const fixture = crear();
      fixture.detectChanges();
      tablero.mockReturnValue(throwError(() => new Error('sin red')));

      vi.advanceTimersByTime(Tablero.INTERVALO_MS);
      fixture.detectChanges();

      expect(texto(fixture)).not.toContain('No se pudo cargar el tablero');
      expect(texto(fixture)).toContain('#12');
    });

    it('deja de refrescar al destruir el componente', () => {
      const fixture = crear();
      fixture.detectChanges();
      fixture.destroy();

      vi.advanceTimersByTime(Tablero.INTERVALO_MS * 3);
      expect(tablero).toHaveBeenCalledTimes(1);
    });
  });

  describe('tarjeta de pedido', () => {
    it('muestra los ítems como contenido principal ("2× Cappuccino")', () => {
      tablero.mockReturnValue(
        of([
          pedido({
            items: [
              { producto: 'Cappuccino', cantidad: 2 },
              { producto: 'Pan de Bono', cantidad: 1 },
            ],
          }),
        ]),
      );
      const fixture = crear();
      fixture.detectChanges();

      const items = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('.pedido .items li'),
      ).map((li) => li.textContent?.replace(/\s+/g, ' ').trim());
      expect(items).toEqual(['2× Cappuccino', '1× Pan de Bono']);
    });

    it('sin ítems (API anterior) la tarjeta se ve igual: cliente, código y botón', () => {
      tablero.mockReturnValue(of([pedido()]));
      const fixture = crear();
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).querySelector('.items')).toBeNull();
      expect(texto(fixture)).toContain('Ana');
      expect(texto(fixture)).toContain('RET-1A2B3C4D');
      expect(boton(fixture).textContent).toContain('Iniciar preparación');
    });

    it('muestra el tiempo de espera y marca como demorado al pasar de MINUTOS_ALERTA', () => {
      const ahora = Date.now();
      const hace = (min: number) => new Date(ahora - min * 60_000).toISOString();
      tablero.mockReturnValue(
        of([
          pedido({ pedidoId: 1, fechaPedido: hace(0) }),
          pedido({ pedidoId: 2, fechaPedido: hace(7) }),
          pedido({ pedidoId: 3, fechaPedido: hace(Tablero.MINUTOS_ALERTA + 2) }),
          pedido({ pedidoId: 4, estado: 'LISTO', fechaPedido: hace(40) }),
        ]),
      );
      const fixture = crear();
      fixture.detectChanges();

      const tarjetas = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.pedido'),
      );
      const de = (n: number) => tarjetas.find((t) => t.textContent?.includes(`#${n}`))!;
      expect(de(1).querySelector('.espera')?.textContent).toContain('recién');
      expect(de(2).querySelector('.espera')?.textContent).toContain('hace 7 min');
      expect(de(2).querySelector('.espera.alerta')).toBeNull();
      expect(de(3).querySelector('.espera.alerta')).not.toBeNull();
      // Los listos ya no se preparan: no se marcan como demorados.
      expect(de(4).querySelector('.espera.alerta')).toBeNull();
    });

    it('la espera se renueva cada 30 s sin pedir el tablero', () => {
      tablero.mockReturnValue(of([pedido({ fechaPedido: new Date().toISOString() })]));
      const fixture = crear();
      fixture.detectChanges();
      expect(texto(fixture)).toContain('recién');

      vi.advanceTimersByTime(Tablero.INTERVALO_ESPERA_MS * 2);
      fixture.detectChanges();
      expect(texto(fixture)).toContain('hace 1 min');
    });

    it('ordena cada columna del más antiguo al más nuevo', () => {
      const ahora = Date.now();
      tablero.mockReturnValue(
        of([
          pedido({ pedidoId: 20, fechaPedido: new Date(ahora - 1 * 60_000).toISOString() }),
          pedido({ pedidoId: 21, fechaPedido: new Date(ahora - 5 * 60_000).toISOString() }),
        ]),
      );
      const fixture = crear();
      fixture.detectChanges();

      const numeros = Array.from(
        (fixture.nativeElement as HTMLElement).querySelectorAll('.pedido .numero'),
      ).map((n) => n.textContent?.trim());
      expect(numeros).toEqual(['#21', '#20']);
    });
  });

  describe('avanzar un pedido', () => {
    it('deshabilita el botón mientras guarda y no permite una segunda llamada', () => {
      const respuesta = new Subject<unknown>();
      cambiarEstado.mockReturnValue(respuesta);
      tablero.mockReturnValue(of([pedido()]));
      const fixture = crear();
      fixture.detectChanges();

      boton(fixture).click();
      fixture.detectChanges();
      expect(boton(fixture).disabled).toBe(true);
      expect(boton(fixture).textContent).toContain('Guardando');

      boton(fixture).click();
      expect(cambiarEstado).toHaveBeenCalledTimes(1);
      expect(cambiarEstado).toHaveBeenCalledWith(12, 'EN_PREPARACION');
    });

    it('tras avanzar recarga en silencio (sin esqueleto) y anuncia el cambio', () => {
      tablero.mockReturnValue(of([pedido()]));
      const fixture = crear();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;

      const cargandoVisto: boolean[] = [];
      tablero.mockImplementation(() => {
        cargandoVisto.push(!!el.querySelector('app-esqueleto'));
        return of([pedido({ estado: 'EN_PREPARACION' })]);
      });
      boton(fixture).click();
      fixture.detectChanges();

      expect(tablero).toHaveBeenCalledTimes(2);
      expect(cargandoVisto).toEqual([false]);
      expect(el.querySelector('app-esqueleto')).toBeNull();
      const aviso = el.querySelector('[role="status"]');
      expect(aviso?.textContent).toContain('Pedido #12 pasó a En preparación');
      expect(boton(fixture).textContent).toContain('Marcar listo');
    });

    it('un error al avanzar se muestra en su tarjeta y no oculta el tablero', () => {
      cambiarEstado.mockReturnValue(throwError(() => ({ status: 500 })));
      tablero.mockReturnValue(of([pedido(), pedido({ pedidoId: 13 })]));
      const fixture = crear();
      fixture.detectChanges();

      boton(fixture).click();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;

      expect(el.querySelectorAll('.pedido').length).toBe(2);
      const alertas = el.querySelectorAll('.pedido [role="alert"]');
      expect(alertas.length).toBe(1);
      expect(alertas[0].textContent).toContain('No se pudo cambiar el estado del pedido #12');
      expect(boton(fixture).disabled).toBe(false);
    });
  });

  describe('errores de carga', () => {
    it('sin datos todavía, el error reemplaza al tablero', () => {
      tablero.mockReturnValue(throwError(() => new Error('sin red')));
      const fixture = crear();
      fixture.detectChanges();

      expect(texto(fixture)).toContain('No se pudo cargar el tablero.');
      expect((fixture.nativeElement as HTMLElement).querySelector('.tablero')).toBeNull();
    });

    it('con datos ya cargados, un fallo al recargar muestra un aviso y conserva el tablero', () => {
      tablero.mockReturnValue(of([pedido()]));
      const fixture = crear();
      fixture.detectChanges();

      tablero.mockReturnValue(throwError(() => new Error('sin red')));
      fixture.componentInstance['cargar']();
      fixture.detectChanges();

      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.tablero')).not.toBeNull();
      expect(el.querySelector('[role="alert"]')?.textContent).toContain(
        'No se pudo cargar el tablero.',
      );
    });
  });

  describe('sede', () => {
    const selectorSede = (fixture: ComponentFixture<Tablero>) =>
      (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>(
        'select[name="filtroSede"]',
      );

    it('barista y cajero no ven selector ni etiqueta de sede y no cargan las sedes', () => {
      tablero.mockReturnValue(of([pedido()]));
      for (const r of ['BARISTA', 'CAJERO']) {
        TestBed.resetTestingModule();
        rol.set(r);
        const fixture = crear();
        fixture.detectChanges();
        expect(selectorSede(fixture)).toBeNull();
        expect((fixture.nativeElement as HTMLElement).querySelector('.sede')).toBeNull();
      }
      expect(obtenerSucursales).not.toHaveBeenCalled();
    });

    it('supervisor y admin ven el selector y la sede en cada tarjeta', () => {
      tablero.mockReturnValue(of([pedido({ sucursalId: 2 })]));
      for (const r of ['SUPERVISOR', 'ADMIN']) {
        TestBed.resetTestingModule();
        rol.set(r);
        const fixture = crear();
        fixture.detectChanges();
        expect(selectorSede(fixture)).not.toBeNull();
        expect(selectorSede(fixture)!.textContent).toContain('Todas');
        expect(selectorSede(fixture)!.textContent).toContain('Poblado');
        expect((fixture.nativeElement as HTMLElement).querySelector('.sede')?.textContent).toBe(
          'Poblado',
        );
      }
    });

    it('al elegir una sede pide solo esa sede y quita la etiqueta de las tarjetas', () => {
      rol.set('SUPERVISOR');
      tablero.mockReturnValue(of([pedido({ sucursalId: 2 })]));
      const fixture = crear();
      fixture.detectChanges();

      const select = selectorSede(fixture)!;
      select.value = '2';
      select.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(tablero).toHaveBeenLastCalledWith(null, 2);
      expect((fixture.nativeElement as HTMLElement).querySelector('.sede')).toBeNull();
    });

    it('si fallan las sedes no hay selector y el tablero sigue funcionando', () => {
      rol.set('ADMIN');
      obtenerSucursales.mockReturnValue(throwError(() => new Error('sin red')));
      tablero.mockReturnValue(of([pedido()]));
      const fixture = crear();
      fixture.detectChanges();

      expect(selectorSede(fixture)).toBeNull();
      expect(texto(fixture)).toContain('#12');
    });
  });
});
