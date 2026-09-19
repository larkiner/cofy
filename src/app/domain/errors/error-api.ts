/** Error de un campo puntual devuelto por la validación del backend. */
export interface CampoError {
  campo: string;
  mensaje: string;
}

/**
 * Error normalizado de la API. El interceptor de errores convierte cualquier
 * `HttpErrorResponse` en esta forma, con un `mensaje` en español ya listo para
 * mostrar y el `status` HTTP intacto (los componentes que discriminan por
 * código siguen funcionando). `status` 0 = sin respuesta (red/backend caído).
 */
export class ErrorApi extends Error {
  constructor(
    readonly status: number,
    readonly mensaje: string,
    readonly errores: readonly CampoError[] = [],
  ) {
    super(mensaje);
    this.name = 'ErrorApi';
  }
}
