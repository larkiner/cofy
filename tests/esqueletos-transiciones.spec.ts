import { expect, type Page, test } from '@playwright/test';

/**
 * Esqueletos de carga y animación entre vistas. La API se simula con una demora para poder ver el
 * esqueleto; no necesita backend ni toca la base de datos.
 *
 *   npx playwright test tests/esqueletos-transiciones.spec.ts --project=chromium
 */
test.use({ viewport: { width: 1280, height: 800 } });

const MENU = [
  { productoId: 1, nombre: 'Americano', precio: 5000 },
  { productoId: 2, nombre: 'Latte', precio: 8000 },
].map((p) => ({ ...p, descripcion: 'x', imagenUrl: null, categoriaId: 1, categoria: 'Bebidas', destacado: true }));

const SUCURSALES = [
  { id: 1, nombre: 'Cafetería Centro', direccion: 'Calle 10 # 5-23', telefono: '6012345678' },
];

/** Responde la API tras `demoraMs`; mientras tanto la vista debe mostrar su esqueleto. */
async function simularApiLenta(page: Page, demoraMs: number) {
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
    await new Promise((r) => setTimeout(r, demoraMs));
    const cuerpo = /\/api\/menu/.test(peticion.url()) ? MENU : SUCURSALES;
    await route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(cuerpo) });
  });
}

test.describe('esqueletos de carga', () => {
  test('la carta muestra su esqueleto mientras llega el menú y lo reemplaza por los productos', async ({ page }) => {
    await simularApiLenta(page, 1500);
    await page.goto('/menu');

    const esqueleto = page.locator('.carta-contenido app-esqueleto');
    await expect(esqueleto).toBeVisible();
    await expect(esqueleto.getByRole('status')).toHaveAttribute('aria-busy', 'true');
    await expect(esqueleto.getByText('Cargando la carta…')).toBeAttached();
    await expect(page.getByText('Cargando menú…')).toHaveCount(0);

    await expect(page.getByRole('heading', { level: 3, name: 'Americano' })).toBeVisible();
    await expect(esqueleto).toHaveCount(0);
  });

  test('el home muestra esqueletos en recomendaciones y sucursales hasta que responde la API', async ({ page }) => {
    await simularApiLenta(page, 1500);
    await page.goto('/');

    await expect(page.locator('#destacados, .destacados').locator('app-esqueleto')).toBeVisible();
    await expect(page.locator('#horario app-esqueleto')).toBeVisible();

    await expect(page.getByRole('article').filter({ hasText: 'Cafetería Centro' })).toBeVisible();
    await expect(page.locator('app-esqueleto')).toHaveCount(0);
  });

  test('el checkout muestra un esqueleto mientras cargan las sucursales', async ({ page }) => {
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
    // La carta no pide sucursales (el home sí, y las deja en caché): se entra por ahí.
    await page.route(/\/api\/menu(\?.*)?$/, (route) =>
      route.request().method() === 'OPTIONS'
        ? route.fulfill({ status: 204, headers: cors })
        : route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(MENU) }),
    );
    await page.route(/\/api\/sucursales(\?.*)?$/, async (route) => {
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
      await new Promise((r) => setTimeout(r, 1500));
      return route.fulfill({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify(SUCURSALES) });
    });

    await page.goto('/menu');
    await page.locator('.tarjeta .agregar').first().click();
    await page.getByRole('link', { name: /^Ver el carrito/ }).click();
    await page.getByRole('link', { name: 'Continuar con el pedido' }).click();

    await expect(page.locator('.paso app-esqueleto')).toBeVisible();
    await expect(page.getByRole('group', { name: 'Sucursal de retiro' })).toBeVisible();
    await expect(page.locator('.paso app-esqueleto')).toHaveCount(0);
  });
});

test.describe('animación entre vistas', () => {
  const animacionDeLaVista = (page: Page) =>
    page.evaluate(() => {
      const vista = document.querySelector('router-outlet + *');
      return vista ? getComputedStyle(vista).animationName : null;
    });

  test('la vista que entra se anima con un fundido (vista-entra)', async ({ page }) => {
    await simularApiLenta(page, 1);
    await page.goto('/');
    await page
      .getByRole('navigation', { name: 'Navegación principal' })
      .getByRole('link', { name: 'Carta' })
      .click();
    await expect(page).toHaveURL(/\/menu$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Carta' })).toBeVisible();

    expect(await animacionDeLaVista(page)).toBe('vista-entra');
  });

  test('con "reducir movimiento" no hay animación pero la navegación funciona', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await simularApiLenta(page, 1);
    await page.goto('/');
    await page
      .getByRole('navigation', { name: 'Navegación principal' })
      .getByRole('link', { name: 'Carta' })
      .click();
    await expect(page).toHaveURL(/\/menu$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Carta' })).toBeVisible();

    expect(await animacionDeLaVista(page)).toBe('none');
  });

  test('al terminar la animación no queda ningún transform sobre la vista', async ({ page }) => {
    await simularApiLenta(page, 1);
    await page.goto('/menu');
    await expect(page.getByRole('heading', { level: 1, name: 'Carta' })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => getComputedStyle(document.querySelector('router-outlet + *')!).transform),
      )
      .toBe('none');
  });
});
