import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MenuItem } from '../../../../domain/menu/menu.model';
import { EstadoDestacados, InicioDestacados } from './destacados';

registerLocaleData(localeEsCo);

const ITEMS: MenuItem[] = [
  {
    productoId: 1,
    nombre: 'Americano',
    descripcion: null,
    precio: 5000,
    imagenUrl: null,
    categoriaId: 1,
    categoria: 'Bebidas',
  },
  {
    productoId: 2,
    nombre: 'Latte',
    descripcion: null,
    precio: 8000,
    imagenUrl: null,
    categoriaId: 1,
    categoria: 'Bebidas',
  },
];

function crear(estado: EstadoDestacados, items: MenuItem[] = ITEMS, puedeAgregar = true) {
  const fixture = TestBed.createComponent(InicioDestacados);
  fixture.componentRef.setInput('estado', estado);
  fixture.componentRef.setInput('items', items);
  fixture.componentRef.setInput('puedeAgregar', puedeAgregar);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('InicioDestacados', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: LOCALE_ID, useValue: 'es-CO' }],
    });
  });

  it('con el menú cargado muestra las tarjetas, el enlace a la carta y emite al agregar', () => {
    const { fixture, el } = crear('listo');
    const emitidos: MenuItem[] = [];
    fixture.componentInstance.agregar.subscribe((item) => emitidos.push(item));

    expect(el.querySelectorAll('article')).toHaveLength(2);
    expect(el.querySelector('.ver-carta')?.textContent).toContain('Ver la carta');

    const boton = el.querySelector<HTMLButtonElement>(
      'button[aria-label="Agregar Latte al carrito"]',
    );
    boton?.click();
    expect(emitidos.map((i) => i.nombre)).toEqual(['Latte']);
  });

  it('el personal no ve el botón de agregar', () => {
    const { el } = crear('listo', ITEMS, false);
    expect(el.querySelectorAll('article')).toHaveLength(2);
    expect(el.querySelector('button')).toBeNull();
  });

  it('mientras carga muestra el esqueleto y ninguna tarjeta', () => {
    const { el } = crear('cargando', []);
    expect(el.querySelector('app-esqueleto')).not.toBeNull();
    expect(el.querySelector('article')).toBeNull();
  });

  it('si falla muestra el error y un enlace "Ver la carta"', () => {
    const { el } = crear('error', []);
    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'No pudimos cargar las recomendaciones.',
    );
    expect(el.querySelector('.error a')?.textContent).toContain('Ver la carta');
  });

  it('con el menú cargado pero sin recomendaciones no muestra la sección', () => {
    const { el } = crear('listo', []);
    expect(el.querySelector('section')).toBeNull();
  });
});
