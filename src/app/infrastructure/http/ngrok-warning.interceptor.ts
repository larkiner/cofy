import { HttpInterceptorFn } from '@angular/common/http';

/**
 * El túnel gratuito de ngrok muestra una página HTML de advertencia en vez
 * de la respuesta real cuando detecta un User-Agent de navegador. Esta
 * cabecera se la salta. No tiene efecto contra un backend que no sea ngrok.
 */
export const ngrokWarningInterceptor: HttpInterceptorFn = (req, next) => {
  req = req.clone({ setHeaders: { 'ngrok-skip-browser-warning': 'true' } });
  return next(req);
};
