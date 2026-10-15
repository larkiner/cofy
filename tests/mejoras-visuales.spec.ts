import { expect, type Page, test } from '@playwright/test';

/**
 * Mejoras visuales: header, carta con barra lateral y "Sucursales".
 *
 * Corre contra el `ng serve` (http://localhost:4200). La API se simula aquí
 * (`/api/menu` y `/api/sucursales`), así que no necesita backend ni depende de
 * los datos de la base: funciona igual en local y en CI (donde no hay backend).
 *
 *   npx playwright test tests/mejoras-visuales.spec.ts --project=chromium
 *
 * No correr la suite completa en local: `seed.spec.ts` crea cientos de cuentas en la base de datos.
 */
test.use({ viewport: { width: 1280, height: 800 } });

const MENU = [
  ['Bebidas Calientes', 1, 'Americano', 5000, 'Espresso con agua caliente'],
  ['Bebidas Calientes', 1, 'Cappuccino', 7500, 'Espresso con leche vaporizada y espuma'],
  ['Bebidas Calientes', 1, 'Latte', 8000, 'Espresso con leche cremosa'],
  ['Bebidas Calientes', 1, 'Chocolate Caliente', 7000, 'Chocolate de origen derretido en leche'],
  ['Bebidas Calientes', 1, 'Espresso', 4500, 'Doble shot de café de origen, intenso y aromático'],
  ['Bebidas Especiales', 5, 'Latte de Vainilla', 9000, 'Con jarabe de vainilla natural'],
  ['Bebidas Frías', 2, 'Café Helado', 8500, 'Café frío con hielo y crema'],
  ['Panadería', 4, 'Pan de Bono', 3500, 'Tradicional, recién horneado'],
  ['Postres', 3, 'Brownie con Helado', 12000, 'Brownie de chocolate con helado de vainilla'],
].map(([categoria, categoriaId, nombre, precio, descripcion], i) => ({
  productoId: i + 1,
  nombre,
  descripcion,
  precio,
  imagenUrl: null,
  categoriaId,
  categoria,
}));

const SUCURSALES = [
  {
    id: 1,
    nombre: 'Cafetería Centro',
    direccion: 'Calle 10 # 5-23, Centro',
    telefono: '6012345678',
  },
  {
    id: 2,
    nombre: 'Cafetería Norte',
    direccion: 'Carrera 15 # 85-40, Zona Norte',
    telefono: '6018765432',
  },
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
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: cors,
      body: JSON.stringify(cuerpo),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await simularApi(page);
});

test.describe('header', () => {
  test('muestra la navegación principal y los botones de tema, carrito y cuenta', async ({
    page,
  }) => {
    await page.goto('/');

    const navegacion = page.getByRole('navigation', { name: 'Navegación principal' });
    await expect(navegacion.getByRole('link', { name: 'Carta' })).toBeVisible();
    await expect(navegacion.getByRole('link', { name: 'Sucursales' })).toBeVisible();

    await expect(page.getByRole('button', { name: /^Cambiar a modo/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /^Ver el carrito/ })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cuenta' })).toBeVisible();
  });

  test('en /menu el enlace "Carta" queda marcado como página actual', async ({ page }) => {
    await page.goto('/menu');

    const navegacion = page.getByRole('navigation', { name: 'Navegación principal' });
    await expect(navegacion.getByRole('link', { name: 'Carta' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await expect(navegacion.getByRole('link', { name: 'Sucursales' })).not.toHaveAttribute(
      'aria-current',
      /.*/,
    );
  });

  test('"Carta" conserva aria-current="page" al navegar dentro de la misma ruta activa', async ({
    page,
  }) => {
    await page.goto('/menu');

    const carta = page
      .getByRole('navigation', { name: 'Navegación principal' })
      .getByRole('link', { name: 'Carta' });
    await expect(carta).toHaveAttribute('aria-current', 'page');

    // Navegación del router (sin recarga): /menu -> /menu?x=1. La marca sobrevive solo si no hubo recarga.
    await page.evaluate(() => {
      (window as unknown as { __sinRecarga: boolean }).__sinRecarga = true;
      history.pushState({}, '', '/menu?x=1');
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    });

    await expect(page).toHaveURL(/\/menu\?x=1$/);
    expect(
      await page.evaluate(() => (window as unknown as { __sinRecarga?: boolean }).__sinRecarga),
    ).toBe(true);
    await expect(carta).toHaveAttribute('aria-current', 'page');
  });

  test('"Saltar al contenido" es lo primero que enfoca Tab y lleva el foco a <main>', async ({
    page,
  }) => {
    await page.goto('/menu');

    const salto = page.getByRole('link', { name: 'Saltar al contenido' });
    // Oculto fuera de pantalla mientras no tiene el foco.
    expect((await salto.boundingBox())!.x).toBeLessThan(0);

    await page.keyboard.press('Tab');
    await expect(salto).toBeFocused();
    expect((await salto.boundingBox())!.x).toBeGreaterThanOrEqual(0);

    await page.keyboard.press('Enter');
    await expect(page.locator('main#contenido')).toBeFocused();
    // No navega: sigue en la carta.
    await expect(page).toHaveURL(/\/menu$/);
  });

  test('el contenido de la página va dentro de <main>', async ({ page }) => {
    await page.goto('/menu');
    await expect(page.locator('main#contenido app-menu')).toHaveCount(1);
    await expect(page.locator('main')).toHaveCount(1);
  });

  test('el pie usa el mismo vocabulario que la barra y sus enlaces miden 44 px o más', async ({
    page,
  }) => {
    await page.goto('/');
    const pie = page.locator('footer.pie');
    for (const nombre of ['Inicio', 'Carta', 'Sucursales', 'Crear cuenta']) {
      const enlace = pie.getByRole('link', { name: nombre, exact: true });
      await expect(enlace).toBeVisible();
      expect((await enlace.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test('el panel de cuenta se abre, se cierra con Escape y con un clic fuera', async ({ page }) => {
    await page.goto('/menu');

    const botonCuenta = page.getByRole('button', { name: 'Cuenta' });
    const panel = page.locator('#panel-cuenta');

    await expect(botonCuenta).toHaveAttribute('aria-expanded', 'false');
    await expect(panel).toHaveCount(0);

    // Abre el panel: ofrece iniciar sesión o unirse.
    await botonCuenta.click();
    await expect(botonCuenta).toHaveAttribute('aria-expanded', 'true');
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Crear cuenta' })).toBeVisible();

    // Escape lo cierra y el foco vuelve al botón.
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(botonCuenta).toHaveAttribute('aria-expanded', 'false');
    await expect(botonCuenta).toBeFocused();

    // Al reabrir, un clic fuera (el título de la página) lo cierra.
    await botonCuenta.click();
    await expect(panel).toBeVisible();
    await page.getByRole('heading', { level: 1, name: 'Carta' }).click();
    await expect(panel).toHaveCount(0);
    await expect(botonCuenta).toHaveAttribute('aria-expanded', 'false');
  });

  test('el panel de cuenta se cierra al navegar con atrás o con un enlace activado por teclado', async ({
    page,
  }) => {
    await page.goto('/');
    const navegacion = page.getByRole('navigation', { name: 'Navegación principal' });
    await navegacion.getByRole('link', { name: 'Carta' }).click();
    await expect(page).toHaveURL(/\/menu$/);

    const botonCuenta = page.getByRole('button', { name: 'Cuenta' });
    const panel = page.locator('#panel-cuenta');

    // Atrás del navegador.
    await botonCuenta.click();
    await expect(panel).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(panel).toHaveCount(0);
    await expect(botonCuenta).toHaveAttribute('aria-expanded', 'false');

    // Enlace activado con el teclado: no hay evento de puntero fuera del panel.
    await botonCuenta.click();
    await expect(panel).toBeVisible();
    await navegacion.getByRole('link', { name: 'Carta' }).focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/menu$/);
    await expect(panel).toHaveCount(0);
    await expect(botonCuenta).toHaveAttribute('aria-expanded', 'false');
  });

  test('"Sucursales" lleva a #horario y el título no queda tapado por el header', async ({
    page,
  }) => {
    await page.goto('/menu');

    const encabezado = page.locator('header.encabezado');
    await expect(encabezado).toBeVisible();

    await page
      .getByRole('navigation', { name: 'Navegación principal' })
      .getByRole('link', { name: 'Sucursales' })
      .click();

    await expect(page).toHaveURL(/\/#horario$/);

    const titulo = page.getByRole('heading', { level: 2, name: 'Sucursales', exact: true });
    await expect(titulo).toBeVisible();

    // Espera a que el scroll a la ancla se asiente y compara con el alto real del header.
    await expect
      .poll(
        async () => {
          const [cajaTitulo, cajaHeader] = await Promise.all([
            titulo.boundingBox(),
            encabezado.boundingBox(),
          ]);
          if (!cajaTitulo || !cajaHeader) return false;
          const debajoDelHeader = cajaTitulo.y >= cajaHeader.height;
          const dentroDelViewport = cajaTitulo.y + cajaTitulo.height <= 800;
          return debajoDelHeader && dentroDelViewport;
        },
        {
          message: 'el h2 "Sucursales" debe verse completo y por debajo del header',
          timeout: 10_000,
        },
      )
      .toBe(true);
  });
});

test.describe('carta', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/menu');
    // Espera a que el menú cargue: el índice pasa a tener botones.
    await expect(
      page.getByRole('navigation', { name: 'Categorías' }).getByRole('button').first(),
    ).toBeVisible();
  });

  test('tiene título, buscador e índice de categorías con la primera activa', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1, name: 'Carta' })).toBeVisible();
    await expect(page.getByLabel('Buscar en la carta')).toBeVisible();

    const botones = page.getByRole('navigation', { name: 'Categorías' }).getByRole('button');
    expect(await botones.count()).toBeGreaterThan(1);
    await expect(botones.first()).toHaveAttribute('aria-current', 'true');
  });

  test('buscar "latte" muestra resultados de varias categorías y desactiva el índice', async ({
    page,
  }) => {
    await page.getByLabel('Buscar en la carta').fill('latte');

    const gruposDeResultados = page.locator('.carta-contenido').getByRole('heading', { level: 2 });
    await expect(gruposDeResultados.nth(1)).toBeVisible();
    expect(await gruposDeResultados.count()).toBeGreaterThan(1);

    // Mientras se busca, ninguna categoría queda resaltada.
    await expect(
      page.getByRole('navigation', { name: 'Categorías' }).locator('[aria-current]'),
    ).toHaveCount(0);
  });

  test('la búsqueda ignora las tildes: "cafe" encuentra "Café Helado"', async ({ page }) => {
    await page.getByLabel('Buscar en la carta').fill('cafe');

    await expect(page.getByRole('heading', { level: 3, name: 'Café Helado' })).toBeVisible();
  });

  test('sin coincidencias muestra el aviso y "Borrar búsqueda" restaura la vista', async ({
    page,
  }) => {
    const buscador = page.getByLabel('Buscar en la carta');
    await buscador.fill('zzz');

    await expect(page.getByText('No hay productos que coincidan')).toBeVisible();

    await page.getByRole('button', { name: 'Borrar búsqueda' }).click();

    await expect(page.getByText('No hay productos que coincidan')).toHaveCount(0);
    await expect(buscador).toHaveValue('');
    // Vuelve la categoría activa (la primera) con sus productos.
    await expect(page.getByRole('heading', { level: 3, name: 'Americano' })).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Categorías' }).getByRole('button').first(),
    ).toHaveAttribute('aria-current', 'true');
  });

  test('elegir "Postres" muestra solo tarjetas de postres y lo marca como activo', async ({
    page,
  }) => {
    const indice = page.getByRole('navigation', { name: 'Categorías' });
    const postres = indice.getByRole('button', { name: 'Postres', exact: true });

    await postres.click();

    await expect(postres).toHaveAttribute('aria-current', 'true');
    await expect(indice.locator('[aria-current]')).toHaveCount(1);

    const contenido = page.locator('.carta-contenido');
    await expect(contenido.getByRole('heading', { level: 2, name: 'Postres' })).toBeVisible();
    await expect(
      contenido.getByRole('heading', { level: 3, name: 'Brownie con Helado' }),
    ).toBeVisible();
    await expect(contenido.getByRole('heading', { level: 3, name: 'Americano' })).toHaveCount(0);
  });
});

test.describe('sucursales y horario', () => {
  test('muestra las sucursales reales, "Cómo llegar" a Google Maps y las 3 filas de horario', async ({
    page,
  }) => {
    await page.goto('/');

    const seccion = page.locator('#horario');
    await seccion.scrollIntoViewIfNeeded();
    await expect(
      seccion.getByRole('heading', { level: 2, name: 'Sucursales', exact: true }),
    ).toBeVisible();

    // Las sucursales llegan de la API: el grid aparece cuando responde.
    const sucursales = seccion.getByRole('article');
    await expect(sucursales).toHaveCount(2);
    await expect(
      seccion.getByRole('heading', { level: 3, name: 'Cafetería Centro' }),
    ).toBeVisible();
    await expect(seccion.getByRole('heading', { level: 3, name: 'Cafetería Norte' })).toBeVisible();

    const comoLlegar = seccion.getByRole('link', { name: /Cómo llegar/ });
    await expect(comoLlegar).toHaveCount(2);
    for (let i = 0; i < 2; i++) {
      await expect(comoLlegar.nth(i)).toHaveAttribute('href', /google\.com\/maps/);
      await expect(comoLlegar.nth(i)).toHaveAttribute('target', '_blank');
      expect((await comoLlegar.nth(i).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    // El teléfono también es un objetivo táctil de 44 px.
    const telefono = seccion.locator('.sucursal-telefono').first();
    expect((await telefono.boundingBox())!.height).toBeGreaterThanOrEqual(44);

    // Horario fijo.
    await expect(seccion.locator('.horario-fila')).toHaveCount(3);
    await expect(seccion.getByText('Lunes – viernes')).toBeVisible();
    await expect(seccion.getByText('Sábados')).toBeVisible();
    await expect(seccion.getByText('Domingos')).toBeVisible();
  });
});

test.describe('móvil (360x740)', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('una búsqueda larga sin espacios no desborda la página horizontalmente', async ({
    page,
  }) => {
    await page.goto('/menu');
    await expect(
      page.getByRole('navigation', { name: 'Categorías' }).getByRole('button').first(),
    ).toBeVisible();

    const palabra = 'abcdefghij'.repeat(6);
    const buscador = page.getByLabel('Buscar en la carta');
    await buscador.fill(palabra);

    await expect(page.getByText('No hay productos que coincidan')).toBeVisible();

    const anchoDelDocumento = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(anchoDelDocumento).toBeLessThanOrEqual(360);

    const cajaBuscador = await page.locator('.buscador').boundingBox();
    expect(cajaBuscador).not.toBeNull();
    expect(cajaBuscador!.x + cajaBuscador!.width).toBeLessThanOrEqual(360);
  });
});

test.describe('carta en móvil (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('muestra al menos cuatro productos en filas compactas en la primera pantalla', async ({
    page,
  }) => {
    await page.goto('/menu');
    const tarjetas = page.locator('.tarjeta');
    await expect(tarjetas.first()).toBeVisible();

    const visibles = await tarjetas.evaluateAll(
      (nodos) => nodos.filter((n) => n.getBoundingClientRect().bottom <= window.innerHeight).length,
    );
    expect(visibles).toBeGreaterThanOrEqual(4);

    // Fila compacta: la miniatura mide 96 px y queda a la izquierda del nombre.
    const media = await tarjetas.first().locator('.tarjeta-media').boundingBox();
    const nombre = await tarjetas.first().getByRole('heading', { level: 3 }).boundingBox();
    // Tolerancia de subpíxel: la rejilla puede dar 95,99997 px.
    expect(media!.width).toBeCloseTo(96, 0);
    expect(media!.height).toBeCloseTo(96, 0);
    expect(nombre!.x).toBeGreaterThanOrEqual(media!.x + media!.width);
  });

  test('el índice de categorías sigue visible bajo el header tras hacer scroll', async ({
    page,
  }) => {
    await page.goto('/menu');
    const indice = page.getByRole('navigation', { name: 'Categorías' });
    await expect(indice.getByRole('button').first()).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, 400));
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);

    const encabezado = await page.locator('header.encabezado').boundingBox();
    const caja = await indice.boundingBox();
    expect(caja).not.toBeNull();
    expect(caja!.y).toBeGreaterThanOrEqual(encabezado!.y + encabezado!.height - 1);
    expect(caja!.y).toBeLessThan(encabezado!.y + encabezado!.height + 4);
    await expect(indice.getByRole('button').first()).toBeVisible();
  });

  test('elegir una categoría con la página desplazada vuelve al inicio del contenido', async ({
    page,
  }) => {
    await page.goto('/menu');
    const indice = page.getByRole('navigation', { name: 'Categorías' });
    await expect(indice.getByRole('button').first()).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, 400));
    await indice.getByRole('button', { name: 'Postres', exact: true }).click();

    const titulo = page.locator('.carta-contenido').getByRole('heading', { level: 2 });
    await expect(titulo).toHaveText('Postres');
    await expect
      .poll(async () => {
        const t = await titulo.boundingBox();
        const i = await indice.boundingBox();
        return t!.y >= i!.y + i!.height - 1;
      })
      .toBe(true);
  });

  test('"Agregar" mide al menos 44 px de alto y no hay desborde horizontal', async ({ page }) => {
    await page.goto('/menu');
    const botones = page.locator('.tarjeta .agregar');
    await expect(botones.first()).toBeVisible();

    for (const boton of await botones.all()) {
      const caja = await boton.boundingBox();
      // 43,99997 px por redondeo de subpíxel cuenta como 44.
      expect(caja!.height).toBeGreaterThanOrEqual(43.9);
      expect(caja!.width).toBeGreaterThanOrEqual(43.9);
    }
    const ancho = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(ancho).toBeLessThanOrEqual(390);
  });

  test('si la carta falla, «Reintentar» la vuelve a cargar', async ({ page }) => {
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };
    let intentos = 0;
    await page.route(/\/api\/menu(\?.*)?$/, async (route) => {
      if (route.request().method() === 'GET' && ++intentos === 1) {
        await route.fulfill({ status: 500, headers: cors, body: 'error' });
        return;
      }
      await route.fallback();
    });

    await page.goto('/menu');
    const alerta = page.getByRole('alert');
    await expect(alerta).toContainText('No pudimos cargar la carta');
    await expect(page.locator('.tarjeta')).toHaveCount(0);

    await page.getByRole('button', { name: 'Reintentar' }).click();

    await expect(page.getByRole('heading', { level: 3, name: 'Americano' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reintentar' })).toHaveCount(0);
    expect(intentos).toBe(2);
  });
});

test.describe('móvil (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('el header solo muestra la marca, el carrito y el botón del menú, sin barra inferior', async ({
    page,
  }) => {
    await page.goto('/');

    const encabezado = page.locator('header.encabezado');
    await expect(encabezado.getByRole('link', { name: 'La aravica' })).toBeVisible();
    await expect(encabezado.getByRole('link', { name: /^Ver el carrito/ })).toBeVisible();
    await expect(encabezado.getByRole('button', { name: 'Menú' })).toBeVisible();

    // Lo demás baja al menú desplegable.
    await expect(encabezado.getByRole('navigation', { name: 'Navegación principal' })).toBeHidden();
    await expect(encabezado.getByRole('button', { name: /^Cambiar a modo/ })).toBeHidden();
    await expect(encabezado.getByRole('button', { name: 'Cuenta' })).toBeHidden();

    await expect(page.locator('.nav-inferior')).toHaveCount(0);
  });

  test('el menú se abre con navegación, tema y cuenta, y ocupa el ancho de la pantalla', async ({
    page,
  }) => {
    await page.goto('/');

    const boton = page.getByRole('button', { name: 'Menú' });
    const menu = page.locator('#menu-movil');
    await expect(boton).toHaveAttribute('aria-expanded', 'false');
    await expect(menu).toHaveCount(0);

    await boton.click();
    await expect(boton).toHaveAttribute('aria-expanded', 'true');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Carta' })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Sucursales' })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Crear cuenta' })).toBeVisible();
    await expect(menu.getByRole('button', { name: /modo (oscuro|claro)/i })).toBeVisible();

    const caja = await menu.boundingBox();
    expect(caja).not.toBeNull();
    expect(caja!.width).toBeGreaterThanOrEqual(300);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
  });

  test('todos los controles del menú miden 44 px o más (sin sesión)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Menú' }).click();
    await expect(page.locator('#menu-movil')).toBeVisible();
    const controles = page.locator('#menu-movil').locator('a, button');
    expect(await controles.count()).toBeGreaterThanOrEqual(5);
    for (const control of await controles.all()) {
      // Tolerancia de 0,1 px: durante la animación de entrada el alto llega con redondeo (43,9999).
      expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(43.9);
    }
  });

  test('con sesión de cliente, "Mi cuenta" y "Cerrar sesión" miden 44 px y el rol sale legible', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem('cafeteria_token', 'token-de-prueba');
      localStorage.setItem('cafeteria_email', 'ana@correo.com');
      localStorage.setItem('cafeteria_rol', 'CLIENTE');
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'Menú' }).click();

    const menu = page.locator('#menu-movil');
    await expect(menu.locator('.panel-cuenta-rol')).toHaveText('Cliente');
    const cuenta = menu.getByRole('link', { name: 'Mi cuenta' });
    const salir = menu.getByRole('button', { name: 'Cerrar sesión' });
    for (const control of [cuenta, salir]) {
      await expect(control).toBeVisible();
      // Tolerancia de 0,1 px: durante la animación de entrada el alto llega con redondeo (43,9999).
      expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(43.9);
    }
  });

  test('el menú se cierra con Escape (devolviendo el foco), con un toque fuera y al navegar', async ({
    page,
  }) => {
    await page.goto('/');
    const boton = page.getByRole('button', { name: 'Menú' });
    const menu = page.locator('#menu-movil');

    await boton.click();
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(boton).toBeFocused();

    await boton.click();
    await expect(menu).toBeVisible();
    // Toque en la parte baja de la pantalla, fuera del header y del panel.
    await page.mouse.click(195, 830);
    await expect(menu).toHaveCount(0);

    await boton.click();
    await menu.getByRole('link', { name: 'Carta' }).click();
    await expect(page).toHaveURL(/\/menu$/);
    await expect(menu).toHaveCount(0);
    await expect(boton).toHaveAttribute('aria-expanded', 'false');
  });

  test('desde el menú se puede cambiar el tema', async ({ page }) => {
    await page.goto('/');
    const oscuroAntes = await page.evaluate(() =>
      document.documentElement.classList.contains('dark'),
    );

    await page.getByRole('button', { name: 'Menú' }).click();
    await page
      .locator('#menu-movil')
      .getByRole('button', { name: /modo (oscuro|claro)/i })
      .click();

    await expect
      .poll(() => page.evaluate(() => document.documentElement.classList.contains('dark')))
      .toBe(!oscuroAntes);
  });
});

test.describe('escritorio: el menú móvil no se ve', () => {
  test('sin botón de menú y con la navegación a la vista en el header', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Menú' })).toBeHidden();
    await expect(
      page
        .getByRole('navigation', { name: 'Navegación principal' })
        .getByRole('link', { name: 'Carta' }),
    ).toBeVisible();
  });
});
