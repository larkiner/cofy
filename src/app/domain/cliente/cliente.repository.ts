import { Observable } from 'rxjs';
import { ActualizarClienteRequest, ClientePerfil } from './cliente.model';

/** Puerto: perfil del cliente autenticado (el JWT lo agrega el interceptor). */
export abstract class ClienteRepository {
  abstract miPerfil(): Observable<ClientePerfil>;
  abstract actualizar(datos: ActualizarClienteRequest): Observable<ClientePerfil>;
}
