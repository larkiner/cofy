/**
 * Prepara una foto elegida en el dispositivo antes de subirla: respeta su
 * orientación (las fotos de móvil guardan la rotación aparte), reduce el lado
 * mayor y la vuelve a comprimir. Una foto de cámara de 6–12 MB queda en pocos
 * cientos de KB: pasa el tope de 5 MB de la API y sube rápido con datos móviles.
 *
 * Si el navegador no puede decodificarla, se devuelve el archivo original y la
 * API decide (ella vuelve a validar tipo y tamaño).
 */

/** Lado mayor máximo: sobra para las tarjetas de la carta y el detalle. */
export const LADO_MAX_IMAGEN = 1600;

const CALIDAD = 0.85;

/** Reduce proporcionalmente para que el lado mayor no pase de `max` (nunca agranda). */
export function tamanoAjustado(
  ancho: number,
  alto: number,
  max = LADO_MAX_IMAGEN,
): { ancho: number; alto: number } {
  const mayor = Math.max(ancho, alto);
  if (mayor <= max) return { ancho, alto };
  const factor = max / mayor;
  return { ancho: Math.round(ancho * factor), alto: Math.round(alto * factor) };
}

const EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Cambia la extensión del nombre para que coincida con el formato resultante. */
export function nombreConExtension(nombre: string, mime: string): string {
  const base = nombre.replace(/\.[^./\\]+$/, '') || 'imagen';
  return `${base}.${EXTENSION[mime] ?? 'jpg'}`;
}

export async function prepararImagen(archivo: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
  } catch {
    return archivo;
  }

  try {
    const { ancho, alto } = tamanoAjustado(bitmap.width, bitmap.height);
    const reducida = ancho !== bitmap.width || alto !== bitmap.height;

    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    const contexto = lienzo.getContext('2d');
    if (!contexto) return archivo;
    contexto.drawImage(bitmap, 0, 0, ancho, alto);

    // Las fotos (JPEG) no tienen transparencia; PNG y WEBP sí, así que se
    // piden en WEBP (los navegadores que no lo codifican devuelven PNG).
    const formato = archivo.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
    const blob = await new Promise<Blob | null>((resolver) =>
      lienzo.toBlob(resolver, formato, CALIDAD),
    );
    if (!blob) return archivo;

    // Si no se achicó y la recompresión no ganó nada, se conserva el original.
    if (!reducida && blob.size >= archivo.size) return archivo;

    return new File([blob], nombreConExtension(archivo.name, blob.type), { type: blob.type });
  } finally {
    bitmap.close();
  }
}
