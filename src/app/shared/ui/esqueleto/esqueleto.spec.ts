import { TestBed } from '@angular/core/testing';
import { Esqueleto } from './esqueleto';

function crear(variante: string, cantidad?: number, etiqueta?: string) {
  const fixture = TestBed.createComponent(Esqueleto);
  fixture.componentRef.setInput('variante', variante);
  if (cantidad !== undefined) fixture.componentRef.setInput('cantidad', cantidad);
  if (etiqueta !== undefined) fixture.componentRef.setInput('etiqueta', etiqueta);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('Esqueleto', () => {
  it('se anuncia como región de estado ocupada con una etiqueta para lectores de pantalla', () => {
    const el = crear('fila', 2, 'Cargando pedidos…');
    const raiz = el.querySelector('[role="status"]');
    expect(raiz?.getAttribute('aria-busy')).toBe('true');
    expect(el.querySelector('.visualmente-oculto')?.textContent?.trim()).toBe('Cargando pedidos…');
  });

  it('dibuja tantas piezas como pide `cantidad`', () => {
    expect(crear('producto', 4).querySelectorAll('.pieza').length).toBe(4);
    expect(crear('fila', 3).querySelectorAll('.pieza').length).toBe(3);
    expect(crear('sucursal', 2).querySelectorAll('.pieza').length).toBe(2);
    expect(crear('destacado', 3).querySelectorAll('.pieza').length).toBe(3);
  });

  it('usa una cantidad por defecto razonable en cada variante', () => {
    expect(crear('producto').querySelectorAll('.pieza').length).toBe(6);
    expect(crear('fila').querySelectorAll('.pieza').length).toBe(3);
  });

  it('la variante de métricas dibuja los cuatro indicadores y las dos gráficas', () => {
    const el = crear('metricas');
    expect(el.querySelectorAll('.kpi').length).toBe(4);
    expect(el.querySelectorAll('.grafica').length).toBe(2);
  });

  it('las piezas son decorativas (aria-hidden) para no leerse como contenido', () => {
    const el = crear('texto', 3);
    expect(el.querySelector('.bloque')?.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});
