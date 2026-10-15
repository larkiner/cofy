import { TestBed } from '@angular/core/testing';
import { SeguimientoPedido } from './seguimiento-pedido';

function crear(estado: string) {
  const fixture = TestBed.createComponent(SeguimientoPedido);
  fixture.componentRef.setInput('estado', estado);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const textos = (el: HTMLElement) =>
  [...el.querySelectorAll('.paso .texto')].map((n) => n.textContent?.trim());

describe('SeguimientoPedido', () => {
  it('pinta los tres pasos con sus textos', () => {
    expect(textos(crear('PAGADO'))).toEqual(['Pagado', 'En preparación', 'Listo para retirar']);
  });

  it('marca el paso actual con aria-current="step" según el estado', () => {
    const actual = (estado: string) =>
      [...crear(estado).querySelectorAll('.paso')].findIndex(
        (n) => n.getAttribute('aria-current') === 'step',
      );
    expect(actual('PAGADO')).toBe(0);
    expect(actual('EN_PREPARACION')).toBe(1);
    expect(actual('LISTO')).toBe(2);
  });

  it('solo hay un paso actual y los anteriores llevan el icono check', () => {
    const el = crear('LISTO');
    expect(el.querySelectorAll('[aria-current="step"]').length).toBe(1);
    expect(el.querySelectorAll('.paso.hecho').length).toBe(2);
    expect(el.querySelectorAll('.paso.hecho app-icono').length).toBe(2);
    expect(el.querySelectorAll('.paso.actual app-icono').length).toBe(0);
  });

  it('no dibuja nada con estados que no admiten seguimiento', () => {
    for (const estado of ['ENTREGADO', 'CANCELADO', 'PENDIENTE_PAGO', 'XYZ']) {
      expect(crear(estado).querySelector('ol')).toBeNull();
    }
  });
});
