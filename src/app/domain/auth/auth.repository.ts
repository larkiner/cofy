import { Observable } from 'rxjs';
import { AuthResponse, LoginRequest, RegistroRequest } from './auth.model';

/** Puerto: autenticación contra el backend (login/registro/logout). */
export abstract class AuthRepository {
  abstract registrar(datos: RegistroRequest): Observable<AuthResponse>;
  abstract login(datos: LoginRequest): Observable<AuthResponse>;
  /** Revoca `token` en el servidor (no depende de la sesión local ni del interceptor). */
  abstract logout(token: string): Observable<void>;
}
