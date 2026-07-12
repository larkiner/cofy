import { Injectable, effect, signal } from '@angular/core';

const TEMA_KEY = 'cafeteria_tema';

/**
 * Modo oscuro/claro: estado en memoria (signal), persistido en localStorage
 * y aplicado como clase .dark en <html> para que la respeten tanto las
 * variables CSS (styles.css) como las utilidades dark: de Tailwind.
 */
@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly oscuroSignal = signal<boolean>(this.temaInicial());

  readonly oscuro = this.oscuroSignal.asReadonly();

  constructor() {
    effect(() => {
      document.documentElement.classList.toggle('dark', this.oscuroSignal());
    });
  }

  alternar(): void {
    const nuevo = !this.oscuroSignal();
    this.oscuroSignal.set(nuevo);
    localStorage.setItem(TEMA_KEY, nuevo ? 'oscuro' : 'claro');
  }

  private temaInicial(): boolean {
    const guardado = localStorage.getItem(TEMA_KEY);
    if (guardado) {
      return guardado === 'oscuro';
    }
    return typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}
