// ---------- Autenticación ----------

export interface RegistroRequest {
  nombre: string;
  email: string;
  telefono?: string;
  password: string;
  sucursalId?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  email: string;
  rol: string; // CLIENTE | BARISTA | CAJERO | SUPERVISOR | ADMIN
}
