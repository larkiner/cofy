import { Component, input } from '@angular/core';
import { Sucursal } from '../../../../domain/menu/menu.model';
import { Icono } from '../../../../shared/ui/icono/icono';

interface FilaHorario {
  dia: string;
  horas: string;
}

/**
 * Sucursales y horario (#horario): una columna por sucursal real (API) más
 * la tabla de horario fija. `null` en `sucursales` significa "cargando": la
 * sección y su ancla existen siempre; solo el grid espera los datos.
 */
@Component({
  selector: 'app-inicio-sucursales',
  imports: [Icono],
  templateUrl: './sucursales.html',
  styleUrl: './sucursales.css',
})
export class InicioSucursales {
  readonly sucursales = input.required<Sucursal[] | null>();

  protected readonly horario: FilaHorario[] = [
    { dia: 'Lunes – viernes', horas: '6:30 am – 8:00 pm' },
    { dia: 'Sábados', horas: '7:00 am – 8:00 pm' },
    { dia: 'Domingos', horas: '8:00 am – 2:00 pm' },
  ];

  protected enlaceMapa(s: Sucursal): string {
    const consulta = encodeURIComponent(`${s.nombre}, ${s.direccion}, Medellín`);
    return `https://www.google.com/maps/search/?api=1&query=${consulta}`;
  }

  protected etiquetaMapa(s: Sucursal): string {
    return `Cómo llegar a ${s.nombre} (se abre en una pestaña nueva)`;
  }

  protected telefonoHref(telefono: string): string {
    return `tel:${telefono.replace(/[^\d+]/g, '')}`;
  }

  /** Formatea el teléfono en grupos de lectura ("601 234 5678"), sin
   *  tocar el href (que siempre va sin espacios, ver telefonoHref). */
  protected formatearTelefono(telefono: string): string {
    const digitos = telefono.replace(/\D/g, '');
    if (digitos.length === 10) {
      return `${digitos.slice(0, 3)} ${digitos.slice(3, 6)} ${digitos.slice(6)}`;
    }
    if (digitos.length === 7) {
      return `${digitos.slice(0, 3)} ${digitos.slice(3)}`;
    }
    // Formato no reconocido: agrupa de a 3 dígitos desde la izquierda.
    return digitos.replace(/(\d{3})(?=\d)/g, '$1 ');
  }
}
