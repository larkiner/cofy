import { expect, type Page, test } from '@playwright/test';

/**
 * Home y carrito modernizados. La API se simula (`/api/menu` y `/api/sucursales`),
 * así que no necesita backend ni toca la base de datos.
 *
 *   npx playwright test tests/home-carrito.spec.ts --project=chromium
 */
test.use({ viewport: { width: 1280, height: 800 } });

const MENU = [
  { productoId: 1, nombre: 'Americano', precio: 5000 },
  { productoId: 2, nombre: 'Latte', precio: 8000 },
  { productoId: 3, nombre: 'Cappuccino', precio: 7500 },
].map((p) => ({ ...p, descripcion: 'x', imagenUrl: null, categoriaId: 1, categoria: 'Bebidas', destacado: true }));

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
    const cuerpo = /\/api\/menu/.test(peticion.url())
      ? MENU
      : [{ id: 1, nombre: 'Cafetería Centro', direccion: 'Calle 10 # 5-23', telefono: '6012345678' }];
    await route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(cuerpo) });
  });
}

test.beforeEach(async ({ page }) => {
  await simularApi(page);
});

test('el home muestra los datos de confianza y el CTA principal', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Explorar el men/ })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Por qué La aravica' }).getByRole('listitem')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Agregar Americano al carrito' })).toBeVisible();
});

test('el carrito vacío ofrece volver a la carta', async ({ page }) => {
  await page.goto('/carrito');
  await expect(page.getByText('El carrito está vacío.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explorar la carta' })).toHaveAttribute('href', '/menu');
});

test('agregar, cambiar cantidad y quitar productos actualiza el resumen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Agregar Americano al carrito' }).click();
  await page.getByRole('button', { name: 'Agregar Latte al carrito' }).click();
  await page.getByRole('link', { name: /^Ver el carrito/ }).click();

  await expect(page.getByRole('heading', { name: 'Tu carrito' })).toBeVisible();
  await expect(page.locator('.linea')).toHaveCount(2);
  await expect(page.locator('.total strong')).toHaveText('$13,000');

  await page.getByRole('button', { name: 'Agregar una unidad de Americano' }).click();
  await expect(page.locator('.total strong')).toHaveText('$18,000');

  await page.getByRole('button', { name: 'Quitar Latte del carrito' }).click();
  await expect(page.locator('.linea')).toHaveCount(1);
  await expect(page.locator('.total strong')).toHaveText('$10,000');

  await page.getByRole('button', { name: 'Quitar Americano del carrito' }).click();
  await expect(page.getByText('El carrito está vacío.')).toBeVisible();
});

test('en móvil el resumen queda bajo las líneas y sin desbordar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Agregar Americano al carrito' }).click();
  await page.getByRole('link', { name: /^Ver el carrito/ }).click();
  const linea = await page.locator('.linea').boundingBox();
  const resumen = await page.locator('.resumen').boundingBox();
  expect(resumen!.y).toBeGreaterThan(linea!.y + linea!.height - 1);
  const desborda = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(desborda).toBe(false);
});

test.describe('aviso al agregar', () => {
  test('aparece con el producto y el conteo, y lleva al carrito', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Agregar Americano al carrito' }).click();

    const aviso = page.locator('.aviso');
    await expect(aviso).toContainText('Americano agregado al carrito');
    await expect(aviso).toContainText('Llevas 1 producto en el carrito.');
    await expect(page.getByRole('status').filter({ hasText: 'Americano agregado' })).toHaveCount(1);

    await aviso.getByRole('link', { name: /Ver carrito/ }).click();
    await expect(page).toHaveURL(/\/carrito$/);
    await expect(page.locator('.aviso')).toHaveCount(0);
  });

  test('se cierra solo a los 4 segundos', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await page.getByRole('button', { name: 'Agregar Latte al carrito' }).click();
    await expect(page.locator('.aviso')).toBeVisible();
    await page.clock.fastForward(4500);
    await expect(page.locator('.aviso')).toHaveCount(0);
  });

  test('se pausa con el mouse encima y sigue al salir', async ({ page }) => {
    await page.clock.install();
    await page.goto('/');
    await page.getByRole('button', { name: 'Agregar Latte al carrito' }).click();
    await page.locator('.aviso').hover();
    await page.clock.fastForward(6000);
    await expect(page.locator('.aviso')).toBeVisible();
    await page.mouse.move(0, 0);
    await page.clock.fastForward(4500);
    await expect(page.locator('.aviso')).toHaveCount(0);
  });

  test('un aviso nuevo reemplaza al anterior y se puede cerrar a mano', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Agregar Americano al carrito' }).click();
    await page.getByRole('button', { name: 'Agregar Latte al carrito' }).click();
    await expect(page.locator('.aviso')).toHaveCount(1);
    await expect(page.locator('.aviso')).toContainText('Llevas 2 productos');

    await page.getByRole('button', { name: 'Cerrar aviso' }).click();
    await expect(page.locator('.aviso')).toHaveCount(0);
  });

  test('Escape con el foco dentro del aviso lo cierra', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Agregar Latte al carrito' }).click();
    await page.getByRole('button', { name: 'Cerrar aviso' }).focus();
    await page.keyboard.press('Escape');
    await expect(page.locator('.aviso')).toHaveCount(0);
  });

  test('también avisa al agregar desde la carta', async ({ page }) => {
    await page.goto('/menu');
    await page.locator('.tarjeta .agregar').first().click();
    await expect(page.locator('.aviso')).toContainText('agregado al carrito');
  });

  test('en móvil ocupa casi todo el ancho y no desborda', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByRole('button', { name: 'Agregar Americano al carrito' }).click();
    const caja = await page.locator('.aviso').boundingBox();
    expect(caja!.width).toBeGreaterThan(340);
    const desborda = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(desborda).toBe(false);
  });
});
