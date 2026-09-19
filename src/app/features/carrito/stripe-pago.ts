import { Component, ElementRef, afterNextRender, input, output, signal, viewChild } from '@angular/core';
import { loadStripe, StripeElements, StripePaymentElement } from '@stripe/stripe-js';
import { environment } from '../../../environments/environment';

/** Payment Element: los datos de tarjeta viajan directo a Stripe, no al API. */
@Component({
  selector: 'app-stripe-pago',
  templateUrl: './stripe-pago.html',
  styleUrl: './carrito.css',
})
export class StripePago {
  readonly clientSecret = input.required<string>();
  readonly completado = output<void>();
  readonly cancelado = output<void>();

  private readonly contenedor = viewChild.required<ElementRef<HTMLDivElement>>('paymentElement');
  private elements: StripeElements | null = null;
  private paymentElement: StripePaymentElement | null = null;

  protected readonly cargando = signal(true);
  protected readonly confirmando = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    afterNextRender(() => void this.montar());
  }

  async confirmar(evento: SubmitEvent): Promise<void> {
    evento.preventDefault();
    if (!this.elements) return;

    this.confirmando.set(true);
    this.error.set(null);
    const stripe = await loadStripe(environment.stripePublishableKey);
    if (!stripe) {
      this.error.set('No fue posible cargar el pago seguro.');
      this.confirmando.set(false);
      return;
    }
    const resultado = await stripe.confirmPayment({
      elements: this.elements,
      confirmParams: { return_url: `${window.location.origin}/mis-pedidos` },
      redirect: 'if_required',
    });
    this.confirmando.set(false);
    if (resultado.error) {
      this.error.set(resultado.error.message ?? 'El pago no pudo ser confirmado.');
      return;
    }
    if (resultado.paymentIntent?.status === 'succeeded' || resultado.paymentIntent?.status === 'processing') {
      this.completado.emit();
    }
  }

  protected cancelar(): void {
    this.cancelado.emit();
  }

  private async montar(): Promise<void> {
    if (!environment.stripePublishableKey) {
      this.error.set('Los pagos con tarjeta no están configurados en este entorno.');
      this.cargando.set(false);
      return;
    }
    const stripe = await loadStripe(environment.stripePublishableKey);
    if (!stripe) {
      this.error.set('No fue posible cargar Stripe. Intenta de nuevo.');
      this.cargando.set(false);
      return;
    }
    this.elements = stripe.elements({ clientSecret: this.clientSecret() });
    this.paymentElement = this.elements.create('payment', { layout: 'tabs' });
    this.paymentElement.mount(this.contenedor().nativeElement);
    this.cargando.set(false);
  }
}
