import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ActualizarClienteRequest, ClientePerfil } from '../domain/cliente/cliente.model';
import { ClienteRepository } from '../domain/cliente/cliente.repository';

/** Perfil del cliente autenticado: lectura y actualización de sus datos. */
@Injectable({ providedIn: 'root' })
export class ClienteService {
  private readonly repo = inject(ClienteRepository);

  miPerfil(): Observable<ClientePerfil> {
    return this.repo.miPerfil();
  }

  actualizar(datos: ActualizarClienteRequest): Observable<ClientePerfil> {
    return this.repo.actualizar(datos);
  }
}
