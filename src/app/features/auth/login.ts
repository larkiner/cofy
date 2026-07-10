import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../application/auth.service';
import { rutaSegunRol } from '../../application/rutas-rol';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './auth.css',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected email = '';
  protected password = '';
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected enviar(): void {
    this.error.set(null);
    this.cargando.set(true);

    this.auth.login({ email: this.email, password: this.password }).subscribe({
      next: res => {
        this.cargando.set(false);
        this.router.navigateByUrl(rutaSegunRol(res.rol));
      },
      error: err => {
        this.cargando.set(false);
        this.error.set(err.status === 401
          ? 'Email o contraseña incorrectos'
          : 'No se pudo iniciar sesión. Intenta de nuevo.');
      },
    });
  }
}
