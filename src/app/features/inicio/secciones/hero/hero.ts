import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Hero del inicio: título de marca, una línea con la oferta y un único botón hacia la carta.
 * Es presentacional: no recibe datos ni emite eventos.
 */
@Component({
  selector: 'app-inicio-hero',
  imports: [RouterLink],
  templateUrl: './hero.html',
  styleUrl: './hero.css',
})
export class InicioHero {}
