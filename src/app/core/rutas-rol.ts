/** A dónde redirigir después de iniciar sesión, según el rol del JWT. */
export function rutaSegunRol(rol: string): string {
  return rol === 'CLIENTE' ? '/' : '/interno';
}
