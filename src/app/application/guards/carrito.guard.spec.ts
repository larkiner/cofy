import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import { CarritoService } from '../carrito.service';
import { MenuItem } from '../../domain/menu/menu.model';
import { carritoConProductosGuard } from './carrito.guard';

const LATTE: MenuItem = {
  productoId: 1,
  nombre: 'Latte',
  descripcion: null,
  precio: 8000,
  imagenUrl: null,
  categoriaId: 1,
  categoria: 'Bebidas',
};

describe('carritoConProductosGuard', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));

  const ejecutar = () =>
    TestBed.runInInjectionContext(() => carritoConProductosGuard({} as never, {} as never));

  it('con el carrito vacío redirige a /carrito', () => {
    const resultado = ejecutar();
    expect(resultado).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(resultado as UrlTree)).toBe('/carrito');
  });

  it('con productos en el carrito deja pasar al checkout', () => {
    TestBed.inject(CarritoService).agregar(LATTE);
    expect(ejecutar()).toBe(true);
  });
});
