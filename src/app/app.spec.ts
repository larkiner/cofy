import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { appConfig } from './app.config';
import { CarritoService } from './application/carrito.service';
import { MenuItem } from './domain/menu/menu.model';

const PRODUCTO_PRUEBA: MenuItem = {
  productoId: 1,
  nombre: 'Latte',
  descripcion: null,
  precio: 5000,
  imagenUrl: null,
  categoriaId: 1,
  categoria: 'Bebidas calientes',
};

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: appConfig.providers,
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('debe mostrar el nombre de la marca en el encabezado', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.marca')?.textContent?.trim()).toBeTruthy();
  });

  it('debe mostrar los enlaces principales de navegación', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const textoNav = compiled.querySelector('.navegacion')?.textContent ?? '';
    expect(textoNav).toContain('Carta');
    expect(textoNav).toContain('Sucursales');
  });

  it('debe reflejar en el contador del header la cantidad del carrito', async () => {
    const fixture = TestBed.createComponent(App);
    const carrito = TestBed.inject(CarritoService);
    carrito.vaciar();

    await fixture.whenStable();
    fixture.detectChanges();
    let compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.enlace-carrito .contador')).toBeNull();

    carrito.agregar(PRODUCTO_PRUEBA);
    fixture.detectChanges();
    await fixture.whenStable();
    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.enlace-carrito .contador')?.textContent?.trim()).toBe('1');
  });
});
