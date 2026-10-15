import { expect, type Page, test } from '@playwright/test';

/**
 * Carrito y checkout, ahora en páginas separadas (/carrito -> /checkout). La API se simula
 * (`/api/menu`, `/api/sucursales`), así que no necesita backend ni toca la base de datos.
 * No toca pedidos reales: sin sesión "Pedir y pagar" manda al login; el caso de éxito simula también
 * `POST /pedidos`, el pago y la confirmación.
 *
 *   npx playwright test tests/carrito-checkout.spec.ts --project=chromium
 */
test.use({ viewport: { width: 1280, height: 800 } });

const MENU = [
  { productoId: 1, nombre: 'Americano', precio: 5000 },
  { productoId: 2, nombre: 'Latte', precio: 8000 },
  { productoId: 3, nombre: 'Cappuccino', precio: 7500 },
].map((p) => ({ ...p, descripcion: 'x', imagenUrl: null, categoriaId: 1, categoria: 'Bebidas', destacado: true }));

const SUCURSALES = [
  { id: 1, nombre: 'Cafetería Centro', direccion: 'Calle 10 # 5-23', telefono: '6012345678' },
  { id: 2, nombre: 'Cafetería Norte', direccion: 'Carrera 15 # 85-40', telefono: '6018765432' },
];

async function simularApi(page: Page) {
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET,OPTIONS',
  };
  await page.route(/\/api\/(menu|sucursales)(\?.*)?$/, async (route) => {
    const peticion = route.request();
    if (peticion.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    const cuerpo = /\/api\/menu/.test(peticion.url()) ? MENU : SUCURSALES;
    await route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(cuerpo) });
  });
}

async function llenarCarrito(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Agregar Americano al carrito' }).click();
  await page.getByRole('button', { name: 'Agregar Latte al carrito' }).click();
  await page.getByRole('link', { name: /^Ver el carrito/ }).click();
  await expect(page).toHaveURL(/\/carrito$/);
}

test.beforeEach(async ({ page }) => {
  await simularApi(page);
});

test.describe('carrito', () => {
  test('solo revisa las líneas y el total: la sucursal y el pago ya no están aquí', async ({ page }) => {
    await llenarCarrito(page);

    await expect(page.locator('.linea')).toHaveCount(2);
    await expect(page.locator('.total strong')).toHaveText(/^\$\s?13\.000$/);
    await expect(page.getByRole('group', { name: 'Sucursal de retiro' })).toHaveCount(0);
    await expect(page.getByRole('group', { name: 'Método de pago' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Pedir y pagar' })).toHaveCount(0);
  });

  test('en móvil, con tres líneas, "Continuar con el pedido" queda a la vista sin hacer scroll', async ({
    page,
  }) => {
    // Pantalla baja a propósito: sin barra fija, el resumen quedaría bajo el pliegue.
    await page.setViewportSize({ width: 390, height: 640 });
    await page.goto('/menu');
    for (let i = 0; i < 3; i++) await page.locator('.tarjeta .agregar').nth(i).click();
    await page.getByRole('link', { name: /^Ver el carrito/ }).click();
    await expect(page.locator('.linea')).toHaveCount(3);

    // Se mide con la página arriba del todo (el router vuelve al inicio al navegar): sin desplazarse.
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    const continuar = page.getByRole('link', { name: 'Continuar con el pedido' });
    await expect(continuar).toHaveCount(1);
    const caja = (await continuar.boundingBox())!;
    expect(caja.y).toBeGreaterThanOrEqual(0);
    expect(caja.y + caja.height).toBeLessThanOrEqual(640);
    expect(caja.height).toBeGreaterThanOrEqual(44);
    await expect(page.locator('.resumen')).toHaveCSS('position', 'sticky');
    await expect(page.getByRole('button', { name: 'Quitar Latte del carrito' })).toBeVisible();
    const quitar = (await page.getByRole('button', { name: 'Quitar Latte del carrito' }).boundingBox())!;
    expect(quitar.width).toBeCloseTo(44, 0);
    expect(quitar.height).toBeCloseTo(44, 0);
  });

  test('"Continuar con el pedido" lleva al checkout conservando el carrito', async ({ page }) => {
    await llenarCarrito(page);

    await page.getByRole('link', { name: 'Continuar con el pedido' }).click();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Finalizar pedido' })).toBeVisible();
    await expect(page.locator('.resumen-lineas li')).toHaveCount(2);
    await expect(page.locator('.total strong')).toHaveText(/^\$\s?13\.000$/);
  });
});

test.describe('checkout', () => {
  test('pide la sucursal de retiro y el método de pago, y deja volver al carrito', async ({ page }) => {
    await llenarCarrito(page);
    await page.getByRole('link', { name: 'Continuar con el pedido' }).click();

    const sucursal = page.getByRole('group', { name: 'Sucursal de retiro' });
    await expect(sucursal).toBeVisible();
    await expect(sucursal.getByRole('radio')).toHaveCount(2);
    await expect(sucursal.getByRole('radio').first()).toBeChecked();
    // La dirección completa va a la vista, sin truncar.
    await expect(sucursal.getByText('Carrera 15 # 85-40')).toBeVisible();
    await expect(page.getByRole('group', { name: 'Método de pago' })).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Tarjeta' })).toBeChecked();

    await page.getByRole('link', { name: 'Volver al carrito' }).click();
    await expect(page).toHaveURL(/\/carrito$/);
    await expect(page.locator('.linea')).toHaveCount(2);
  });

  test('sin sesión avisa que hay que iniciar sesión y "Pedir y pagar" lleva al login', async ({ page }) => {
    await llenarCarrito(page);
    await page.getByRole('link', { name: 'Continuar con el pedido' }).click();

    // El aviso va arriba de los pasos, con su acción.
    const aviso = page.getByText('Debes iniciar sesión para completar el pedido.');
    await expect(aviso).toBeVisible();
    const cajaAviso = (await aviso.boundingBox())!;
    const cajaPaso = (await page.locator('.paso').first().boundingBox())!;
    expect(cajaAviso.y).toBeLessThan(cajaPaso.y);
    await expect(page.getByRole('link', { name: 'Iniciar sesión' }).last()).toHaveAttribute('href', '/login');
    await page.getByRole('button', { name: 'Pedir y pagar' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('con el carrito vacío (o al recargar) vuelve al carrito', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/carrito$/);
    await expect(page.getByText('El carrito está vacío.')).toBeVisible();
  });

  test('en móvil el resumen queda bajo los pasos y sin desbordar', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await llenarCarrito(page);
    await page.getByRole('link', { name: 'Continuar con el pedido' }).click();

    const paso = await page.locator('.paso').last().boundingBox();
    const resumen = await page.locator('.resumen').boundingBox();
    expect(resumen!.y).toBeGreaterThan(paso!.y + paso!.height - 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});

test.describe('éxito del pedido (todo simulado: no sale nada a la API)', () => {
  const PEDIDO_PAGADO = {
    pedidoId: 10490,
    clienteId: 1,
    codigoRetiro: 'RET-5HN8QD2W',
    fechaPedido: '2026-10-14T10:00:00',
    fechaEntrega: null,
    estado: 'PAGADO',
    total: 13000,
    sucursalNombre: 'Cafetería Centro',
    sucursalDireccion: 'Calle 10 # 5-23',
  };

  test('muestra el tiquete con su código, el seguimiento y el estado legible', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('cafeteria_token', 'token-de-prueba');
      localStorage.setItem('cafeteria_email', 'cliente@ejemplo.com');
      localStorage.setItem('cafeteria_rol', 'CLIENTE');
    });
    const cors = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
    };
    const solicitudes: string[] = [];
    await page.route(/\/api\/pedidos(\/.*)?$/, async (route) => {
      const peticion = route.request();
      if (peticion.method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: cors });
        return;
      }
      const ruta = new URL(peticion.url()).pathname;
      solicitudes.push(`${peticion.method()} ${ruta}`);
      const cuerpo = /\/pago\/confirmar$/.test(ruta)
        ? PEDIDO_PAGADO
        : /\/pago$/.test(ruta)
          ? {}
          : { pedidoId: 10490, total: 13000, estado: 'PENDIENTE_PAGO' };
      await route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(cuerpo) });
    });

    await llenarCarrito(page);
    await page.getByRole('link', { name: 'Continuar con el pedido' }).click();
    await expect(page.getByText('Debes iniciar sesión para completar el pedido.')).toHaveCount(0);
    await page.getByRole('radio', { name: 'Nequi' }).check();
    await expect(page.getByRole('radio', { name: 'Nequi' })).toBeChecked();
    await page.getByRole('button', { name: 'Pedir y pagar' }).click();

    await expect(page.getByRole('heading', { level: 1, name: /Pedido confirmado/ })).toBeVisible();
    const tiquete = page.getByRole('group', { name: 'Código de retiro RET-5HN8QD2W' });
    await expect(tiquete).toBeVisible();
    await expect(tiquete).toHaveText('RET-5HN8QD2W');
    await expect(page.getByRole('list', { name: 'Seguimiento del pedido' })).toBeVisible();
    await expect(page.locator('[aria-current="step"]')).toHaveText(/Pagado/);
    // Estado legible, nunca el valor crudo de la API.
    await expect(page.getByText(/Estado: Pagado/)).toBeVisible();
    await expect(page.getByText('PAGADO', { exact: true })).toHaveCount(0);
    await expect(page.getByText(/^\$\s?13\.000$/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ver mis pedidos' })).toHaveAttribute('href', '/mis-pedidos');
    await expect(page.getByRole('link', { name: 'Volver a la carta' })).toHaveAttribute('href', '/menu');
    expect(solicitudes).toEqual([
      'POST /api/pedidos',
      'POST /api/pedidos/10490/pago',
      'POST /api/pedidos/10490/pago/confirmar',
    ]);
  });
});

test.describe('responsive: sin desborde horizontal en pantallas angostas', () => {
  for (const ancho of [280, 320, 360, 414]) {
    test(`carrito y checkout caben en ${ancho}px`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 800 });
      await page.goto('/menu');
      await page.locator('.tarjeta .agregar').first().click();
      await page.getByRole('link', { name: /^Ver el carrito/ }).click();
      await expect(page.locator('.linea')).toHaveCount(1);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(ancho);

      await page.getByRole('link', { name: 'Continuar con el pedido' }).click();
      await expect(page.getByRole('group', { name: 'Sucursal de retiro' })).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(ancho);
    });
  }
});
