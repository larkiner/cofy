/** Minutos que lleva esperando un pedido (nunca negativo, aunque el reloj difiera un poco). */
export function minutosEspera(fechaPedido: string, ahora: number): number {
  const minutos = Math.floor((ahora - new Date(fechaPedido).getTime()) / 60_000);
  return Number.isFinite(minutos) ? Math.max(0, minutos) : 0;
}

/** "recién", "hace 7 min" o "hace 1 h 5 min". */
export function textoEspera(fechaPedido: string, ahora: number): string {
  const minutos = minutosEspera(fechaPedido, ahora);
  if (minutos < 1) return 'recién';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `hace ${horas} h` : `hace ${horas} h ${resto} min`;
}
