import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { InternoService } from '../../../application/interno.service';
import { MenuService } from '../../../application/menu.service';
import { Inventario } from './inventario';

/**
 * La foto del producto se elige en el dispositivo pero SOLO se sube al guardar:
 * elegir y cambiar de foto no debe dejar archivos duplicados en el almacenamiento.
 */
describe('Inventario (foto del producto)', () => {
  const png = () => new File([new Uint8Array([1, 2, 3])], 'foto.png', { type: 'image/png' });
  const eventoCon = (archivo: File) => ({ target: { files: [archivo], value: '' } }) as unknown as Event;

  let subirImagen: ReturnType<typeof vi.fn>;
  let crearProducto: ReturnType<typeof vi.fn>;
  let componente: any;

  beforeEach(() => {
    // jsdom no implementa las URL temporales de archivos.
    URL.createObjectURL = vi.fn(() => 'blob:vista-previa');
    URL.revokeObjectURL = vi.fn();

    subirImagen = vi.fn(() => of({ url: 'https://cdn.test/productos/a.png' }));
    crearProducto = vi.fn(() => of({ id: 1 }));
    TestBed.configureTestingModule({
      providers: [
        {
          provide: InternoService,
          useValue: {
            categorias: () => of([{ id: 1, nombre: 'Bebidas', descripcion: null }]),
            productos: () => of([]),
            subirImagen,
            crearProducto,
            actualizarProducto: vi.fn(() => of({ id: 1 })),
          },
        },
        { provide: MenuService, useValue: { invalidarMenu: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(Inventario);
    fixture.detectChanges();
    componente = fixture.componentInstance;
    componente.prodNombre = 'Latte de prueba';
    componente.prodPrecio = 8000;
    componente.prodCategoriaId = 1;
  });

  async function elegirFoto(): Promise<void> {
    componente.seleccionarImagen(eventoCon(png()));
    await vi.waitFor(() => expect(componente.vistaLocal()).not.toBeNull());
  }

  it('elegir la foto NO la sube: solo muestra la vista previa', async () => {
    await elegirFoto();

    expect(subirImagen).not.toHaveBeenCalled();
    expect(componente.vistaImagen()).toBe('blob:vista-previa');
  });

  it('cambiar de foto o quitarla antes de guardar no sube nada', async () => {
    await elegirFoto();
    await elegirFoto();
    componente.quitarImagen();
    componente.guardarProducto();

    expect(subirImagen).not.toHaveBeenCalled();
    expect(crearProducto).toHaveBeenCalledWith(expect.objectContaining({ imagenUrl: undefined }));
  });

  it('al guardar sube la foto UNA vez y crea el producto con su URL', async () => {
    await elegirFoto();
    componente.guardarProducto();

    expect(subirImagen).toHaveBeenCalledTimes(1);
    expect(crearProducto).toHaveBeenCalledWith(
      expect.objectContaining({ imagenUrl: 'https://cdn.test/productos/a.png' }),
    );
    expect(componente.vistaLocal()).toBeNull(); // formulario limpio tras guardar
  });

  it('si el guardado falla, al reintentar NO vuelve a subir la foto', async () => {
    crearProducto.mockReturnValueOnce(throwError(() => ({ mensaje: 'Error del servidor' })));
    await elegirFoto();

    componente.guardarProducto(); // sube, el producto falla
    componente.guardarProducto(); // reintento

    expect(subirImagen).toHaveBeenCalledTimes(1);
    expect(crearProducto).toHaveBeenCalledTimes(2);
  });

  it('si la subida falla no se crea el producto y se explica el motivo', async () => {
    subirImagen.mockReturnValueOnce(throwError(() => ({ mensaje: 'La imagen pesa más de 5 MB.' })));
    await elegirFoto();
    componente.guardarProducto();

    expect(crearProducto).not.toHaveBeenCalled();
    expect(componente.errorImagen()).toBe('La imagen pesa más de 5 MB.');
    expect(componente.guardando()).toBe(false);
  });

  it('rechaza lo que no es una imagen sin intentar subirlo', () => {
    const pdf = new File(['x'], 'nota.pdf', { type: 'application/pdf' });
    componente.seleccionarImagen(eventoCon(pdf));

    expect(componente.errorImagen()).toBe('Elige una imagen JPG, PNG o WEBP.');
    expect(componente.vistaLocal()).toBeNull();
    expect(subirImagen).not.toHaveBeenCalled();
  });
});
