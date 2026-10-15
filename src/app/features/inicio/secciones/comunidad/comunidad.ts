import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Banda de la comunidad (programa de Granos): invita a crear una cuenta. El inicio la muestra
 * solo sin sesión iniciada. Es presentacional.
 */
@Component({
  selector: 'app-inicio-comunidad',
  imports: [RouterLink],
  templateUrl: './comunidad.html',
  styleUrl: './comunidad.css',
})
export class InicioComunidad {}
