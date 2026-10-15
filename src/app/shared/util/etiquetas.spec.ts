import {
  ETIQUETA_ESTADO,
  ETIQUETA_METODO,
  ETIQUETA_ROL,
  etiquetaEstado,
  etiquetaMetodo,
  etiquetaRol,
} from './etiquetas';

describe('etiquetas', () => {
  it('traduce los seis estados de pedido a texto legible', () => {
    expect(etiquetaEstado('PAGADO')).toBe('Pagado');
    expect(etiquetaEstado('EN_PREPARACION')).toBe('En preparación');
    expect(etiquetaEstado('LISTO')).toBe('Listo');
    expect(etiquetaEstado('ENTREGADO')).toBe('Entregado');
    expect(etiquetaEstado('PENDIENTE_PAGO')).toBe('Pendiente de pago');
    expect(etiquetaEstado('CANCELADO')).toBe('Cancelado');
    expect(Object.keys(ETIQUETA_ESTADO)).toHaveLength(6);
  });

  it('traduce los cinco roles, incluido CLIENTE', () => {
    expect(etiquetaRol('CLIENTE')).toBe('Cliente');
    expect(etiquetaRol('BARISTA')).toBe('Barista');
    expect(etiquetaRol('CAJERO')).toBe('Cajero');
    expect(etiquetaRol('SUPERVISOR')).toBe('Supervisor');
    expect(etiquetaRol('ADMIN')).toBe('Administrador');
    expect(Object.keys(ETIQUETA_ROL)).toHaveLength(5);
  });

  it('traduce los métodos de pago', () => {
    expect(etiquetaMetodo('TARJETA')).toBe('Tarjeta');
    expect(etiquetaMetodo('PSE')).toBe('PSE');
    expect(Object.keys(ETIQUETA_METODO)).toHaveLength(5);
  });

  it('devuelve el valor crudo cuando no hay etiqueta', () => {
    expect(etiquetaEstado('DESCONOCIDO')).toBe('DESCONOCIDO');
    expect(etiquetaRol('OTRO')).toBe('OTRO');
    expect(etiquetaMetodo('CHEQUE')).toBe('CHEQUE');
  });
});
