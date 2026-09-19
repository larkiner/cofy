// ---------- Perfil del cliente ----------

/** Datos del cliente autenticado (vista VW_CLIENTE_PERFIL, sin password). */
export interface ClientePerfil {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  fechaRegistro: string;
  estado: string;
}

/** Campos que el cliente puede modificar de su propio perfil. */
export interface ActualizarClienteRequest {
  nombre: string;
  telefono: string;
}
