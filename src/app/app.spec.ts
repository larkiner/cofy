import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { App } from './app';
import { appConfig } from './app.config';
import { AvisoService } from './application/aviso.service';
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

  describe('estructura de la página', () => {
    afterEach(() => localStorage.clear());

    it('envuelve el contenido en <main id="contenido"> y ofrece "Saltar al contenido" primero', async () => {
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;

      const principal = el.querySelector<HTMLElement>('main#contenido');
      expect(principal).not.toBeNull();
      expect(principal!.getAttribute('tabindex')).toBe('-1');
      expect(principal!.querySelector('router-outlet')).not.toBeNull();

      const salto = el.querySelector<HTMLAnchorElement>('a.saltar-contenido')!;
      expect(salto.textContent?.trim()).toBe('Saltar al contenido');
      // Primer elemento del documento de la app: es lo primero que enfoca Tab.
      expect(el.querySelector('a, button')).toBe(salto);
    });

    it('"Saltar al contenido" lleva el foco a <main> sin navegar', async () => {
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;

      const clic = new MouseEvent('click', { bubbles: true, cancelable: true });
      el.querySelector<HTMLAnchorElement>('a.saltar-contenido')!.dispatchEvent(clic);

      expect(clic.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(el.querySelector('main#contenido'));
    });

    it('cierra el aviso de "agregado al carrito" al empezar una navegación', async () => {
      const fixture = TestBed.createComponent(App);
      const avisos = TestBed.inject(AvisoService);
      await fixture.whenStable();

      avisos.avisarProductoAgregado('Latte', 1);
      expect(avisos.aviso()).not.toBeNull();

      await TestBed.inject(Router).navigateByUrl('/carrito');
      expect(avisos.aviso()).toBeNull();
    });

    it('muestra el rol de la sesión legible ("Cliente"), no el valor crudo', async () => {
      localStorage.setItem('cafeteria_token', 'token-de-prueba');
      localStorage.setItem('cafeteria_email', 'ana@correo.com');
      localStorage.setItem('cafeteria_rol', 'CLIENTE');
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;

      el.querySelector<HTMLButtonElement>('.boton-menu')!.click();
      fixture.detectChanges();

      const texto = el.querySelector('#menu-movil')?.textContent ?? '';
      expect(el.querySelector('#menu-movil .panel-cuenta-rol')?.textContent?.trim()).toBe(
        'Cliente',
      );
      expect(texto).toContain('Mi cuenta');
      expect(texto).toContain('Cerrar sesión');
    });
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
      expect(texto).toContain('Crear cuenta');
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
