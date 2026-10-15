import { expect, type Page, test } from '@playwright/test';

/**
 * «Mis pedidos» y «Mi cuenta» (perfil) del cliente. Todo simulado: la sesión de cliente va en
 * localStorage y TODAS las llamadas a `/api/` se responden aquí; cualquier otra petición a la API
 * se aborta (y la prueba falla si ocurre). No toca la base de datos ni el backend.
 *
 *   npx playwright test tests/cliente-pedidos.spec.ts --project=chromium
 */
test.use({ viewport: { width: 1280, height: 800 } });

const SUCURSALES = [
  { nombre: 'Cafetería Centro', direccion: 'Cra. 49 # 52-61, La Candelaria, Medellín' },
  { nombre: 'Cafetería Poblado', direccion: 'Cl. 10 # 36-20, El Poblado, Medellín' },
];

const haceMin = (m: number) => new Date(Date.now() - m * 60000).toISOString().slice(0, 19);

// [id, estado, total, hace cuántos minutos, índice de sucursal, código]
const PEDIDOS = (
  [
    [10488, 'LISTO', 18500, 6, 0, 'RET-7KQ2M9XA'],
    [10485, 'EN_PREPARACION', 12500, 14, 1, 'RET-P4WZ8LTC'],
    [10471, 'ENTREGADO', 22000, 60 * 26, 0, 'RET-M8TB6WJS'],
    [10470, 'PENDIENTE_PAGO', 13500, 60 * 30, 0, null],
    [10466, 'CANCELADO', 8000, 60 * 52, 1, 'RET-C7VK4NPU'],
  ] as const
).map(([pedidoId, estado, total, min, suc, codigoRetiro]) => ({
  pedidoId,
  clienteId: 1,
  codigoRetiro,
  fechaPedido: haceMin(min),
  fechaEntrega: null,
  estado,
  total,
  sucursalNombre: SUCURSALES[suc].nombre,
  sucursalDireccion: SUCURSALES[suc].direccion,
}));

const PERFIL = {
  id: 1,
  nombre: 'Valentina Restrepo',
  email: 'valentina@ejemplo.com',
  telefono: '3001234567',
  fechaRegistro: '2026-03-12T10:00:00',
  estado: 'ACTIVO',
};

interface Api {
  /** Cantidad de `GET /api/pedidos` recibidos. */
  pedidos: () => number;
  /** Peticiones a la API que la prueba no simula (se abortan). */
  noSimuladas: string[];
  /** Cambia lo que responde `GET /api/pedidos`. */
  responderPedidos: (respuesta: 'ok' | 'vacio' | 'error') => void;
}

/** Sesión de cliente simulada y API 100 % simulada. */
async function iniciarSesionSimulada(page: Page): Promise<Api> {
  await page.addInitScript(() => {
    localStorage.setItem('cafeteria_token', 'token-de-prueba');
    localStorage.setItem('cafeteria_email', 'valentina@ejemplo.com');
    localStorage.setItem('cafeteria_rol', 'CLIENTE');
  });

  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'GET,PUT,OPTIONS',
  };
  const api: Api = {
    pedidos: () => contador,
    noSimuladas: [],
    responderPedidos: (r) => (respuesta = r),
  };
  let contador = 0;
  let respuesta: 'ok' | 'vacio' | 'error' = 'ok';

  await page.route(/\/api\//, async (route) => {
    const peticion = route.request();
    if (peticion.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: cors });
      return;
    }
    const ruta = new URL(peticion.url()).pathname.replace(/^\/api/, '');
    const json = (status: number, cuerpo: unknown) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        headers: cors,
        body: JSON.stringify(cuerpo),
      });

    if (peticion.method() === 'GET' && ruta === '/pedidos') {
      contador++;
      if (respuesta === 'error') return json(500, { message: 'Error simulado' });
      return json(200, respuesta === 'vacio' ? [] : PEDIDOS);
    }
    if (peticion.method() === 'GET' && ruta === '/clientes/me') return json(200, PERFIL);
    if (peticion.method() === 'PUT' && ruta === '/clientes/me') {
      return json(200, { ...PERFIL, ...JSON.parse(peticion.postData() ?? '{}') });
    }
    // Destinos a los que lleva el estado vacío (la carta pide el menú y las sucursales).
    if (peticion.method() === 'GET' && (ruta === '/menu' || ruta === '/sucursales')) {
      return json(200, []);
    }
    api.noSimuladas.push(`${peticion.method()} ${ruta}`);
    await route.abort();
  });

  return api;
}

const contenido = (page: Page) => page.locator('#contenido');

test.describe('mis pedidos', () => {
  test('agrupa «En curso», «Pendientes de pago» y «Anteriores»', async ({ page }) => {
    const api = await iniciarSesionSimulada(page);
    await page.goto('/mis-pedidos');

    await expect(page.getByRole('heading', { level: 1, name: 'Mis pedidos' })).toBeVisible();
    const enCurso = contenido(page).getByRole('region', { name: 'En curso' });
    const pendientes = contenido(page).getByRole('region', { name: 'Pendientes de pago' });
    const anteriores = contenido(page).getByRole('region', { name: 'Anteriores' });

    await expect(enCurso.locator('app-tarjeta-pedido')).toHaveCount(2);
    await expect(enCurso).toContainText('Pedido #10488');
    await expect(enCurso).toContainText('Pedido #10485');
    await expect(pendientes.locator('app-tarjeta-pedido')).toHaveCount(1);
    await expect(pendientes).toContainText('Pedido #10470');
    await expect(anteriores.locator('app-tarjeta-pedido')).toHaveCount(2);
    await expect(anteriores).toContainText('Pedido #10471');
    await expect(anteriores).toContainText('Pedido #10466');
    expect(api.noSimuladas).toEqual([]);
  });

  test('los pedidos en curso llevan tiquete y seguimiento; los anteriores, solo el código en texto', async ({
    page,
  }) => {
    await iniciarSesionSimulada(page);
    await page.goto('/mis-pedidos');

    const enCurso = contenido(page).getByRole('region', { name: 'En curso' });
    await expect(enCurso.getByRole('group', { name: /^Código de retiro RET-/ })).toHaveCount(2);
    await expect(enCurso.getByRole('list', { name: 'Seguimiento del pedido' })).toHaveCount(2);

    // El paso actual de cada seguimiento lleva aria-current="step".
    const pasos = enCurso.locator('[aria-current="step"]');
    await expect(pasos).toHaveCount(2);
    await expect(pasos.nth(0)).toHaveText(/Listo para retirar/);
    await expect(pasos.nth(1)).toHaveText(/En preparación/);

    const anteriores = contenido(page).getByRole('region', { name: 'Anteriores' });
    await expect(anteriores.getByRole('group', { name: /Código de retiro/ })).toHaveCount(0);
    await expect(anteriores.getByRole('list', { name: 'Seguimiento del pedido' })).toHaveCount(0);
    await expect(anteriores).toContainText('RET-M8TB6WJS');
  });

  test('las píldoras usan etiquetas legibles y nunca el estado crudo', async ({ page }) => {
    await iniciarSesionSimulada(page);
    await page.goto('/mis-pedidos');

    const pildoras = contenido(page).locator('.estado-pill');
    await expect(pildoras).toHaveText([
      'Listo',
      'En preparación',
      'Pendiente de pago',
      'Entregado',
      'Cancelado',
    ]);
    await expect(contenido(page)).not.toContainText(
      /EN_PREPARACION|PENDIENTE_PAGO|\bENTREGADO\b|\bCANCELADO\b|\bLISTO\b/,
    );
  });

  test('«Actualizar» vuelve a pedir los pedidos y muestra la hora', async ({ page }) => {
    const api = await iniciarSesionSimulada(page);
    await page.goto('/mis-pedidos');
    await expect(contenido(page).getByRole('region', { name: 'En curso' })).toBeVisible();
    expect(api.pedidos()).toBe(1);
    await expect(page.getByRole('status').filter({ hasText: 'Actualizado a las' })).toBeVisible();

    await page.getByRole('button', { name: 'Actualizar' }).click();
    await expect.poll(() => api.pedidos()).toBe(2);
    await expect(page.getByRole('button', { name: 'Actualizar' })).toBeEnabled();
    await expect(contenido(page).getByRole('region', { name: 'En curso' })).toBeVisible();
  });

  test('sin pedidos, el estado vacío lleva a la carta (/menu)', async ({ page }) => {
    const api = await iniciarSesionSimulada(page);
    api.responderPedidos('vacio');
    await page.goto('/mis-pedidos');

    await expect(page.getByRole('heading', { name: 'Aún no tienes pedidos.' })).toBeVisible();
    const verCarta = contenido(page).getByRole('link', { name: 'Ver la carta' });
    await expect(verCarta).toHaveAttribute('href', '/menu');
    await verCarta.click();
    await expect(page).toHaveURL(/\/menu$/);
  });

  test('con la API en 500 aparece el error y «Reintentar» vuelve a cargar', async ({ page }) => {
    const api = await iniciarSesionSimulada(page);
    api.responderPedidos('error');
    await page.goto('/mis-pedidos');

    await expect(
      page.getByRole('alert').filter({ hasText: 'No pudimos cargar tus pedidos' }),
    ).toBeVisible();
    await expect(contenido(page).getByRole('region', { name: 'En curso' })).toHaveCount(0);
    expect(api.pedidos()).toBe(1);

    api.responderPedidos('ok');
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(contenido(page).getByRole('region', { name: 'En curso' })).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'No pudimos cargar' })).toHaveCount(0);
    expect(api.pedidos()).toBe(2);
  });
});

test.describe('mi cuenta (perfil)', () => {
  test('un solo título «Mi cuenta», sin chip de estado y con los tres pedidos más recientes', async ({
    page,
  }) => {
    await iniciarSesionSimulada(page);
    await page.goto('/perfil');

    await expect(page).toHaveTitle('Mi cuenta | La aravica');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mi cuenta');
    await expect(contenido(page)).not.toContainText(/Mi Perfil|Hola de nuevo|Bienvenido/);
    await expect(contenido(page).getByText('ACTIVO')).toHaveCount(0);
    await expect(contenido(page).getByText('Valentina Restrepo')).toBeVisible();

    const recientes = contenido(page).getByRole('region', { name: 'Pedidos recientes' });
    await expect(recientes.locator('app-tarjeta-pedido')).toHaveCount(3);
    await expect(recientes).toContainText('Pedido #10488');
    await expect(recientes).toContainText('Pedido #10471');
    await expect(recientes).not.toContainText('Pedido #10470');
    await expect(recientes.locator('.estado-pill').first()).toHaveText('Listo');
    await expect(recientes.getByRole('link', { name: 'Ver todos mis pedidos' })).toHaveAttribute(
      'href',
      '/mis-pedidos',
    );
    // Texto vigente de la franja de Granos (decisión D4 pendiente).
    await expect(contenido(page).getByText(/Gana\s+Granos con cada pedido/)).toBeVisible();
  });

  test('en escritorio, los datos y los pedidos recientes van en dos columnas', async ({ page }) => {
    await iniciarSesionSimulada(page);
    await page.goto('/perfil');

    const datos = (await contenido(page)
      .getByRole('region', { name: 'Datos personales' })
      .boundingBox())!;
    const recientes = (await contenido(page)
      .getByRole('region', { name: 'Pedidos recientes' })
      .boundingBox())!;
    expect(recientes.x).toBeGreaterThan(datos.x + datos.width - 1);
    expect(Math.abs(recientes.y - datos.y)).toBeLessThan(2);
  });

  test('en móvil se apilan datos, pedidos recientes y la franja de Granos', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await iniciarSesionSimulada(page);
    await page.goto('/perfil');

    const datos = (await contenido(page)
      .getByRole('region', { name: 'Datos personales' })
      .boundingBox())!;
    const recientes = (await contenido(page)
      .getByRole('region', { name: 'Pedidos recientes' })
      .boundingBox())!;
    const granos = (await contenido(page).locator('.rewards-perfil').boundingBox())!;
    expect(recientes.y).toBeGreaterThanOrEqual(datos.y + datos.height - 1);
    expect(granos.y).toBeGreaterThanOrEqual(recientes.y + recientes.height - 1);
  });

  test('«Editar» lleva el foco al nombre; guardar y cancelar lo devuelven a «Editar»', async ({
    page,
  }) => {
    await iniciarSesionSimulada(page);
    await page.goto('/perfil');

    await page.getByRole('button', { name: 'Editar' }).click();
    await expect(page.getByLabel('Nombre')).toBeFocused();
    await expect(page.getByLabel('Correo electrónico')).toBeDisabled();

    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.getByRole('button', { name: 'Editar' })).toBeFocused();

    await page.getByRole('button', { name: 'Editar' }).click();
    await page.getByLabel('Nombre').fill('Valentina R. Gómez');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByRole('button', { name: 'Editar' })).toBeFocused();
    const exito = page
      .getByRole('status')
      .filter({ hasText: 'Tus datos se actualizaron correctamente.' });
    await expect(exito).toBeVisible();
    await expect(contenido(page).getByText('Valentina R. Gómez')).toBeVisible();
  });

  test('un teléfono inválido se anuncia con role="alert" y no sale el formulario', async ({
    page,
  }) => {
    await iniciarSesionSimulada(page);
    await page.goto('/perfil');

    await page.getByRole('button', { name: 'Editar' }).click();
    await page.getByLabel('Teléfono').fill('123');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByRole('alert')).toHaveText(
      'El teléfono debe tener exactamente 10 dígitos.',
    );
    await expect(page.getByLabel('Teléfono')).toBeVisible();
  });
});

test.describe('responsive: sin desborde horizontal en 390 px', () => {
  for (const ruta of ['/mis-pedidos', '/perfil']) {
    test(`${ruta} cabe en 390 px`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      const api = await iniciarSesionSimulada(page);
      await page.goto(ruta);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(contenido(page).locator('.estado-pill').first()).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(390);
      expect(api.noSimuladas).toEqual([]);
    });
  }
});
