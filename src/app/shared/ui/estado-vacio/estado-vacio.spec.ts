import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EstadoVacio } from './estado-vacio';

@Component({
  imports: [EstadoVacio],
  template: `
    <app-estado-vacio icono="shopping-bag" titulo="El carrito está vacío" [nivel]="nivel()">
      <p class="mensaje">Agrega productos desde la carta.</p>
      <a accion class="boton" href="/menu">Explorar la carta</a>
    </app-estado-vacio>
  `,
})
class Anfitrion {
  nivel = signal<2 | 3>(2);
}

function crear() {
  const fixture = TestBed.createComponent(Anfitrion);
  fixture.detectChanges();
  return fixture;
}

describe('EstadoVacio', () => {
  it('pinta el título y el icono recibidos por entrada', () => {
    const el = crear().nativeElement as HTMLElement;
    expect(el.querySelector('.titulo')?.textContent?.trim()).toBe('El carrito está vacío');
    expect(el.querySelector('app-icono')).not.toBeNull();
  });

  it('proyecta el texto en su hueco y la acción en el suyo', () => {
    const el = crear().nativeElement as HTMLElement;
    expect(el.querySelector('.texto .mensaje')?.textContent).toContain('Agrega productos');
    const accion = el.querySelector('.accion a');
    expect(accion?.textContent).toContain('Explorar la carta');
    expect(el.querySelector('.texto a')).toBeNull();
  });

  it('usa un h2 por defecto y un h3 con nivel 3', () => {
    const fixture = crear();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h2.titulo')).not.toBeNull();
    fixture.componentInstance.nivel.set(3);
    fixture.detectChanges();
    expect(el.querySelector('h3.titulo')).not.toBeNull();
    expect(el.querySelector('h2.titulo')).toBeNull();
  });
});
