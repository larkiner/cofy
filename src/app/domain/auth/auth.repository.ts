import { Observable } from 'rxjs';
import { AuthResponse, LoginRequest, RegistroRequest } from './auth.model';

/** Puerto: autenticación contra el backend (login/registro). */
export abstract class AuthRepository {
  abstract registrar(datos: RegistroRequest): Observable<AuthResponse>;
  abstract login(datos: LoginRequest): Observable<AuthResponse>;
}
