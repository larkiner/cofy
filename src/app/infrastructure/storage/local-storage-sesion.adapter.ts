import { Injectable } from '@angular/core';
import { AuthResponse } from '../../domain/auth/auth.model';
import { SesionPort } from '../../domain/auth/sesion.port';

const TOKEN_KEY = 'cafeteria_token';
const EMAIL_KEY = 'cafeteria_email';
const ROL_KEY = 'cafeteria_rol';

/** Adaptador: persiste la sesión en localStorage. */
@Injectable()
export class LocalStorageSesionAdapter extends SesionPort {
  obtenerToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  obtenerEmail(): string | null {
    return localStorage.getItem(EMAIL_KEY);
  }

  obtenerRol(): string | null {
    return localStorage.getItem(ROL_KEY);
  }

  guardar(datos: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, datos.token);
    localStorage.setItem(EMAIL_KEY, datos.email);
    localStorage.setItem(ROL_KEY, datos.rol);
  }

  limpiar(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EMAIL_KEY);
    localStorage.removeItem(ROL_KEY);
  }

  alCambiarEnOtraPestana(callback: () => void): () => void {
    // El evento `storage` solo se dispara en las DEMÁS pestañas, nunca en la que escribió.
    const escuchar = (evento: StorageEvent) => {
      // `key === null` = otra pestaña hizo localStorage.clear().
      if (evento.key === null || evento.key === TOKEN_KEY) {
        callback();
      }
    };
    window.addEventListener('storage', escuchar);
    return () => window.removeEventListener('storage', escuchar);
  }
}
