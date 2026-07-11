import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../application/auth.service';
import { InternoService } from '../../application/interno.service';
import { TrabajadorPerfil, Turno } from '../../domain/interno/interno.model';

@Component({
  selector: 'app-turnos',
  imports: [DatePipe, FormsModule],
  templateUrl: './turnos.html',
  styleUrl: './interno.css',
})
export class Turnos {
  private readonly interno = inject(InternoService);
  private readonly auth = inject(AuthService);

  protected readonly esSupervisorOAdmin = computed(() =>
    ['SUPERVISOR', 'ADMIN'].includes(this.auth.rol() ?? ''));

  protected readonly misTurnos = signal<Turno[]>([]);
  protected readonly trabajadores = signal<TrabajadorPerfil[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly mensaje = signal<string | null>(null);

  // ---- form de asignación (solo supervisor/admin) ----
  protected trabajadorId: number | null = null;
  protected fecha = '';
  protected horaInicio = '';
  protected horaFin = '';

  constructor() {
    this.cargarMisTurnos();
    if (this.esSupervisorOAdmin()) {
      this.interno.trabajadores().subscribe({
        next: lista => this.trabajadores.set(lista),
      });
    }
  }

  private cargarMisTurnos(): void {
    this.interno.misTurnos().subscribe({
      next: turnos => this.misTurnos.set(turnos),
      error: () => this.error.set('No se pudieron cargar tus turnos.'),
    });
  }

  protected asignar(): void {
    if (this.trabajadorId === null || !this.fecha || !this.horaInicio || !this.horaFin) return;
    this.error.set(null);
    this.mensaje.set(null);

    this.interno.crearTurno({
      trabajadorId: this.trabajadorId,
      fecha: this.fecha,
      horaInicio: `${this.fecha}T${this.horaInicio}:00`,
      horaFin: `${this.fecha}T${this.horaFin}:00`,
    }).subscribe({
      next: () => {
        this.mensaje.set('Turno asignado.');
        this.cargarMisTurnos(); // por si el turno era para uno mismo
      },
      error: err => this.error.set(err.status === 400
        ? 'Datos inválidos (revisa que la hora de fin sea posterior a la de inicio).'
        : 'No se pudo asignar el turno.'),
    });
  }
}
