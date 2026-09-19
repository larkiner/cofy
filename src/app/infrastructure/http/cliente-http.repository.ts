import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ActualizarClienteRequest, ClientePerfil } from '../../domain/cliente/cliente.model';
import { ClienteRepository } from '../../domain/cliente/cliente.repository';
import { environment } from '../../../environments/environment';

/** Adaptador: perfil del cliente autenticado vía HTTP (el JWT lo agrega el interceptor). */
@Injectable()
export class ClienteHttpRepository extends ClienteRepository {
  private readonly http = inject(HttpClient);

  miPerfil(): Observable<ClientePerfil> {
    return this.http.get<ClientePerfil>(`${environment.apiUrl}/clientes/me`);
  }

  actualizar(datos: ActualizarClienteRequest): Observable<ClientePerfil> {
    return this.http.put<ClientePerfil>(`${environment.apiUrl}/clientes/me`, datos);
  }
}
