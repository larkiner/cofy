import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../application/auth.service';
import { rutaSegunRol } from '../../../application/rutas-rol';

@Component({
  selector: 'app-registro',
  imports: [FormsModule, RouterLink],
  templateUrl: './registro.html',
  styleUrl: '../auth.css',
})
export class Registro {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected nombre = '';
  protected email = '';
  protected telefono = '';
  protected password = '';
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected enviar(): void {
    this.error.set(null);
    this.cargando.set(true);

    this.auth.registrar({
      nombre: this.nombre,
      email: this.email,
      telefono: this.telefono || undefined,
      password: this.password,
    }).subscribe({
      next: res => {
        this.cargando.set(false);
        this.router.navigateByUrl(rutaSegunRol(res.rol));
      },
      error: err => {
        this.cargando.set(false);
        this.error.set(err.status === 409
          ? 'Ya existe una cuenta con ese email'
          : 'No se pudo completar el registro. Revisa los datos.');
      },
    });
  }
}
