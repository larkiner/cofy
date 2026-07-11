import { AuthResponse } from './auth.model';

/** Puerto: persistencia de la sesión (token/email/rol). */
export abstract class SesionPort {
  abstract obtenerToken(): string | null;
  abstract obtenerEmail(): string | null;
  abstract obtenerRol(): string | null;
  abstract guardar(datos: AuthResponse): void;
  abstract limpiar(): void;
}
