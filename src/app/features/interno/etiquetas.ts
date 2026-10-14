/**
 * Etiquetas legibles para los valores crudos que devuelve la API en el panel
 * interno. Solo cambian lo que se muestra: los valores enviados a la API son
 * siempre los originales.
 */

export const ETIQUETA_ESTADO: Record<string, string> = {
  PAGADO: 'Pagado',
  EN_PREPARACION: 'En preparación',
  LISTO: 'Listo',
  ENTREGADO: 'Entregado',
  PENDIENTE_PAGO: 'Pendiente de pago',
  CANCELADO: 'Cancelado',
};

export const ETIQUETA_ROL: Record<string, string> = {
  BARISTA: 'Barista',
  CAJERO: 'Cajero',
  SUPERVISOR: 'Supervisor',
  ADMIN: 'Administrador',
};

export const ETIQUETA_METODO: Record<string, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  NEQUI: 'Nequi',
  DAVIPLATA: 'Daviplata',
  PSE: 'PSE',
};

export function etiquetaEstado(estado: string): string {
  return ETIQUETA_ESTADO[estado] ?? estado;
}

export function etiquetaRol(rol: string): string {
  return ETIQUETA_ROL[rol] ?? rol;
}

export function etiquetaMetodo(metodo: string): string {
  return ETIQUETA_METODO[metodo] ?? metodo;
}
