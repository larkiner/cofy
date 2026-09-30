import { expect, test } from '@playwright/test';

/**
 * Mejoras visuales: header, carta con barra lateral y "Sucursales y horario".
 *
 * Corre contra el `ng serve` (http://localhost:4200) y la API de desarrollo
 * (http://localhost:8080). Solo lee: no crea cuentas ni pedidos.
 *
 *   npx playwright test tests/mejoras-visuales.spec.ts --project=chromium
 *
 * No correr la suite completa: `seed.spec.ts` crea cientos de cuentas en la base de datos.
 */
test.use({ viewport: { width: 1280, height: 800 } });

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
    await expect(panel.getByRole('link', { name: 'Unirme a la Hermandad' })).toBeVisible();

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

    const titulo = page.getByRole('heading', { level: 2, name: 'Sucursales y horario' });
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
          message: 'el h2 "Sucursales y horario" debe verse completo y por debajo del header',
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
      seccion.getByRole('heading', { level: 2, name: 'Sucursales y horario' }),
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
    }

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

test.describe('móvil (390x844)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('la navegación queda en el header, sin barra inferior', async ({ page }) => {
    await page.goto('/');

    const navegacion = page
      .locator('header.encabezado')
      .getByRole('navigation', { name: 'Navegación principal' });
    await expect(navegacion).toBeVisible();
    await expect(navegacion.getByRole('link', { name: 'Carta' })).toBeVisible();
    await expect(navegacion.getByRole('link', { name: 'Sucursales' })).toBeVisible();

    await expect(page.locator('.nav-inferior')).toHaveCount(0);
  });

  test('el panel de cuenta ocupa el ancho de la pantalla', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Cuenta' }).click();

    const panel = page.locator('#panel-cuenta');
    await expect(panel).toBeVisible();
    await expect(panel.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();

    const caja = await panel.boundingBox();
    expect(caja).not.toBeNull();
    expect(caja!.width).toBeGreaterThanOrEqual(300);
  });
});
