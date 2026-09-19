import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { CampoError, ErrorApi } from '../../domain/errors/error-api';

/**
 * Manejo de errores HTTP centralizado: convierte cualquier `HttpErrorResponse`
 * en un {@link ErrorApi} con un mensaje en español ya listo para mostrar.
 * Prefiere el mensaje de negocio del backend (`ApiExceptionHandler`) y, si no
 * hay, cae a un mensaje por defecto según el código. Reenvía el error (no lo
 * traga), así los `.subscribe({ error })` de los componentes siguen recibiéndolo.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(catchError(error => throwError(() => normalizar(error))));

function normalizar(error: unknown): ErrorApi {
  if (!(error instanceof HttpErrorResponse)) {
    return new ErrorApi(-1, 'Ocurrió un error inesperado.');
  }

  // status 0 = la petición no llegó a tener respuesta: red caída, CORS o
  // el backend apagado. Es el caso más confuso, por eso mensaje explícito.
  if (error.status === 0) {
    return new ErrorApi(
      0,
      'No hay conexión con el servidor. Revisa tu red o si el backend está activo.',
    );
  }

  const cuerpo = error.error as { message?: string; errors?: CampoError[] } | string | null;
  const mensajeBackend =
    cuerpo && typeof cuerpo === 'object' && typeof cuerpo.message === 'string'
      ? cuerpo.message
      : undefined;
  const errores =
    cuerpo && typeof cuerpo === 'object' && Array.isArray(cuerpo.errors) ? cuerpo.errors : [];

  return new ErrorApi(error.status, mensajeBackend ?? mensajePorDefecto(error.status), errores);
}

function mensajePorDefecto(status: number): string {
  switch (status) {
    case 400:
      return 'Datos inválidos. Revisa lo ingresado.';
    case 401:
      return 'No autorizado. Inicia sesión de nuevo.';
    case 403:
      return 'No tienes permiso para esta acción.';
    case 404:
      return 'No se encontró el recurso solicitado.';
    case 409:
      return 'La operación entra en conflicto con el estado actual.';
    case 429:
      return 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.';
    default:
      return status >= 500
        ? 'Error del servidor. Intenta de nuevo más tarde.'
        : 'Ocurrió un error inesperado.';
  }
}
