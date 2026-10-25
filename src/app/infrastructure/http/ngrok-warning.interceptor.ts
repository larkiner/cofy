import { HttpInterceptorFn } from '@angular/common/http';
import { esUrlDeApi } from './url-api';

/**
 * El túnel gratuito de ngrok muestra una página HTML de advertencia en vez
 * de la respuesta real cuando detecta un User-Agent de navegador. Esta
 * cabecera se la salta. Solo se envía a la API propia (`environment.apiUrl`),
 * nunca a otros hosts. No tiene efecto contra un backend que no sea ngrok.
 */
export const ngrokWarningInterceptor: HttpInterceptorFn = (req, next) => {
  if (esUrlDeApi(req.url)) {
    req = req.clone({ setHeaders: { 'ngrok-skip-browser-warning': 'true' } });
  }
  return next(req);
};
