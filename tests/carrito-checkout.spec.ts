import { expect, type Page, test } from '@playwright/test';

/**
 * Carrito y checkout, ahora en páginas separadas (/carrito -> /checkout). La API se simula
 * (`/api/menu`, `/api/sucursales`), así que no necesita backend ni toca la base de datos.
 * No hace ningún pago: llega hasta el botón "Pedir y pagar" sin sesión, que manda al login.
 *
 *   npx playwright test tests/carrito-checkout.spec.ts --project=chromium
 */
test.use({ viewport: { width: 1280, height: 800 } });

const MENU = [
  { productoId: 1, nombre: 'Americano', precio: 5000 },
  { productoId: 2, nombre: 'Latte', precio: 8000 },
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
    await expect(page.locator('.total strong')).toHaveText('$13,000');
    await expect(page.getByLabel('Sucursal de retiro')).toHaveCount(0);
    await expect(page.getByLabel('Método de pago')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Pedir y pagar' })).toHaveCount(0);
  });

  test('"Continuar con el pedido" lleva al checkout conservando el carrito', async ({ page }) => {
    await llenarCarrito(page);

    await page.getByRole('link', { name: 'Continuar con el pedido' }).click();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Finalizar pedido' })).toBeVisible();
    await expect(page.locator('.resumen-lineas li')).toHaveCount(2);
    await expect(page.locator('.total strong')).toHaveText('$13,000');
  });
});

test.describe('checkout', () => {
  test('pide la sucursal de retiro y el método de pago, y deja volver al carrito', async ({ page }) => {
    await llenarCarrito(page);
    await page.getByRole('link', { name: 'Continuar con el pedido' }).click();

    const sucursal = page.getByLabel('Sucursal de retiro');
    await expect(sucursal).toBeVisible();
    await expect(sucursal.locator('option')).toHaveCount(2);
    await expect(page.getByLabel('Método de pago')).toHaveValue(/TARJETA/);

    await page.getByRole('link', { name: 'Volver al carrito' }).click();
    await expect(page).toHaveURL(/\/carrito$/);
    await expect(page.locator('.linea')).toHaveCount(2);
  });

  test('sin sesión avisa que hay que iniciar sesión y "Pedir y pagar" lleva al login', async ({ page }) => {
    await llenarCarrito(page);
    await page.getByRole('link', { name: 'Continuar con el pedido' }).click();

    await expect(page.getByText('Debes iniciar sesión para completar el pedido.')).toBeVisible();
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
      await expect(page.getByLabel('Sucursal de retiro')).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(ancho);
    });
  }
});
