import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PedidoCliente } from '../../../domain/pedidos/pedido.model';
import { ModoTarjetaPedido, modoDePedido, TarjetaPedido } from './tarjeta-pedido';

registerLocaleData(localeEsCo);

function pedido(estado: string, codigoRetiro: string | null = 'RET-7KQ2M9XA'): PedidoCliente {
  return {
    pedidoId: 10488,
    clienteId: 1,
    codigoRetiro,
    fechaPedido: '2026-10-14T15:45:00',
    fechaEntrega: null,
    estado,
    total: 18500,
    sucursalNombre: 'Cafetería Centro',
    sucursalDireccion: 'Cra. 49 # 52-61',
  };
}

function crear(p: PedidoCliente, modo?: ModoTarjetaPedido) {
  const fixture = TestBed.createComponent(TarjetaPedido);
  fixture.componentRef.setInput('pedido', p);
  if (modo) fixture.componentRef.setInput('modo', modo);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('TarjetaPedido', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [{ provide: LOCALE_ID, useValue: 'es-CO' }] });
  });

  describe('modo en curso', () => {
    it('muestra el tiquete compacto, el seguimiento, la sucursal y el total', () => {
      const el = crear(pedido('EN_PREPARACION'), 'en-curso');
      expect(el.querySelector('h3')?.textContent).toContain('Pedido #10488');
      const tiquete = el.querySelector('app-codigo-retiro .tiquete');
      expect(tiquete?.classList).toContain('compacto');
      expect(tiquete?.textContent).toBe('RET-7KQ2M9XA');
      expect(
        el.querySelector('app-seguimiento-pedido [aria-current="step"]')?.textContent,
      ).toContain('En preparación');
      expect(el.textContent).toContain('Cafetería Centro');
      expect(el.querySelector('.total')?.textContent).toMatch(/18\.500/);
    });

    it('la píldora usa la etiqueta legible, no el estado crudo', () => {
      const el = crear(pedido('EN_PREPARACION'), 'en-curso');
      const pildora = el.querySelector('.estado-pill');
      expect(pildora?.textContent?.trim()).toBe('En preparación');
      expect(pildora?.classList).toContain('EN_PREPARACION');
      expect(el.textContent).not.toContain('EN_PREPARACION');
    });

    it('no dibuja el tiquete si el pedido aún no tiene código', () => {
      const el = crear(pedido('PAGADO', null), 'en-curso');
      expect(el.querySelector('app-codigo-retiro')).toBeNull();
    });
  });

  describe('modo historial', () => {
    it('es el modo por defecto y no dibuja tiquete ni seguimiento', () => {
      const el = crear(pedido('ENTREGADO'));
      expect(el.querySelector('.historial')).not.toBeNull();
      expect(el.querySelector('app-codigo-retiro')).toBeNull();
      expect(el.querySelector('app-seguimiento-pedido')).toBeNull();
    });

    it('muestra el código solo como texto pequeño', () => {
      const el = crear(pedido('CANCELADO'), 'historial');
      expect(el.querySelector('.codigo-texto')?.textContent).toContain('RET-7KQ2M9XA');
    });

    it('etiqueta cada estado en español, incluido PENDIENTE_PAGO', () => {
      const texto = (estado: string) =>
        crear(pedido(estado, null), 'historial').querySelector('.estado-pill')?.textContent?.trim();
      expect(texto('ENTREGADO')).toBe('Entregado');
      expect(texto('CANCELADO')).toBe('Cancelado');
      expect(texto('PENDIENTE_PAGO')).toBe('Pendiente de pago');
    });

    it('sin código no muestra la línea del código', () => {
      expect(crear(pedido('PENDIENTE_PAGO', null)).querySelector('.codigo-texto')).toBeNull();
    });
  });

  it('modoDePedido separa los pedidos por retirar del historial', () => {
    for (const e of ['PAGADO', 'EN_PREPARACION', 'LISTO']) expect(modoDePedido(e)).toBe('en-curso');
    for (const e of ['ENTREGADO', 'CANCELADO', 'PENDIENTE_PAGO', 'XYZ']) {
      expect(modoDePedido(e)).toBe('historial');
    }
  });
});
