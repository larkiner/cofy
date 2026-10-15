import { TestBed } from '@angular/core/testing';
import { CodigoRetiro } from './codigo-retiro';

function crear(codigo: string, variante?: 'grande' | 'compacto') {
  const fixture = TestBed.createComponent(CodigoRetiro);
  fixture.componentRef.setInput('codigo', codigo);
  if (variante) fixture.componentRef.setInput('variante', variante);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('CodigoRetiro', () => {
  it('anuncia el código completo con un aria-label', () => {
    const tiquete = crear('RET-7KQ2M9XA').querySelector('.tiquete');
    expect(tiquete?.getAttribute('aria-label')).toBe('Código de retiro RET-7KQ2M9XA');
  });

  it('el texto copiable es exactamente el código, sin caracteres insertados', () => {
    const tiquete = crear('RET-7KQ2M9XA').querySelector<HTMLElement>('.tiquete')!;
    expect(tiquete.textContent).toBe('RET-7KQ2M9XA');
  });

  it('es la variante grande por defecto y acepta la compacta', () => {
    expect(crear('RET-AAAA1111').querySelector('.tiquete')?.classList).toContain('grande');
    const compacto = crear('RET-AAAA1111', 'compacto').querySelector('.tiquete');
    expect(compacto?.classList).toContain('compacto');
    expect(compacto?.classList).not.toContain('grande');
  });

  it('muestra un código sin guion tal cual', () => {
    expect(crear('ABC123').querySelector('.tiquete')?.textContent).toBe('ABC123');
  });
});
