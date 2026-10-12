import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../application/auth.service';
import { rutaSegunRol } from '../../../application/rutas-rol';
import { AlternarPassword } from '../../../shared/ui/alternar-password/alternar-password';

@Component({
  selector: 'app-registro',
  imports: [FormsModule, RouterLink, AlternarPassword],
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
  protected readonly verPassword = signal(false);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected enviar(): void {
    this.error.set(null);

    const telefono = this.telefono.trim();
    if (!/^\d{10}$/.test(telefono)) {
      this.error.set('El teléfono es obligatorio y debe tener exactamente 10 dígitos.');
      return;
    }

    // Mismo rango que el backend (`RegistroRequest`: @Size min 8, max 72).
    if (this.password.length < 8 || this.password.length > 72) {
      this.error.set('La contraseña debe tener entre 8 y 72 caracteres.');
      return;
    }

    this.cargando.set(true);

    this.auth.registrar({
      nombre: this.nombre,
      email: this.email,
      telefono,
      password: this.password,
    }).subscribe({
      next: res => {
        this.cargando.set(false);
        this.router.navigateByUrl(rutaSegunRol(res.rol));
      },
      error: err => {
        this.cargando.set(false);
        this.error.set(err.mensaje ?? 'No se pudo completar el registro. Revisa los datos.');
      },
    });
  }
}
