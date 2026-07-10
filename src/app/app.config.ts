import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { AuthRepository } from './domain/auth/auth.repository';
import { SesionPort } from './domain/auth/sesion.port';
import { MenuRepository } from './domain/menu/menu.repository';
import { PedidoRepository } from './domain/pedidos/pedido.repository';
import { InternoRepository } from './domain/interno/interno.repository';
import { authInterceptor } from './infrastructure/http/auth.interceptor';
import { AuthHttpRepository } from './infrastructure/http/auth-http.repository';
import { MenuHttpRepository } from './infrastructure/http/menu-http.repository';
import { PedidoHttpRepository } from './infrastructure/http/pedido-http.repository';
import { InternoHttpRepository } from './infrastructure/http/interno-http.repository';
import { LocalStorageSesionAdapter } from './infrastructure/storage/local-storage-sesion.adapter';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    { provide: AuthRepository, useClass: AuthHttpRepository },
    { provide: SesionPort, useClass: LocalStorageSesionAdapter },
    { provide: MenuRepository, useClass: MenuHttpRepository },
    { provide: PedidoRepository, useClass: PedidoHttpRepository },
    { provide: InternoRepository, useClass: InternoHttpRepository },
  ],
};
