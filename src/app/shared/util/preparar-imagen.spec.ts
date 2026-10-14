import { LADO_MAX_IMAGEN, nombreConExtension, tamanoAjustado } from './preparar-imagen';

describe('preparar-imagen', () => {
  describe('tamanoAjustado', () => {
    it('reduce una foto de móvil horizontal manteniendo la proporción', () => {
      expect(tamanoAjustado(4000, 3000)).toEqual({ ancho: LADO_MAX_IMAGEN, alto: 1200 });
    });

    it('reduce una foto vertical por su lado mayor', () => {
      expect(tamanoAjustado(3000, 4000)).toEqual({ ancho: 1200, alto: LADO_MAX_IMAGEN });
    });

    it('nunca agranda una imagen que ya es pequeña', () => {
      expect(tamanoAjustado(800, 600)).toEqual({ ancho: 800, alto: 600 });
      expect(tamanoAjustado(LADO_MAX_IMAGEN, 900)).toEqual({ ancho: LADO_MAX_IMAGEN, alto: 900 });
    });
  });

  describe('nombreConExtension', () => {
    it('cambia la extensión al formato resultante', () => {
      expect(nombreConExtension('IMG_2041.HEIC', 'image/jpeg')).toBe('IMG_2041.jpg');
      expect(nombreConExtension('foto.png', 'image/webp')).toBe('foto.webp');
    });

    it('conserva los puntos del nombre y añade extensión si no tenía', () => {
      expect(nombreConExtension('latte.v2.final.jpg', 'image/png')).toBe('latte.v2.final.png');
      expect(nombreConExtension('sin-extension', 'image/jpeg')).toBe('sin-extension.jpg');
    });
  });
});
