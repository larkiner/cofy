import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './application/auth.service';
import { CarritoService } from './application/carrito.service';
import { TemaService } from './application/tema.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly carrito = inject(CarritoService);
  protected readonly tema = inject(TemaService);
  private readonly router = inject(Router);

  protected cerrarSesion(): void {
    this.auth.logout();
    this.carrito.vaciar();
    this.router.navigateByUrl('/');
  }
}
