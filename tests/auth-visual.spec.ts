import { expect, type Page, test } from '@playwright/test';

/**
 * Inicio de sesión y registro (fase 7 del plan visual del cliente), en 390×844 con puntero táctil.
 *
 * La API está simulada: ninguna petición llega al backend ni se usan credenciales reales. El
 * registro con campos vacíos se rechaza en el cliente (no llama a la API); el caso de login
 * simula una respuesta 401.
 *
 *   npx playwright test tests/auth-visual.spec.ts --project=chromium
 */
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

/** Responde a todo `/api/` con un 401 de prueba y devuelve la lista de peticiones recibidas. */
async function simularApi(page: Page): Promise<string[]> {
  const peticiones: string[] = [];
  await page.route('**/api/**', async (route) => {
    const peticion = route.request();
    if (peticion.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'access-control-allow-methods': 'GET,POST,OPTIONS',
        },
      });
      return;
    }
    peticiones.push(`${peticion.method()} ${new URL(peticion.url()).pathname}`);
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ message: 'Credenciales de prueba rechazadas.' }),
    });
  });
  return peticiones;
}

async function comprobarFormularioTactil(page: Page) {
  // Botón de envío con objetivo táctil de 44 px o más.
  const envio = page.locator('form button[type="submit"]');
  const caja = await envio.boundingBox();
  expect(caja!.height).toBeGreaterThanOrEqual(43.9);

  // Campos a 16 px: así iOS no hace zoom al enfocar.
  const tamanos = await page
    .locator('form input')
    .evaluateAll((campos) => campos.map((c) => getComputedStyle(c).fontSize));
  expect(tamanos.length).toBeGreaterThan(1);
  for (const tamano of tamanos) expect(tamano).toBe('16px');

  // Botón de ojo con objetivo de 44 px y estado accesible.
  const ojo = page.getByRole('button', { name: 'Mostrar contraseña' });
  const cajaOjo = await ojo.boundingBox();
  expect(cajaOjo!.width).toBeGreaterThanOrEqual(43.9);
  expect(cajaOjo!.height).toBeGreaterThanOrEqual(43.9);
  await expect(ojo).toHaveAttribute('aria-pressed', 'false');

  // Sin desborde horizontal.
  const desborde = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(desborde).toBeLessThanOrEqual(0);

  // El panel de la foto no lleva etiquetas en mayúsculas (sin "eyebrow").
  await expect(page.locator('.auth-media .eyebrow')).toHaveCount(0);
}

test.describe('Login y registro en móvil', () => {
  test('registro: objetivos táctiles, campos a 16 px y error anunciado con role="alert"', async ({
    page,
  }) => {
    const peticiones = await simularApi(page);
    await page.goto('/registro');
    await expect(page.getByRole('heading', { level: 1, name: 'Crear cuenta' })).toBeVisible();

    await comprobarFormularioTactil(page);
    await expect(page.getByLabel('Correo electrónico')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Iniciar sesión' }).last()).toHaveAttribute(
      'href',
      '/login',
    );

    // Formulario vacío: el cliente lo rechaza y lo anuncia sin llamar a la API.
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    const alerta = page.getByRole('alert');
    await expect(alerta).toBeVisible();
    await expect(alerta).toContainText('El teléfono es obligatorio');
    expect(peticiones).toEqual([]);
  });

  test('login: textos unificados, objetivos táctiles y error del servidor con role="alert"', async ({
    page,
  }) => {
    const peticiones = await simularApi(page);
    await page.goto('/login');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await comprobarFormularioTactil(page);
    await expect(page.getByLabel('Correo electrónico')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Crear cuenta' }).last()).toHaveAttribute(
      'href',
      '/registro',
    );

    // Alternar la visibilidad de la contraseña actualiza `aria-pressed` y el tipo del campo.
    await page.getByRole('button', { name: 'Mostrar contraseña' }).click();
    await expect(page.getByRole('button', { name: 'Ocultar contraseña' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('input[name="password"]')).toHaveAttribute('type', 'text');

    // Credenciales inventadas contra la API simulada (responde 401).
    await page.getByLabel('Correo electrónico').fill('prueba@ejemplo.test');
    await page.locator('input[name="password"]').fill('clave-de-prueba');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();
    const alerta = page.getByRole('alert');
    await expect(alerta).toBeVisible();
    await expect(alerta).toContainText('Credenciales de prueba rechazadas.');
    expect(peticiones).toEqual(['POST /api/auth/login']);
  });
});
