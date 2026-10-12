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

  describe('menú desplegable (móvil)', () => {
    async function crear() {
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      fixture.detectChanges();
      return fixture;
    }

    const boton = (el: HTMLElement) => el.querySelector<HTMLButtonElement>('.boton-menu')!;
    const panel = (el: HTMLElement) => el.querySelector<HTMLElement>('#menu-movil');

    it('empieza cerrado y el botón lo anuncia con aria-expanded', async () => {
      const el = (await crear()).nativeElement as HTMLElement;
      expect(panel(el)).toBeNull();
      expect(boton(el).getAttribute('aria-expanded')).toBe('false');
      expect(boton(el).getAttribute('aria-controls')).toBe('menu-movil');
    });

    it('al abrirlo ofrece la navegación, el tema y las opciones de cuenta', async () => {
      const fixture = await crear();
      const el = fixture.nativeElement as HTMLElement;

      boton(el).click();
      fixture.detectChanges();

      expect(boton(el).getAttribute('aria-expanded')).toBe('true');
      const texto = panel(el)?.textContent ?? '';
      expect(texto).toContain('Carta');
      expect(texto).toContain('Sucursales');
      expect(texto).toContain('Iniciar sesión');
      expect(texto).toContain('Unirme a la comunidad');
      expect(texto).toMatch(/modo (oscuro|claro)/i);
    });

    it('vuelve a cerrarse con el mismo botón y con Escape', async () => {
      const fixture = await crear();
      const el = fixture.nativeElement as HTMLElement;

      boton(el).click();
      fixture.detectChanges();
      boton(el).click();
      fixture.detectChanges();
      expect(panel(el)).toBeNull();

      boton(el).click();
      fixture.detectChanges();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();
      expect(panel(el)).toBeNull();
      expect(boton(el).getAttribute('aria-expanded')).toBe('false');
    });
  });
});
